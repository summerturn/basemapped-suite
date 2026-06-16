import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { plot_id: 'A-1042', section: 'A', status: 'Occupied', occupant: 'John Miller', deed: 'D-2011' },
  { plot_id: 'B-0214', section: 'B', status: 'Available', occupant: '-', deed: '-' },
]

export default function PlotsPage() {
  const [plots, setPlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/plots'); setPlots(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Plots</h2><p className="text-sm text-gray-500 dark:text-gray-400">Interactive cemetery plot map and records.</p></div>
        <button onClick={async () => { await client.post('/plots', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Plot</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-3 font-medium">Plot</th><th className="px-4 py-3 font-medium">Section</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Occupant</th><th className="px-4 py-3 font-medium">Deed</th></tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {plots.map((p) => (<tr key={p.id}><td className="px-4 py-3 font-medium">{p.plot_id}</td><td className="px-4 py-3">{p.section}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'Occupied' ? 'bg-green-100 text-green-700' : p.status === 'Available' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.occupant}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.deed}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
