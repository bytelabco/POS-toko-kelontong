import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Users() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password: '', role: 'cashier' })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  const fetchUsers = () => {
    axios.get('http://localhost:5000/api/auth/users', { headers })
      .then(res => setUsers(res.data))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = async () => {
    if (!form.username || !form.password) return setError('Isi semua field!')
    try {
      await axios.post('http://localhost:5000/api/auth/register', form, { headers })
      fetchUsers()
      setForm({ username: '', password: '', role: 'cashier' })
      setShowForm(false)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuat user')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus user ini?')) return
    await axios.delete(`http://localhost:5000/api/auth/users/${id}`, { headers })
    fetchUsers()
  }

  const roleBadge = {
    owner:   'bg-blue-100 text-blue-700',
    manager: 'bg-emerald-100 text-emerald-700',
    cashier: 'bg-slate-100 text-slate-700',
  }

  const roleLabel = { owner: 'Owner', manager: 'Manager', cashier: 'Kasir' }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola User</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} user terdaftar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
          + Tambah User
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Tambah User Baru</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Username</label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: kasir1"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                type="password" placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Kasir</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
              Tambah User
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Username</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Role</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Dibuat</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.username}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{u.created_at}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(u.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}