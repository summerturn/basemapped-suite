'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';

const COLUMNS = ['open', 'assigned', 'in_progress', 'completed', 'closed'];
const COLUMN_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
};

export default function WorkOrdersPage() {
  const { data: wos, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => api.get('/api/v1/work-orders').then((r) => r.data.data),
  });

  if (isLoading) return <div className="p-8 text-center">Loading work orders...</div>;

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col] = (wos || []).filter((wo: any) => wo.status === col);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Work Orders</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col} className="min-w-[280px] bg-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{COLUMN_LABELS[col]}</h3>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{byStatus[col]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(byStatus[col] || []).map((wo: any) => (
                <div key={wo.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-500">WO-{wo.id.slice(0, 6)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${wo.priority === 'emergency' ? 'bg-red-100 text-red-700' : wo.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {wo.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{wo.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{wo.description?.slice(0, 60)}...</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
