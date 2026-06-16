import { useEffect, useState } from 'react'
import { MapPinned, FileText, Users, TrendingUp } from 'lucide-react'
import client from '../api/client'

export default function DashboardPage() {
  const [counts, setCounts] = useState({ plots: 0, deeds: 0, families: 0 })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([client.get('/plots'), client.get('/deeds'), client.get('/families')])
      .then(([p, d, f]) => { setCounts({ plots: (p.data.items || []).length, deeds: (d.data.items || []).length, families: (f.data.items || []).length }); setLoading(false) })
  }, [])

  const stats = [
    { label: 'Total Plots', value: counts.plots, icon: MapPinned, change: 'sections' },
    { label: 'Deeds', value: counts.deeds, icon: FileText, change: 'active records' },
    { label: 'Families', value: counts.families, icon: Users, change: 'portals' },
  ]

  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Dashboard</h2><p className="text-sm text-gray-500 dark:text-gray-400">Cemetery occupancy and operations overview.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (<div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><stat.icon className="h-5 w-5 text-accent" /><span className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</span></div><p className="mt-3 text-2xl font-bold">{stat.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p></div>))}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><TrendingUp className="h-5 w-5 text-accent" /><span className="text-xs text-gray-500 dark:text-gray-400">available</span></div><p className="mt-3 text-2xl font-bold">25.7%</p><p className="text-sm text-gray-500 dark:text-gray-400">Available</p></div>
      </div>
    </div>
  )
}
