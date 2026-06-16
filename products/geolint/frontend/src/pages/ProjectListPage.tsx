import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderOpen, X } from 'lucide-react'
import type { Project } from '../types'

const mockProjects: Project[] = [
  { id: '1', name: 'City Parks', team_id: 't1', rule_set_default: 'standard', description: 'Municipal parks geodata', created_at: '2024-01-01' },
  { id: '2', name: 'Utilities Network', team_id: 't1', rule_set_default: 'strict', description: 'Water and power lines', created_at: '2024-01-05' },
  { id: '3', name: 'Zoning Maps', team_id: 't1', rule_set_default: 'minimal', created_at: '2024-01-10' },
]

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRuleSet, setNewRuleSet] = useState('standard')
  const [newDesc, setNewDesc] = useState('')

  const createProject = () => {
    if (!newName.trim()) return
    const project: Project = {
      id: crypto.randomUUID(),
      name: newName,
      team_id: 't1',
      rule_set_default: newRuleSet,
      description: newDesc || undefined,
      created_at: new Date().toISOString(),
    }
    setProjects([project, ...projects])
    setNewName('')
    setNewRuleSet('standard')
    setNewDesc('')
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent dark:bg-accent/20">
                <FolderOpen size={20} />
              </div>
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rule set: {p.rule_set_default}
                </p>
              </div>
            </div>
            {p.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{p.description}</p>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Create Project</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Default Rule Set</label>
                  <select
                    value={newRuleSet}
                    onChange={(e) => setNewRuleSet(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="standard">Standard</option>
                    <option value="strict">Strict</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="Optional description"
                  />
                </div>
                <button onClick={createProject} className="btn-primary w-full">
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
