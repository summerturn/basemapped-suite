'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';
import Link from 'next/link';
import { MapPin, Filter, Download, Plus } from 'lucide-react';

export default function AssetsPage() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get('/api/v1/assets').then((r) => r.data.data),
  });

  if (isLoading) return <div className="p-8 text-center">Loading assets...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assets</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Filter size={16} /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
          <Link href="/dashboard/assets/map" className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            <MapPin size={16} /> Map View
          </Link>
          <button className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
            </tr>
          </thead>
          <tbody>
            {(assets || []).map((asset: any) => (
              <tr key={asset.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{asset.external_id || asset.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{asset.asset_type_id?.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${asset.status === 'active' ? 'bg-green-100 text-green-700' : asset.status === 'under_repair' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-2 h-4 rounded-sm ${i < (asset.condition_rating || 0) ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{asset.material || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{asset.address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
