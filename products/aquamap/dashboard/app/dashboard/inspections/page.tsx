'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';
import { format } from 'date-fns';

export default function InspectionsPage() {
  const { data: inspections, isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api.get('/api/v1/inspections').then((r) => r.data.data),
  });

  if (isLoading) return <div className="p-8 text-center">Loading inspections...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inspections</h1>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Inspector</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
            </tr>
          </thead>
          <tbody>
            {(inspections || []).map((insp: any) => (
              <tr key={insp.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{insp.inspection_type}</td>
                <td className="px-4 py-3 font-mono text-xs">{insp.asset_external_id || insp.asset_id?.slice(0, 8)}</td>
                <td className="px-4 py-3">{insp.inspector_id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-600">{insp.scheduled_date ? format(new Date(insp.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${insp.status === 'completed' ? 'bg-green-100 text-green-700' : insp.status === 'overdue' ? 'bg-red-100 text-red-700' : insp.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {insp.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-4 rounded-sm ${i < (insp.condition_rating_after || 0) ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
