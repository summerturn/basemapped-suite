import { useEffect, useState } from 'react'
import { MapPin, ClipboardCheck, Wrench, AlertTriangle } from 'lucide-react'
import client from '../api/client'

export default function DashboardPage() {
  const [counts, setCounts] = useState({ assets: 0, inspections: 0, workOrders: 0, compliance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/assets'),
      client.get('/inspections'),
      client.get('/work-orders'),
      client.get('/compliance-reports'),
    ]).then(([a, i, w, c]) => {
      setCounts({
        assets: (a.data.items || []).length,
        inspections: (i.data.items || []).length,
        workOrders: (w.data.items || []).length,
        compliance: (c.data.items || []).length,
      })
      setLoading(false)
    })
  }, [])

  const stats = [
    { label: 'Total Assets', value: counts.assets, icon: MapPin, change: 'pipes, valves, hydrants' },
    { label: 'Open Inspections', value: counts.inspections, icon: ClipboardCheck, change: 'scheduled & overdue' },
    { label: 'Active Work Orders', value: counts.workOrders, icon: Wrench, change: 'in progress' },
    { label: 'Compliance Reports', value: counts.compliance, icon: AlertTriangle, change: 'EPA deadlines' },
  ]

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Dashboard</h2><p className="text-sm text-gray-500 dark:text-gray-400">Overview of your water utility network.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between"><stat.icon className="h-5 w-5 text-accent" /><span className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</span></div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
