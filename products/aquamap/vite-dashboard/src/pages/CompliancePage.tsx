const reports = [
  { name: 'SDWA Annual Report', due: '2024-07-15', status: 'In Progress', progress: 65 },
  { name: 'CMOM Self-Assessment', due: '2024-08-01', status: 'Not Started', progress: 0 },
  { name: 'Lead & Copper Rule', due: '2024-06-30', status: 'Submitted', progress: 100 },
]

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">EPA reports and regulatory deadlines.</p>
      </div>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.name} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due {r.due}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                r.status === 'Submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                r.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>{r.status}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${r.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
