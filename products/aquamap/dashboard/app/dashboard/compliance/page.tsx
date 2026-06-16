'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6B7280'];

export default function CompliancePage() {
  const { data: stats } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn: () => api.get('/api/v1/compliance/service-lines/stats').then((r) => r.data.data),
  });
  const { data: alerts } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: () => api.get('/api/v1/compliance/alerts').then((r) => r.data.data),
  });
  const { data: percentile } = useQuery({
    queryKey: ['compliance-percentile'],
    queryFn: () => api.get('/api/v1/compliance/samples/percentile').then((r) => r.data.data),
  });

  const pieData = (stats?.byStatus || []).map((s: any) => ({
    name: s.lead_status.replace(/_/g, ' '),
    value: Number(s.count),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Compliance</h1>

      {alerts && alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert: any, i: number) => (
            <div key={i} className={`p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              <p className="font-medium">{alert.type.replace(/_/g, ' ')}</p>
              <p className="text-sm">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Service Line Lead Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {pieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Percent Known: <span className="font-bold text-primary-700">{stats?.percentKnown || 0}%</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">90th Percentile Results</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Lead (ppb)</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div className="bg-primary-500 h-4 rounded-full transition-all" style={{ width: `${Math.min((percentile?.lead90th || 0) / 30 * 100, 100)}%` }} />
                </div>
                <span className="font-bold text-lg">{percentile?.lead90th?.toFixed(1) || 0}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Action Level: 15 ppb</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Copper (ppm)</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div className="bg-primary-500 h-4 rounded-full transition-all" style={{ width: `${Math.min((percentile?.copper90th || 0) / 2 * 100, 100)}%` }} />
                </div>
                <span className="font-bold text-lg">{percentile?.copper90th?.toFixed(2) || 0}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Action Level: 1.3 ppm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
