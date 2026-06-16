import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ValidationDetailPage from './pages/ValidationDetailPage'
import ProjectListPage from './pages/ProjectListPage'
import TeamSettingsPage from './pages/TeamSettingsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/validations/:id" element={<ValidationDetailPage />} />
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/team" element={<TeamSettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
