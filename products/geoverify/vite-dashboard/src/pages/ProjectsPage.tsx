import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { name: 'City Pipeline Network', tests: 48, lastRun: '2 hours ago', status: 'Passing' },
  { name: 'County Parcels', tests: 112, lastRun: '5 hours ago', status: 'Passing' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/projects'); setProjects(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Projects</h2><p className="text-sm text-gray-500 dark:text-gray-400">Projects with GeoVerify assertion suites.</p></div>
        <button onClick={async () => { await client.post('/projects', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">New Project</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Tests</th><th className="px-4 py-3 font-medium">Last Run</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {projects.map((p) => (<tr key={p.id}><td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3">{p.tests}</td><td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.last_run}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'Passing' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
