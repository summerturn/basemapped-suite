import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Stripe from 'stripe'

export interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  FRONTEND_URL: string
}

const randomUUID = () => crypto.randomUUID()
const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: ['https://app.basemapped.com', 'https://basemapped.com', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'healthy', service: 'aquamap-worker' }))

// Generic CRUD helper
function crudRoutes(app: Hono<{ Bindings: Env }>, path: string, table: string, fields: string[]) {
  app.get(`/api/v1/${path}`, async (c) => {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`).all()
    return c.json({ items: results || [] })
  })

  app.post(`/api/v1/${path}`, async (c) => {
    const body = await c.req.json()
    const id = randomUUID()
    const columns = ['id', ...fields, 'created_at']
    const values = [id, ...fields.map((f) => body[f] ?? ''), new Date().toISOString()]
    const placeholders = values.map(() => '?').join(', ')
    await c.env.DB.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).bind(...values).run()
    return c.json({ id, ...body }, 201)
  })
}

crudRoutes(app, 'assets', 'assets', ['asset_id', 'type', 'location', 'status', 'last_updated'])
crudRoutes(app, 'inspections', 'inspections', ['inspection_id', 'asset_id', 'type', 'date', 'assignee', 'status'])
crudRoutes(app, 'work-orders', 'work_orders', ['work_order_id', 'title', 'priority', 'due', 'status'])
crudRoutes(app, 'compliance-reports', 'compliance_reports', ['name', 'due', 'status', 'progress'])

app.post('/api/v1/stripe/checkout', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  const body = await c.req.json()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: c.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${c.env.FRONTEND_URL}/?success=1`,
    cancel_url: `${c.env.FRONTEND_URL}/?canceled=1`,
    customer_email: body.email,
    metadata: { product: 'aquamap' },
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
      await c.env.DB.prepare(`INSERT INTO subscriptions (id, customer_id, email, product, status, price_id, subscription_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(randomUUID(), customerId, email, session.metadata?.product || 'aquamap', 'active', session.line_items?.data[0]?.price?.id || c.env.STRIPE_PRICE_ID, session.subscription?.toString() || null)
        .run()
    }
  }
  return c.json({ received: true })
})

app.get('/api/v1/subscription/:email', async (c) => {
  const email = c.req.param('email')
  const sub = await c.env.DB.prepare(`SELECT * FROM subscriptions WHERE email = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(email).first()
  return c.json({ active: !!sub, subscription: sub })
})

export default app
