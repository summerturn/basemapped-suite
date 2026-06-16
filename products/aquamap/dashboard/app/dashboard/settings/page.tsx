'use client';

import { useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: 'Aqua Utility Co.', address: '123 Water St', phone: '555-0123' });
  const [users, setUsers] = useState<User[]>([
    { id: '1', email: 'admin@aquamap.local', role: 'admin' },
    { id: '2', email: 'field@aquamap.local', role: 'field_worker' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('field_worker');
  const [customFields, setCustomFields] = useState([{ id: '1', name: 'Material', type: 'text' }]);

  const addUser = () => {
    if (!inviteEmail) return;
    setUsers([...users, { id: String(Date.now()), email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
  };

  const removeUser = (id: string) => setUsers(users.filter((u) => u.id !== id));

  const addCustomField = () => {
    setCustomFields([...customFields, { id: String(Date.now()), name: '', type: 'text' }]);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="mb-8 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Utility Profile</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Utility Name</label>
            <input className="mt-1 block w-full border rounded p-2" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input className="mt-1 block w-full border rounded p-2" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input className="mt-1 block w-full border rounded p-2" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
        </div>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Profile</button>
      </section>

      <section className="mb-8 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <div className="flex gap-2 mb-4">
          <input className="border rounded p-2 flex-1" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <select className="border rounded p-2" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="field_worker">Field Worker</option>
          </select>
          <button onClick={addUser} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Invite</button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-2">{u.email}</td>
                <td className="p-2 capitalize">{u.role.replace('_', ' ')}</td>
                <td className="p-2">
                  <button onClick={() => removeUser(u.id)} className="text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Custom Fields</h2>
        {customFields.map((f, idx) => (
          <div key={f.id} className="flex gap-2 mb-2">
            <input className="border rounded p-2 flex-1" placeholder="Field Name" value={f.name} onChange={(e) => {
              const next = [...customFields];
              next[idx].name = e.target.value;
              setCustomFields(next);
            }} />
            <select className="border rounded p-2" value={f.type} onChange={(e) => {
              const next = [...customFields];
              next[idx].type = e.target.value;
              setCustomFields(next);
            }}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>
        ))}
        <button onClick={addCustomField} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">Add Field</button>
      </section>
    </div>
  );
}
