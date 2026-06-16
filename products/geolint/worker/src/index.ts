import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Stripe from 'stripe'
const randomUUID = () => crypto.randomUUID()

export interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: ['https://app.basemapped.com', 'https://basemapped.com', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'healthy', service: 'geolint-worker' }))

// Basic GeoJSON validation
function validateGeoJSON(geojson: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!geojson || typeof geojson !== 'object') {
    errors.push('GeoJSON must be an object')
    return { valid: false, errors, warnings }
  }

  if (!geojson.type) {
    errors.push('Missing "type" property')
  }

  const validTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection', 'Feature', 'FeatureCollection']
  if (geojson.type && !validTypes.includes(geojson.type)) {
    errors.push(`Invalid type: "${geojson.type}"`)
  }

  if (geojson.type === 'FeatureCollection') {
    if (!Array.isArray(geojson.features)) {
      errors.push('FeatureCollection must have a "features" array')
    } else {
      geojson.features.forEach((f: any, i: number) => {
        if (f.type !== 'Feature') errors.push(`features[${i}]: must be a Feature`)
        if (!f.geometry) errors.push(`features[${i}]: missing "geometry"`)
      })
    }
  }

  if (geojson.type === 'Feature' && !geojson.geometry) {
    errors.push('Feature must have a "geometry" property')
  }

  if (!geojson.bbox) warnings.push('GeoJSON does not include a bbox property')

  return { valid: errors.length === 0, errors, warnings }
}

function generateIssues(geojson: any): any[] {
  const issues: any[] = []
  if (!geojson) return issues

  const features = geojson.type === 'FeatureCollection' ? geojson.features : geojson.type === 'Feature' ? [geojson] : []
  features.forEach((f: any, i: number) => {
    if (!f.geometry || !f.geometry.type) {
      issues.push({
        feature_id: f.id || `f${i}`,
        issue_type: 'missing_geometry',
        message: 'Feature is missing geometry',
        severity: 'high',
        coordinates: undefined,
        suggested_fix: 'Add a valid geometry object',
      })
      return
    }

    const coords = f.geometry.coordinates
    if (!coords || (Array.isArray(coords) && coords.length === 0)) {
      issues.push({
        feature_id: f.id || `f${i}`,
        issue_type: 'empty_geometry',
        message: 'Geometry has no coordinates',
        severity: 'high',
        coordinates: undefined,
        suggested_fix: 'Add coordinates to the geometry',
      })
    }

    if (!f.properties || Object.keys(f.properties).length === 0) {
      issues.push({
        feature_id: f.id || `f${i}`,
        issue_type: 'missing_attributes',
        message: 'Feature has no properties',
        severity: 'medium',
        coordinates: undefined,
        suggested_fix: 'Add attribute fields',
      })
    }
  })

  return issues
}

app.post('/api/v1/datasets', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File
  const projectId = (body.project_id as string) || 'default'

  if (!file) {
    return c.json({ detail: 'No file provided' }, 400)
  }

  const content = await file.text()
  let geojson: any
  try {
    geojson = JSON.parse(content)
  } catch {
    return c.json({ detail: 'Invalid JSON file' }, 400)
  }

  const validation = validateGeoJSON(geojson)
  const issues = generateIssues(geojson)

  const datasetId = randomUUID()
  const validationId = randomUUID()

  const score = validation.valid ? Math.max(0, 100 - issues.length * 5) : 0
  let grade = 'F'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'

  const status = validation.valid ? 'completed' : 'failed'

  await c.env.DB.prepare(`
    INSERT INTO datasets (id, name, format, size_bytes, content, status, score, grade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(datasetId, file.name, 'geojson', file.size, content, status, score, grade).run()

  await c.env.DB.prepare(`
    INSERT INTO validations (id, dataset_id, rule_set, status, score, grade, issues_count, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(validationId, datasetId, 'standard', status, score, grade, issues.length, new Date().toISOString()).run()

  for (const issue of issues) {
    await c.env.DB.prepare(`
      INSERT INTO issues (id, validation_id, feature_id, issue_type, message, severity, coordinates, suggested_fix)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      randomUUID(),
      validationId,
      issue.feature_id,
      issue.issue_type,
      issue.message,
      issue.severity,
      issue.coordinates ? JSON.stringify(issue.coordinates) : null,
      issue.suggested_fix
    ).run()
  }

  return c.json({
    id: datasetId,
    validation_id: validationId,
    status,
    score,
    grade,
    issues_count: issues.length,
    message: validation.valid ? 'Validation complete' : 'Validation failed',
  }, 201)
})

app.get('/api/v1/validations', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT v.*, d.name as dataset_name
    FROM validations v
    JOIN datasets d ON v.dataset_id = d.id
    ORDER BY v.created_at DESC
    LIMIT 50
  `).all()

  return c.json({ items: results || [] })
})

app.get('/api/v1/validations/:id', async (c) => {
  const id = c.req.param('id')

  const validation = await c.env.DB.prepare(`
    SELECT v.*, d.name as dataset_name, d.content as dataset_content
    FROM validations v
    JOIN datasets d ON v.dataset_id = d.id
    WHERE v.id = ?
  `).bind(id).first()

  if (!validation) {
    return c.json({ detail: 'Validation not found' }, 404)
  }

  const issues = await c.env.DB.prepare(`
    SELECT * FROM issues WHERE validation_id = ?
  `).bind(id).all()

  return c.json({
    ...validation,
    issues: issues.results || [],
  })
})

app.post('/api/v1/stripe/checkout', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  const body = await c.req.json()
  const email = body.email

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: c.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${c.env.FRONTEND_URL}/team?success=1`,
    cancel_url: `${c.env.FRONTEND_URL}/team?canceled=1`,
    customer_email: email,
    metadata: { product: 'geolint' },
  })

  return c.json({ url: session.url })
})

app.post('/api/v1/stripe/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  const signature = c.req.header('stripe-signature')
  const body = await c.req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature || '', c.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return c.json({ detail: err.message }, 400)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_email || session.customer_details?.email
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (email && customerId) {
      await c.env.DB.prepare(`
        INSERT INTO subscriptions (id, customer_id, email, product, status, price_id, subscription_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        randomUUID(),
        customerId,
        email,
        session.metadata?.product || 'geolint',
        'active',
        session.line_items?.data[0]?.price?.id || c.env.STRIPE_PRICE_ID,
        session.subscription?.toString() || null
      ).run()
    }
  }

  return c.json({ received: true })
})

app.get('/api/v1/subscription/:email', async (c) => {
  const email = c.req.param('email')
  const sub = await c.env.DB.prepare(`
    SELECT * FROM subscriptions WHERE email = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1
  `).bind(email).first()

  return c.json({ active: !!sub, subscription: sub })
})

export default app
