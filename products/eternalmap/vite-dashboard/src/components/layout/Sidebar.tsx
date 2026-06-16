import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MapPinned, FileText, Users, BarChart3, Landmark } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plots', label: 'Plots', icon: MapPinned },
  { to: '/deeds', label: 'Deeds', icon: FileText },
  { to: '/families', label: 'Families', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
        <Landmark className="h-6 w-6 text-accent" />
        <span className="text-lg font-bold text-accent">EternalMap</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
