'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LegendItem {
  label: string;
  color: string;
}

interface LegendProps {
  items: LegendItem[];
  title?: string;
}

export default function Legend({ items, title = 'Legend' }: LegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 max-w-[200px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-t-lg"
      >
        {title}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-1.5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600 truncate">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
