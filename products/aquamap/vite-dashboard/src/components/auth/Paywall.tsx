import { useState, useEffect } from 'react'
import { Lock, Loader2, CheckCircle } from 'lucide-react'
import client from '../../api/client'

interface Props { children: React.ReactNode }

export default function Paywall({ children }: Props) {
  const [email, setEmail] = useState('')
  const [storedEmail, setStoredEmail] = useState<string | null>(localStorage.getItem('aquamap_email'))
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storedEmail) { setChecking(false); return }
    checkSubscription(storedEmail)
  }, [storedEmail])

  const checkSubscription = async (e: string) => {
    try {
      const res = await client.get(`/subscription/${encodeURIComponent(e)}`)
      setActive(res.data.active)
    } catch (err: any) { setError(err.message) }
    finally { setChecking(false) }
  }

  const handleSubscribe = async () => {
    if (!email) return
    setLoading(true); setError(null)
    try {
      const res = await client.post('/stripe/checkout', { email })
      if (res.data.url) { localStorage.setItem('aquamap_email', email); window.location.href = res.data.url }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleSaveEmail = () => {
    if (!email) return
    localStorage.setItem('aquamap_email', email)
    setStoredEmail(email); setChecking(true); checkSubscription(email)
  }

  if (checking) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  if (active) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex justify-center"><div className="rounded-full bg-accent/10 p-3 text-accent"><Lock className="h-6 w-6" /></div></div>
        <h2 className="mb-2 text-center text-xl font-bold">AquaMap is subscription-only</h2>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">Start a $499/mo subscription to manage water utility assets, inspections, and compliance.</p>
        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          {storedEmail ? (
            <button onClick={handleSubscribe} disabled={loading || !email} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 w-full">{loading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}Subscribe with Stripe</button>
          ) : (
            <button onClick={handleSaveEmail} disabled={loading || !email} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 w-full">Continue</button>
          )}
        </div>
        {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
        <div className="mt-6 space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-accent" /><span>Unlimited assets</span></div>
          <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-accent" /><span>Inspections & work orders</span></div>
          <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-accent" /><span>EPA compliance reports</span></div>
        </div>
      </div>
    </div>
  )
}
