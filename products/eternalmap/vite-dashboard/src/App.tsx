import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import DashboardPage from './pages/DashboardPage'
import PlotsPage from './pages/PlotsPage'
import DeedsPage from './pages/DeedsPage'
import FamiliesPage from './pages/FamiliesPage'
import ReportsPage from './pages/ReportsPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/plots" element={<PlotsPage />} />
              <Route path="/deeds" element={<DeedsPage />} />
              <Route path="/families" element={<FamiliesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
