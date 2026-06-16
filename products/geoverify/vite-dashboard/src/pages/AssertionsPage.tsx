import { useState, useEffect } from 'react'
import client from '../api/client'

const defaults = [
  { name: 'assert_geometry_is_valid', category: 'Geometry', usage: 'assert geom.is_valid' },
  { name: 'assert_same_crs', category: 'CRS', usage: 'assert same_crs(a, b)' },
]

export default function AssertionsPage() {
  const [assertions, setAssertions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { const res = await client.get('/assertions'); setAssertions(res.data.items || []); setLoading(false) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-6">Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Assertions</h2><p className="text-sm text-gray-500 dark:text-gray-400">Built-in geospatial assertion helpers.</p></div>
        <button onClick={async () => { await client.post('/assertions', defaults[0]); load() }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">Add Assertion</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-3 font-medium">Assertion</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Example</th></tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {assertions.map((a) => (<tr key={a.id}><td className="px-4 py-3 font-medium">{a.name}</td><td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{a.category}</span></td><td className="px-4 py-3 font-mono text-xs text-accent">{a.usage}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
