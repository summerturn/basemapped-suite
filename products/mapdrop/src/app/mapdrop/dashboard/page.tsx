'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Search, Share2, Lock, Clock } from 'lucide-react';

interface MapItem {
  id: string;
  name: string;
  rowCount: number;
  isPublic: boolean;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
}

const mockMaps: MapItem[] = [
  { id: '1', name: 'Customer Locations Q1', rowCount: 1240, isPublic: true, createdAt: '2026-05-20', status: 'ready' },
  { id: '2', name: 'Store Finder Data', rowCount: 58, isPublic: false, createdAt: '2026-05-18', status: 'ready' },
  { id: '3', name: 'Event Venues', rowCount: 3400, isPublic: true, createdAt: '2026-05-15', status: 'processing' },
];

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const maps = mockMaps.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Maps</h1>
          <p className="text-sm text-gray-500 mt-1">{maps.length} maps</p>
        </div>
        <Link
          href="/mapdrop/dashboard/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Map
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search maps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No maps yet</h3>
          <p className="text-gray-500 mt-1">Upload a CSV or Excel file to create your first map.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <Link
              key={map.id}
              href={`/mapdrop/map/${map.id}`}
              className="group p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                {map.isPublic ? (
                  <Share2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{map.name}</h3>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <span>{map.rowCount.toLocaleString()} rows</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {map.createdAt}
                </span>
              </div>
              {map.status === 'processing' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                  <div className="animate-spin w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full" />
                  Processing...
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
