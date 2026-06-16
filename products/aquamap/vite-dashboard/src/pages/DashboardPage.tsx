import { MapPin, ClipboardCheck, Wrench, AlertTriangle } from 'lucide-react'

const stats = [
  { label: 'Total Assets', value: '4,832', icon: MapPin, change: '+12 this month' },
  { label: 'Open Inspections', value: '18', icon: ClipboardCheck, change: '3 overdue' },
  { label: 'Active Work Orders', value: '7', icon: Wrench, change: '2 high priority' },
  { label: 'Compliance Alerts', value: '2', icon: AlertTriangle, change: 'EPA report due' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your water utility network.</p>
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
        <h3 className="mb-4 font-semibold">Network Health</h3>
        <div className="space-y-3">
          {[
            { label: 'Pipes inspected', value: 78 },
            { label: 'Hydrants serviced', value: 92 },
            { label: 'Valves exercised', value: 64 },
          ].map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
