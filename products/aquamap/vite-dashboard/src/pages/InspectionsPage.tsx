import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { inspection_id: 'INSP-001', asset_id: 'H-1024', type: 'Routine', date: '2024-06-18', assignee: 'J. Rivera', status: 'Scheduled' },
  { inspection_id: 'INSP-002', asset_id: 'V-2041', type: 'Valve exercise', date: '2024-06-19', assignee: 'M. Chen', status: 'Overdue' },
]

export default function InspectionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/inspections'); setItems(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Inspections</h2><p className="text-sm text-gray-500 dark:text-gray-400">Scheduled and ad-hoc inspection workflows.</p></div>
        <button onClick={async () => { await client.post('/inspections', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Inspection</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-3 font-medium">ID</th><th className="px-4 py-3 font-medium">Asset</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Assignee</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((i) => (<tr key={i.id}><td className="px-4 py-3 font-medium">{i.inspection_id}</td><td className="px-4 py-3">{i.asset_id}</td><td className="px-4 py-3">{i.type}</td><td className="px-4 py-3">{i.date}</td><td className="px-4 py-3">{i.assignee}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${i.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{i.status}</span></td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
