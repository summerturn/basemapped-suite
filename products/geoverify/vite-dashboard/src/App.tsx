import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Paywall from './components/auth/Paywall'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import RunsPage from './pages/RunsPage'
import AssertionsPage from './pages/AssertionsPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Paywall>
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/runs" element={<RunsPage />} />
                <Route path="/assertions" element={<AssertionsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </Paywall>
    </BrowserRouter>
  )
}

export default App
