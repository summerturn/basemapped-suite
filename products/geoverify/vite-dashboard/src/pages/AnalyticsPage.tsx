export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Test trends and coverage metrics.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Weekly Runs</h3>
          <div className="flex h-32 items-end gap-2">
            {[45, 62, 54, 78, 84, 96, 112].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-accent/80" style={{ height: `${(h / 120) * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold">Coverage by Category</h3>
          <div className="space-y-3">
            {[
              { label: 'Geometry', value: 92 },
              { label: 'CRS', value: 88 },
              { label: 'Distance', value: 74 },
              { label: 'Topology', value: 81 },
            ].map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex justify-between text-sm"><span>{c.label}</span><span className="font-medium">{c.value}%</span></div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-accent" style={{ width: `${c.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
