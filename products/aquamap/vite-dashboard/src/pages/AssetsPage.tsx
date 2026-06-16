import { useState, useEffect } from 'react'
import client from '../api/client'

const defaultAssets = [
  { asset_id: 'H-1024', type: 'Hydrant', location: 'Main St & 4th Ave', status: 'Operational', last_updated: '2024-05-12' },
  { asset_id: 'V-2041', type: 'Valve', location: 'Oakwood Dr', status: 'Needs service', last_updated: '2024-04-28' },
  { asset_id: 'P-12A', type: 'Pipe', location: 'Riverside Trunk', status: 'Operational', last_updated: '2024-06-01' },
  { asset_id: 'M-009', type: 'Meter', location: 'Industrial Park B', status: 'Offline', last_updated: '2024-03-15' },
]

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  const load = async () => {
    const res = await client.get('/assets')
    setAssets(res.data.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const seed = async () => {
    setSeeded(true)
    for (const a of defaultAssets) {
      await client.post('/assets', a)
    }
    load()
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pipes, valves, hydrants, meters, and treatment assets.</p>
        </div>
        <div className="flex gap-2">
          {assets.length === 0 && !seeded && <button onClick={seed} className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10">Load Demo Assets</button>}
          <button onClick={async () => { await client.post('/assets', defaultAssets[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Asset</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr><th className="px-4 py-3 font-medium">ID</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Last Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.asset_id}</td>
                <td className="px-4 py-3">{a.type}</td>
                <td className="px-4 py-3">{a.location}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'Operational' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : a.status === 'Offline' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.last_updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
