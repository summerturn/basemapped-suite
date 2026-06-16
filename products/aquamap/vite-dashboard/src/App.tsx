import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import InspectionsPage from './pages/InspectionsPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import CompliancePage from './pages/CompliancePage'

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
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/inspections" element={<InspectionsPage />} />
              <Route path="/work-orders" element={<WorkOrdersPage />} />
              <Route path="/compliance" element={<CompliancePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
