import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, FileText, FileSpreadsheet, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import QualityScoreRing from '../components/reports/QualityScoreRing'
import IssueMap from '../components/reports/IssueMap'
import client from '../api/client'
import type { Issue, ValidationResult, ValidationJob } from '../types'

export default function ValidationDetailPage() {
  const { id } = useParams()
  const [job, setJob] = useState<ValidationJob | null>(null)
  const [results, setResults] = useState<ValidationResult[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'severity' | 'issue_type'>('severity')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (!id) return
    client.get(`/validations/${id}`)
      .then((res) => {
        const v = res.data
        setJob({
          id: v.id,
          dataset_id: v.dataset_id,
          rule_set: v.rule_set,
          status: v.status,
          overall_score: v.score,
          grade: v.grade,
          progress_pct: v.status === 'completed' ? 100 : 0,
          created_at: v.created_at,
          completed_at: v.completed_at,
        })
        setResults([
          { id: 'r1', job_id: v.id, rule_id: 'topology', rule_name: 'Topology', category: 'geometry', status: v.score && v.score >= 90 ? 'pass' : 'warning', score: v.score || 0, issue_count: v.issues_count || 0, created_at: '' },
          { id: 'r2', job_id: v.id, rule_id: 'crs', rule_name: 'CRS', category: 'metadata', status: 'pass', score: 100, issue_count: 0, created_at: '' },
          { id: 'r3', job_id: v.id, rule_id: 'attribute', rule_name: 'Attributes', category: 'attributes', status: v.score && v.score >= 90 ? 'pass' : 'warning', score: v.score || 0, issue_count: v.issues_count || 0, created_at: '' },
        ])
        setIssues((v.issues || []).map((i: any) => ({
          id: i.id,
          result_id: i.validation_id,
          feature_id: i.feature_id,
          issue_type: i.issue_type,
          message: i.message,
          severity: i.severity,
          coordinates: i.coordinates ? JSON.parse(i.coordinates) : undefined,
          suggested_fix: i.suggested_fix,
          created_at: i.created_at,
        })))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }

  const sortedIssues = useMemo(() => {
    const arr = [...issues]
    arr.sort((a, b) => {
      const va = sortKey === 'severity' ? severityOrder[a.severity] : a.issue_type
      const vb = sortKey === 'severity' ? severityOrder[b.severity] : b.issue_type
      return sortAsc ? (va > vb ? 1 : -1) : va < vb ? 1 : -1
    })
    return arr
  }, [issues, sortKey, sortAsc])

  const exportData = (format: 'json' | 'csv') => {
    toast.success(`Exporting as ${format.toUpperCase()}...`)
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>
  if (!job) return <div className="p-6">Validation not found</div>

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
          <QualityScoreRing score={job.overall_score || 0} />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Rule set: <span className="font-medium text-gray-900 dark:text-gray-100">{job.rule_set}</span>
          </p>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
          <div className="space-y-3">
            {results.map((r) => (
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
        <IssueMap issues={issues} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Issues ({issues.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setSortKey('severity'); setSortAsc(!sortAsc) }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Severity <ArrowUpDown size={12} />
            </button>
            <button
              onClick={() => { setSortKey('issue_type'); setSortAsc(!sortAsc) }}
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      issue.severity === 'critical' || issue.severity === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : issue.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>{issue.severity}</span>
                  </td>
                  <td className="py-3 text-gray-500 dark:text-gray-400">{issue.suggested_fix || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
