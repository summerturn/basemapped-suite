import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, FileText, FileSpreadsheet, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import QualityScoreRing from '../components/reports/QualityScoreRing'
import IssueMap from '../components/reports/IssueMap'
import type { Issue, ValidationResult, ValidationJob } from '../types'

const mockJob: ValidationJob = {
  id: '1',
  dataset_id: 'd1',
  rule_set: 'standard',
  status: 'completed',
  overall_score: 92,
  grade: 'A-',
  progress_pct: 100,
  created_at: '2024-01-15T10:00:00Z',
  completed_at: '2024-01-15T10:05:00Z',
}

const mockResults: ValidationResult[] = [
  { id: 'r1', job_id: '1', rule_id: 'topology', rule_name: 'Topology', category: 'geometry', status: 'pass', score: 95, issue_count: 2, created_at: '' },
  { id: 'r2', job_id: '1', rule_id: 'crs', rule_name: 'CRS', category: 'metadata', status: 'pass', score: 100, issue_count: 0, created_at: '' },
  { id: 'r3', job_id: '1', rule_id: 'attribute', rule_name: 'Attributes', category: 'attributes', status: 'warning', score: 82, issue_count: 5, created_at: '' },
]

const mockIssues: Issue[] = [
  { id: 'i1', result_id: 'r1', feature_id: 'f1', issue_type: 'self_intersection', message: 'Self-intersection detected', severity: 'high', coordinates: [-122.4194, 37.7749], suggested_fix: 'Use buffer(0)', created_at: '' },
  { id: 'i2', result_id: 'r1', feature_id: 'f2', issue_type: 'ring_orientation', message: 'Ring not oriented correctly', severity: 'medium', coordinates: [-122.5, 37.8], created_at: '' },
  { id: 'i3', result_id: 'r3', feature_id: 'f3', issue_type: 'missing_field', message: 'Required field missing', severity: 'medium', coordinates: undefined, created_at: '' },
]

export default function ValidationDetailPage() {
  const { id } = useParams()
  const [sortKey, setSortKey] = useState<'severity' | 'issue_type'>('severity')
  const [sortAsc, setSortAsc] = useState(false)

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }

  const sortedIssues = useMemo(() => {
    const arr = [...mockIssues]
    arr.sort((a, b) => {
      const va = sortKey === 'severity' ? severityOrder[a.severity] : a.issue_type
      const vb = sortKey === 'severity' ? severityOrder[b.severity] : b.issue_type
      return sortAsc ? (va > vb ? 1 : -1) : va < vb ? 1 : -1
    })
    return arr
  }, [sortKey, sortAsc])

  const exportData = (format: 'json' | 'csv') => {
    toast.success(`Exporting as ${format.toUpperCase()}...`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Validation #{id}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportData('json')} className="btn-secondary gap-2">
            <FileText size={16} /> JSON
          </button>
          <button onClick={() => exportData('csv')} className="btn-secondary gap-2">
            <FileSpreadsheet size={16} /> CSV
          </button>
          <button className="btn-primary gap-2">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center">
          <QualityScoreRing score={mockJob.overall_score || 0} />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Rule set: <span className="font-medium text-gray-900 dark:text-gray-100">{mockJob.rule_set}</span>
          </p>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
          <div className="space-y-3">
            {mockResults.map((r) => (
              <div key={r.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{r.rule_name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{r.score}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: r.score >= 90 ? '#10B981' : r.score >= 70 ? '#FBBF24' : '#EF4444',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.score}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Issue Map</h2>
        <IssueMap issues={mockIssues} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Issues ({mockIssues.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSortKey('severity')
                setSortAsc(!sortAsc)
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Severity <ArrowUpDown size={12} />
            </button>
            <button
              onClick={() => {
                setSortKey('issue_type')
                setSortAsc(!sortAsc)
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Type <ArrowUpDown size={12} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Feature</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Message</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Severity</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 font-mono text-xs">{issue.feature_id}</td>
                  <td className="py-3">{issue.issue_type}</td>
                  <td className="py-3">{issue.message}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        issue.severity === 'critical' || issue.severity === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : issue.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 dark:text-gray-400">
                    {issue.suggested_fix || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
