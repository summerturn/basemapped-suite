import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Shield, Mail } from 'lucide-react'
import type { TeamMember } from '../types'

const mockMembers: TeamMember[] = [
  { user_id: 'u1', team_id: 't1', role: 'owner', joined_at: '2024-01-01', user: { id: 'u1', email: 'alice@example.com', name: 'Alice', tier: 'enterprise', created_at: '' } },
  { user_id: 'u2', team_id: 't1', role: 'admin', joined_at: '2024-01-05', user: { id: 'u2', email: 'bob@example.com', name: 'Bob', tier: 'pro', created_at: '' } },
  { user_id: 'u3', team_id: 't1', role: 'editor', joined_at: '2024-01-10', user: { id: 'u3', email: 'carol@example.com', name: 'Carol', tier: 'free', created_at: '' } },
]

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    editor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[role] || colors.viewer
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>(mockMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('viewer')

  const sendInvite = () => {
    if (!inviteEmail.trim()) return
    const newMember: TeamMember = {
      user_id: crypto.randomUUID(),
      team_id: 't1',
      role: inviteRole,
      joined_at: new Date().toISOString(),
      user: {
        id: crypto.randomUUID(),
        email: inviteEmail,
        name: inviteEmail.split('@')[0],
        tier: 'free',
        created_at: '',
      },
    }
    setMembers([...members, newMember])
    setInviteEmail('')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Team Settings</h1>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Plan</h2>
        <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 dark:bg-accent/10">
          <div>
            <p className="font-semibold">Enterprise</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Unlimited validations, priority support</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">Active</span>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Members ({members.length})</h2>
        <div className="space-y-3">
          {members.map((m) => (
            <motion.div
              key={m.user_id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <Mail size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium">{m.user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(m.role)}`}>
                  {m.role}
                </span>
                {m.role !== 'owner' && (
                  <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                    <Shield size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Invite Member</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={sendInvite} className="btn-primary gap-2">
            <UserPlus size={16} /> Invite
          </button>
        </div>
      </div>
    </div>
  )
}
