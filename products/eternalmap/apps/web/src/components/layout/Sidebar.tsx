"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard/reports", icon: "📊" },
  { label: "Cemeteries", href: "/dashboard/cemeteries", icon: "🪦" },
  { label: "Sections", href: "/dashboard/sections", icon: "📐" },
  { label: "Plots", href: "/dashboard/plots", icon: "⬜" },
  { label: "Graves", href: "/dashboard/graves", icon: "🪨" },
  { label: "Persons", href: "/dashboard/persons", icon: "👤" },
  { label: "Work Orders", href: "/dashboard/work-orders", icon: "🔧" },
  { label: "Photos", href: "/dashboard/photos", icon: "📷" },
  { label: "Documents", href: "/dashboard/documents", icon: "📄" },
  { label: "Sync", href: "/dashboard/sync", icon: "🔄" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`h-screen bg-slate-900 text-slate-100 flex flex-col transition-all ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {!collapsed && <span className="font-bold text-lg">EternalMap</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-700"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm transition ${
                active
                  ? "bg-emerald-700/20 text-emerald-400 border-r-2 border-emerald-500"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            localStorage.removeItem("eternalmap_token");
            sessionStorage.removeItem("eternalmap_token");
            window.location.href = "/auth/login";
          }}
          className={`flex items-center text-sm text-slate-400 hover:text-white ${collapsed ? "justify-center" : ""}`}
        >
          <span className="text-base">🚪</span>
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
