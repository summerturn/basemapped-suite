import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { work_order_id: 'WO-441', title: 'Replace hydrant cap', priority: 'High', due: '2024-06-17', status: 'In Progress' },
  { work_order_id: 'WO-442', title: 'Valve box cleanup', priority: 'Low', due: '2024-06-21', status: 'Open' },
]

export default function WorkOrdersPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/work-orders'); setItems(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Work Orders</h2><p className="text-sm text-gray-500 dark:text-gray-400">Create, assign, and track maintenance jobs.</p></div>
        <button onClick={async () => { await client.post('/work-orders', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">New Work Order</button>
      </div>
      <div className="space-y-3">
        {items.map((o) => (
          <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">{o.title}</p><p className="text-xs text-gray-500 dark:text-gray-400">{o.work_order_id} • Due {o.due}</p></div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.priority === 'Critical' ? 'bg-red-100 text-red-700' : o.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{o.priority}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{o.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
