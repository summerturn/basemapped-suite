import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, CheckCircle, AlertTriangle, Activity } from 'lucide-react'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { ValidationJob } from '../types'

const mockJobs: ValidationJob[] = [
  {
    id: '1',
    dataset_id: 'd1',
    rule_set: 'standard',
    status: 'completed',
    overall_score: 92,
    grade: 'A-',
    progress_pct: 100,
    created_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:00Z',
  },
  {
    id: '2',
    dataset_id: 'd2',
    rule_set: 'strict',
    status: 'completed',
    overall_score: 85,
    grade: 'B',
    progress_pct: 100,
    created_at: '2024-01-14T14:00:00Z',
    completed_at: '2024-01-14T14:08:00Z',
  },
  {
    id: '3',
    dataset_id: 'd3',
    rule_set: 'standard',
    status: 'failed',
    overall_score: 0,
    grade: 'F',
    progress_pct: 0,
    created_at: '2024-01-13T09:00:00Z',
  },
]

export default function DashboardPage() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        axisLine: { lineStyle: { color: '#9CA3AF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: '#9CA3AF' } },
        splitLine: { lineStyle: { color: '#E5E7EB' } },
      },
      series: [
        {
          name: 'Avg Score',
          type: 'line',
          smooth: true,
          data: [78, 82, 88, 85, 92, 90, 94],
          itemStyle: { color: '#10B981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16,185,129,0.3)' },
                { offset: 1, color: 'rgba(16,185,129,0.05)' },
              ],
            },
          },
        },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Validations', value: 124, icon: Activity, color: 'text-accent' },
      { label: 'Passed', value: 98, icon: CheckCircle, color: 'text-green-500' },
      { label: 'Warnings', value: 18, icon: AlertTriangle, color: 'text-yellow-500' },
      { label: 'Failed', value: 8, icon: AlertTriangle, color: 'text-red-500' },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/upload" className="btn-primary gap-2">
          <Upload size={16} />
          New Upload
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-4"
          >
            <s.icon className={`${s.color}`} size={24} />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Quality Trend</h2>
          <div ref={chartRef} style={{ width: '100%', height: 280 }} />
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Recent Validations</h2>
          <div className="space-y-3">
            {mockJobs.map((job) => (
              <Link
                key={job.id}
                to={`/validations/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <div>
                  <p className="text-sm font-medium">Dataset #{job.dataset_id}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : job.status === 'failed'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.grade && (
                    <p className="mt-0.5 text-xs font-bold text-accent">{job.grade}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
