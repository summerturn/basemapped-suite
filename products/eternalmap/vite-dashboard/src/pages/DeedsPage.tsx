const deeds = [
  { id: 'D-2045', owner: 'Margaret Chen', plot: 'C-0089', issued: '2019-03-12', status: 'Active' },
  { id: 'D-2011', owner: 'Robert Miller', plot: 'A-1042', issued: '2015-08-22', status: 'Active' },
  { id: 'D-1987', owner: 'Lisa Lee', plot: 'M-0034', issued: '2010-11-05', status: 'Active' },
]

export default function DeedsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deeds</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ownership records and transfers.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr><th className="px-4 py-3 font-medium">Deed ID</th><th className="px-4 py-3 font-medium">Owner</th><th className="px-4 py-3 font-medium">Plot</th><th className="px-4 py-3 font-medium">Issued</th><th className="px-4 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {deeds.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">{d.id}</td>
                <td className="px-4 py-3">{d.owner}</td>
                <td className="px-4 py-3">{d.plot}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.issued}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
