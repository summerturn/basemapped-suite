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

app.use('*', cors({ origin: ['https://app.basemapped.com', 'https://basemapped.com', 'http://localhost:5173'], allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'], credentials: true }))
app.get('/health', (c) => c.json({ status: 'healthy', service: 'geoverify-worker' }))

function crudRoutes(path: string, table: string, fields: string[]) {
  app.get(`/api/v1/${path}`, async (c) => { const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`).all(); return c.json({ items: results || [] }) })
  app.post(`/api/v1/${path}`, async (c) => {
    const body = await c.req.json(); const id = randomUUID(); const values = [id, ...fields.map((f) => body[f] ?? ''), new Date().toISOString()]
    await c.env.DB.prepare(`INSERT INTO ${table} (id, ${fields.join(', ')}, created_at) VALUES (${values.map(() => '?').join(', ')})`).bind(...values).run()
    return c.json({ id, ...body }, 201)
  })
}

crudRoutes('projects', 'projects', ['name', 'tests', 'last_run', 'status'])
crudRoutes('runs', 'runs', ['run_id', 'project', 'duration', 'result', 'tests'])
crudRoutes('assertions', 'assertions', ['name', 'category', 'usage'])

app.post('/api/v1/stripe/checkout', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  const body = await c.req.json()
  const session = await stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price: c.env.STRIPE_PRICE_ID, quantity: 1 }], success_url: `${c.env.FRONTEND_URL}/?success=1`, cancel_url: `${c.env.FRONTEND_URL}/?canceled=1`, customer_email: body.email, metadata: { product: 'geoverify' } })
  return c.json({ url: session.url })
})

app.post('/api/v1/stripe/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  let event: Stripe.Event
  try { event = stripe.webhooks.constructEvent(await c.req.text(), c.req.header('stripe-signature') || '', c.env.STRIPE_WEBHOOK_SECRET) } catch (err: any) { return c.json({ detail: err.message }, 400) }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const email = s.customer_email || s.customer_details?.email
    const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
    if (email && customerId) await c.env.DB.prepare(`INSERT INTO subscriptions (id, customer_id, email, product, status, price_id, subscription_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(randomUUID(), customerId, email, s.metadata?.product || 'geoverify', 'active', s.line_items?.data[0]?.price?.id || c.env.STRIPE_PRICE_ID, s.subscription?.toString() || null).run()
  }
  return c.json({ received: true })
})

app.get('/api/v1/subscription/:email', async (c) => { const sub = await c.env.DB.prepare(`SELECT * FROM subscriptions WHERE email = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(c.req.param('email')).first(); return c.json({ active: !!sub, subscription: sub }) })

export default app
