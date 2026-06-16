'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, ClipboardList, Wrench, ShieldCheck, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/app/stores/authStore';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/assets', label: 'Assets', icon: Map },
  { href: '/dashboard/inspections', label: 'Inspections', icon: ClipboardList },
  { href: '/dashboard/work-orders', label: 'Work Orders', icon: Wrench },
  { href: '/dashboard/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-700">AquaMap</h1>
        <p className="text-xs text-gray-500">Utility GIS Platform</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-red-600 w-full">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
