import { Bell, User } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-sm font-medium text-gray-500 dark:text-gray-400">Geospatial Test Assertions</h1>
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  )
}
