import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { run_id: 'RUN-9821', project: 'City Pipeline Network', duration: '12s', result: 'Passed', tests: '48/48' },
  { run_id: 'RUN-9820', project: 'Utility Pole Inventory', duration: '8s', result: 'Failed', tests: '34/36' },
]

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/runs'); setRuns(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Test Runs</h2><p className="text-sm text-gray-500 dark:text-gray-400">Historical assertion run results.</p></div>
      <div className="space-y-3">
        {runs.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">{r.run_id}</p><p className="text-xs text-gray-500 dark:text-gray-400">{r.project} • {r.duration}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm text-gray-600 dark:text-gray-400">{r.tests}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.result === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.result}</span></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={async () => { await client.post('/runs', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Run</button>
    </div>
  )
}
