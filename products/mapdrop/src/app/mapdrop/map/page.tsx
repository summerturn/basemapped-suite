'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Share2, Download, Layers } from 'lucide-react';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), { ssr: false });

export default function MapEditorPage() {
  const params = useParams();
  const mapId = params.id as string;

  return (
    <div className="h-[calc(100vh-64px)] flex">
      <div className="flex-1 relative">
        <MapContainer mapId={mapId} pointCount={1240} />
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition">
            <Layers className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition">
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
        <div className="flex border-b border-gray-200">
          {['Data', 'Style', 'Share'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-3 text-sm font-medium transition ${
                tab === 'Data'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Map Name</label>
              <input
                type="text"
                defaultValue="Customer Locations Q1"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Color By</label>
              <select className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>None (single color)</option>
                <option>Region</option>
                <option>Category</option>
              </select>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total points</span>
                <span className="font-medium">1,240</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Geocoded</span>
                <span className="font-medium text-green-600">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
