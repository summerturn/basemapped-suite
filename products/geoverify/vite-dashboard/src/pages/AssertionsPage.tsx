const assertions = [
  { name: 'assert_geometry_is_valid', category: 'Geometry', usage: 'assert geom.is_valid' },
  { name: 'assert_same_crs', category: 'CRS', usage: 'assert same_crs(a, b)' },
  { name: 'assert_within_distance', category: 'Distance', usage: 'assert within_distance(a, b, 100)' },
  { name: 'assert_no_self_intersection', category: 'Topology', usage: 'assert not geom.is_ring' },
  { name: 'assert_contains', category: 'Spatial', usage: 'assert polygon.contains(point)' },
]

export default function AssertionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assertions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Built-in geospatial assertion helpers.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr><th className="px-4 py-3 font-medium">Assertion</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Example</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {assertions.map((a) => (
              <tr key={a.name}>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{a.category}</span></td>
                <td className="px-4 py-3 font-mono text-xs text-accent">{a.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
