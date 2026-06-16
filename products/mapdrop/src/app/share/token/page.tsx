'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Globe } from 'lucide-react';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), { ssr: false });

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-gray-900">Shared Map</h1>
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            <Globe className="w-3 h-3" />
            Public
          </span>
        </div>
        <a href="/" className="text-sm text-blue-600 hover:underline">Made with MapDrop</a>
      </div>
      <div className="flex-1">
        <MapContainer mapId={token} pointCount={1240} />
      </div>
    </div>
  );
}
