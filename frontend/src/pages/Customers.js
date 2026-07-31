import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Customers() {
  const { token, role } = useAuth()                    // ← tambah role
  const headers = { Authorization: `Bearer ${token}` }
  const canDelete = role === 'owner' || role === 'manager'   // ← baru

  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchCustomers = () => {
    axios.get('http://localhost:5000/api/customers', { headers })
      .then(res => setCustomers(res.data))
  }

  useEffect(() => { fetchCustomers() }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('Nama customer wajib diisi!')
    setLoading(true)
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/customers/${editId}`, form, { headers })
      } else {
        await axios.post('http://localhost:5000/api/customers', form, { headers })
      }
      fetchCustomers()
      resetForm()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan customer')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' })
    setEditId(c.id)
    setShowForm(true)
    setSelectedCustomer(null)
    setHistory(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus customer ini?')) return
    try {                                                              // ← baru
      await axios.delete(`http://localhost:5000/api/customers/${id}`, { headers })
      fetchCustomers()
      setSelectedCustomer(null)
      setHistory(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus customer')   // ← baru
    }
  }

  const handleViewHistory = async (c) => {
    setSelectedCustomer(c)
    const res = await axios.get(`http://localhost:5000/api/customers/${c.id}/history`, { headers })
    setHistory(res.data)
  }

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', address: '' })
    setEditId(null)
    setShowForm(false)
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Customer</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} customer terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); setSelectedCustomer(null); setHistory(null) }}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
          {showForm ? 'Batal' : '+ Tambah Customer'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            {editId ? 'Edit Customer' : 'Tambah Customer Baru'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Customer</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: Bu Sari"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                No. HP <span className="text-slate-300">(opsional)</span>
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: 08123456789"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Email <span className="text-slate-300">(opsional)</span>
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: budi@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Alamat <span className="text-slate-300">(opsional)</span>
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: Jl. Raya No. 123"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit} disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
              {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Customer'}
            </button>
            <button onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Daftar Customer */}
        <div>
          <div className="relative mb-4">
            <input
              className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="Cari nama atau no. HP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                ✕
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                {search ? 'Customer tidak ditemukan' : 'Belum ada customer'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <li key={c.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-all cursor-pointer
                      ${selectedCustomer?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                    onClick={() => handleViewHistory(c)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400">
                          {c.phone || 'No HP tidak ada'} · {c.total_transactions}x belanja
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-emerald-600">
                        Rp {c.total_spent.toLocaleString('id-ID')}
                      </p>
                      <button onClick={e => { e.stopPropagation(); handleEdit(c) }}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                        Edit
                      </button>
                      {canDelete && (                                    // ← baru
                        <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                          Hapus
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detail & Riwayat Customer */}
        <div>
          {selectedCustomer && history ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{history.customer.name}</h2>
                  <p className="text-xs text-slate-400">{history.customer.phone || 'No HP tidak ada'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total Belanja</p>
                  <p className="text-lg font-bold text-slate-900">
                    {history.customer.total_transactions}x
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total Pengeluaran</p>
                  <p className="text-lg font-bold text-emerald-600">
                    Rp {history.customer.total_spent.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-3">Riwayat Transaksi</h3>
              {history.transactions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Belum ada transaksi</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {history.transactions.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">#{t.id} · {t.created_at}</span>
                        <span className="text-sm font-bold text-slate-900">
                          Rp {t.total.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {t.items.map((item, i) => (
                          <p key={i} className="text-xs text-slate-500">
                            {item.product_name} × {item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center h-48">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm font-medium text-slate-500">Pilih Customer</p>
              <p className="text-xs text-slate-400 mt-1">Klik nama customer untuk lihat riwayat belanja</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}