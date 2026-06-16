const inspections = [
  { id: 'INSP-001', asset: 'H-1024', type: 'Routine', date: '2024-06-18', assignee: 'J. Rivera', status: 'Scheduled' },
  { id: 'INSP-002', asset: 'V-2041', type: 'Valve exercise', date: '2024-06-19', assignee: 'M. Chen', status: 'Overdue' },
  { id: 'INSP-003', asset: 'M-009', type: 'Meter audit', date: '2024-06-20', assignee: 'A. Patel', status: 'Scheduled' },
]

export default function InspectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inspections</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled and ad-hoc inspection workflows.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr><th className="px-4 py-3 font-medium">ID</th><th className="px-4 py-3 font-medium">Asset</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Assignee</th><th className="px-4 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {inspections.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 font-medium">{i.id}</td>
                <td className="px-4 py-3">{i.asset}</td>
                <td className="px-4 py-3">{i.type}</td>
                <td className="px-4 py-3">{i.date}</td>
                <td className="px-4 py-3">{i.assignee}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${i.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
