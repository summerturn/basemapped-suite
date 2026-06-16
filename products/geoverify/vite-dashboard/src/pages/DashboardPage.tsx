import { useEffect, useState } from 'react'
import { FolderGit2, PlayCircle, CheckSquare, AlertOctagon } from 'lucide-react'
import client from '../api/client'

export default function DashboardPage() {
  const [counts, setCounts] = useState({ projects: 0, runs: 0, assertions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([client.get('/projects'), client.get('/runs'), client.get('/assertions')])
      .then(([p, r, a]) => {
        setCounts({ projects: (p.data.items || []).length, runs: (r.data.items || []).length, assertions: (a.data.items || []).length })
        setLoading(false)
      })
  }, [])

  const stats = [
    { label: 'Projects', value: counts.projects, icon: FolderGit2, change: 'active suites' },
    { label: 'Test Runs', value: counts.runs, icon: PlayCircle, change: 'historical runs' },
    { label: 'Assertions', value: counts.assertions, icon: CheckSquare, change: 'built-in helpers' },
  ]

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Dashboard</h2><p className="text-sm text-gray-500 dark:text-gray-400">Geospatial test coverage at a glance.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between"><stat.icon className="h-5 w-5 text-accent" /><span className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</span></div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between"><AlertOctagon className="h-5 w-5 text-accent" /><span className="text-xs text-gray-500 dark:text-gray-400">current rate</span></div>
          <p className="mt-3 text-2xl font-bold">1.1%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Failures</p>
        </div>
      </div>
    </div>
  )
}
