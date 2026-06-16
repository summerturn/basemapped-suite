'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';
import { Activity, Wrench, ClipboardCheck, AlertTriangle } from 'lucide-react';

function KPICard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: assets } = useQuery({ queryKey: ['assets'], queryFn: () => api.get('/api/v1/assets').then((r) => r.data.data) });
  const { data: wos } = useQuery({ queryKey: ['work-orders'], queryFn: () => api.get('/api/v1/work-orders').then((r) => r.data.data) });
  const { data: inspections } = useQuery({ queryKey: ['inspections'], queryFn: () => api.get('/api/v1/inspections').then((r) => r.data.data) });

  const openWOs = wos?.filter((wo: any) => ['open', 'assigned', 'in_progress'].includes(wo.status)).length || 0;
  const completedInspections = inspections?.filter((i: any) => i.status === 'completed').length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Assets" value={assets?.length || 0} icon={Activity} color="bg-primary-500" />
        <KPICard title="Open Work Orders" value={openWOs} icon={Wrench} color="bg-orange-500" />
        <KPICard title="Inspections This Month" value={completedInspections} icon={ClipboardCheck} color="bg-emerald-500" />
        <KPICard title="Compliance Alerts" value={2} icon={AlertTriangle} color="bg-red-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {(wos?.slice(0, 5) || []).map((wo: any) => (
            <div key={wo.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-sm">{wo.title}</p>
                <p className="text-xs text-gray-500">{wo.status} · Priority: {wo.priority}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${wo.priority === 'emergency' ? 'bg-red-100 text-red-700' : wo.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                {wo.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
