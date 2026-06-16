import { FolderGit2, PlayCircle, CheckSquare, AlertOctagon } from 'lucide-react'

const stats = [
  { label: 'Projects', value: '8', icon: FolderGit2, change: '+2 this month' },
  { label: 'Test Runs', value: '1,247', icon: PlayCircle, change: 'Last 7 days' },
  { label: 'Assertions', value: '342', icon: CheckSquare, change: '12 custom' },
  { label: 'Failures', value: '14', icon: AlertOctagon, change: '1.1% rate' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Geospatial test coverage at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <stat.icon className="h-5 w-5 text-accent" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 font-semibold">Recent Run Results</h3>
        <div className="space-y-3">
          {[
            { name: 'pipeline-topology', passed: 48, failed: 0 },
            { name: 'hydrant-distance-check', passed: 36, failed: 2 },
            { name: 'crs-consistency', passed: 112, failed: 0 },
          ].map((run) => (
            <div key={run.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{run.name}</span>
                <span className="font-medium">{run.passed + run.failed} tests</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-2 bg-accent" style={{ width: `${(run.passed / (run.passed + run.failed)) * 100}%` }} />
                {run.failed > 0 && <div className="h-2 bg-red-500" style={{ width: `${(run.failed / (run.passed + run.failed)) * 100}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
