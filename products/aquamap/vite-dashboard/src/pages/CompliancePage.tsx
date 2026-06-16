import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { name: 'SDWA Annual Report', due: '2024-07-15', status: 'In Progress', progress: 65 },
  { name: 'CMOM Self-Assessment', due: '2024-08-01', status: 'Not Started', progress: 0 },
]

export default function CompliancePage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/compliance-reports'); setItems(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Compliance</h2><p className="text-sm text-gray-500 dark:text-gray-400">EPA reports and regulatory deadlines.</p></div>
        <button onClick={async () => { await client.post('/compliance-reports', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">New Report</button>
      </div>
      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between">
              <div><p className="font-medium">{r.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">Due {r.due}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === 'Submitted' ? 'bg-green-100 text-green-700' : r.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-accent" style={{ width: `${r.progress}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
