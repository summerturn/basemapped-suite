import Link from 'next/link';
import { MapPin, LayoutDashboard, Settings, CreditCard } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <MapPin className="w-5 h-5" />
            MapDrop
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/mapdrop/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/mapdrop/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <MapPin className="w-4 h-4" />
            My Maps
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </Link>
          <Link
            href="/mapdrop/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900">Free Plan</p>
            <p className="text-xs text-blue-700 mt-1">3 of 5 maps used</p>
            <Link
              href="/pricing"
              className="mt-2 block text-xs text-center py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
