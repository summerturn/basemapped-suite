export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Occupancy, revenue, and maintenance reports.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Occupancy Trend</h3>
          <div className="flex h-32 items-end gap-2">
            {[62, 64, 66, 69, 71, 73, 74].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-accent/80" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>2019</span><span>2020</span><span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Available Reports</h3>
          <div className="space-y-2">
            {['Occupancy Summary', 'Deed Registry', 'Maintenance Backlog', 'Revenue by Section'].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-sm">{r}</span>
                <button className="text-xs font-medium text-accent hover:underline">Download</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
