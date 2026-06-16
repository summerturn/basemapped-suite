import { MapPinned, FileText, Users, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Total Plots', value: '5,240', icon: MapPinned, change: '12 sections' },
  { label: 'Occupied', value: '3,891', icon: FileText, change: '74.3%' },
  { label: 'Families', value: '2,104', icon: Users, change: '+8 this week' },
  { label: 'Available', value: '1,349', icon: TrendingUp, change: '25.7%' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Cemetery occupancy and operations overview.</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Occupancy by Section</h3>
          <div className="space-y-3">
            {[
              { label: 'Section A', value: 92 },
              { label: 'Section B', value: 68 },
              { label: 'Section C', value: 45 },
              { label: 'Mausoleum', value: 81 },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex justify-between text-sm"><span>{s.label}</span><span className="font-medium">{s.value}%</span></div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-accent" style={{ width: `${s.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-400">Deed transfer for Plot A-1042 completed</p>
            <p className="text-gray-600 dark:text-gray-400">New burial record added to Section C</p>
            <p className="text-gray-600 dark:text-gray-400">Family portal request approved</p>
            <p className="text-gray-600 dark:text-gray-400">Work order WO-12 marked complete</p>
          </div>
        </div>
      </div>
    </div>
  )
}
