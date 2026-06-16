const orders = [
  { id: 'WO-441', title: 'Replace hydrant cap', priority: 'High', due: '2024-06-17', status: 'In Progress' },
  { id: 'WO-442', title: 'Valve box cleanup', priority: 'Low', due: '2024-06-21', status: 'Open' },
  { id: 'WO-443', title: 'Main line leak repair', priority: 'Critical', due: '2024-06-16', status: 'In Progress' },
]

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Work Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create, assign, and track maintenance jobs.</p>
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">New Work Order</button>
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{o.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{o.id} • Due {o.due}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  o.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  o.priority === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>{o.priority}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{o.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
