const families = [
  { name: 'Miller Family', members: 4, plots: ['A-1042'], portal: 'Active' },
  { name: 'Chen Family', members: 2, plots: ['C-0089'], portal: 'Active' },
  { name: 'Lee Family', members: 3, plots: ['M-0034'], portal: 'Pending' },
]

export default function FamiliesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Families</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Family records and portal access.</p>
      </div>
      <div className="space-y-3">
        {families.map((f) => (
          <div key={f.name} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.members} members • Plots: {f.plots.join(', ')}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.portal === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{f.portal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
