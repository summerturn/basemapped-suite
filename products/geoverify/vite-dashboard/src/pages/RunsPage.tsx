const runs = [
  { id: 'RUN-9821', project: 'City Pipeline Network', duration: '12s', result: 'Passed', tests: '48/48' },
  { id: 'RUN-9820', project: 'Utility Pole Inventory', duration: '8s', result: 'Failed', tests: '34/36' },
  { id: 'RUN-9819', project: 'County Parcels', duration: '21s', result: 'Passed', tests: '112/112' },
]

export default function RunsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Test Runs</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Historical assertion run results.</p>
      </div>
      <div className="space-y-3">
        {runs.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{r.id}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.project} • {r.duration}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{r.tests}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.result === 'Passed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{r.result}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
