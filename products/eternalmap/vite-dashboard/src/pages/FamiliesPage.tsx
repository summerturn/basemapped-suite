import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { name: 'Miller Family', members: 4, plots: 'A-1042', portal: 'Active' },
  { name: 'Chen Family', members: 2, plots: 'C-0089', portal: 'Active' },
]

export default function FamiliesPage() {
  const [families, setFamilies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/families'); setFamilies(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Families</h2><p className="text-sm text-gray-500 dark:text-gray-400">Family records and portal access.</p></div>
        <button onClick={async () => { await client.post('/families', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Family</button>
      </div>
      <div className="space-y-3">
        {families.map((f) => (
          <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">{f.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{f.members} members • Plots: {f.plots}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.portal === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{f.portal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
