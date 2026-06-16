'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PopupContentProps {
  properties: Record<string, unknown>;
  lat: number;
  lng: number;
}

export default function PopupContent({ properties, lat, lng }: PopupContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-w-[200px] max-w-[300px]">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
        <span className="text-xs font-mono text-gray-500">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Copy coordinates"
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
      </div>
      <div className="space-y-1">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <span className="text-xs text-gray-500 capitalize">{key}</span>
            <span className="text-xs text-gray-900 font-medium truncate max-w-[150px]">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
