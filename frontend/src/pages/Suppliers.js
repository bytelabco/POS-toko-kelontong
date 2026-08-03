import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Suppliers() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchSuppliers = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/suppliers`, { headers })
      .then(res => setSuppliers(res.data))
  }

  useEffect(() => { fetchSuppliers() }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('Nama supplier wajib diisi!')
    setLoading(true)
    try {
      if (editId) {
        await axios.put(`${process.env.REACT_APP_API_URL}/api/suppliers/${editId}`, form, { headers })
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/suppliers`, form, { headers })
      }
      fetchSuppliers()
      resetForm()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan supplier')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (s) => {
    setForm({
      name:    s.name,
      phone:   s.phone || '',
      email:   s.email || '',
      address: s.address || '',
      notes:   s.notes || ''
    })
    setEditId(s.id)
    setShowForm(true)
    setSelectedSupplier(null)
    setHistory(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus supplier ini?')) return
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/suppliers/${id}`, { headers })
      fetchSuppliers()
      setSelectedSupplier(null)
      setHistory(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus supplier')
    }
  }

  const handleViewHistory = async (s) => {
    setSelectedSupplier(s)
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/suppliers/${s.id}/history`, { headers })
      setHistory(res.data)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memuat riwayat supplier')
      setSelectedSupplier(null)
    }
  }

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    setEditId(null)
    setShowForm(false)
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search))
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Supplier</h1>
          <p className="text-slate-500 text-sm mt-1">{suppliers.length} supplier terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); setSelectedSupplier(null); setHistory(null) }}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
          {showForm ? 'Batal' : '+ Tambah Supplier'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            {editId ? 'Edit Supplier' : 'Tambah Supplier Baru'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Supplier</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: PT Indofood"
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
                placeholder="Contoh: supplier@email.com"
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
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Catatan <span className="text-slate-300">(opsional)</span>
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: Pembayaran setiap akhir bulan"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit} disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
              {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Supplier'}
            </button>
            <button onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Daftar Supplier */}
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
                {search ? 'Supplier tidak ditemukan' : 'Belum ada supplier'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <li key={s.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-all cursor-pointer
                      ${selectedSupplier?.id === s.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                    onClick={() => handleViewHistory(s)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {s.phone || 'No HP tidak ada'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); handleEdit(s) }}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                        Edit
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detail & Riwayat Supplier */}
        <div>
          {selectedSupplier && history ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-600">
                  {selectedSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{history.supplier.name}</h2>
                  <p className="text-xs text-slate-400">{history.supplier.phone || 'No HP tidak ada'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total Restock</p>
                  <p className="text-lg font-bold text-slate-900">
                    {history.supplier.total_restocks}x
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total Pembelian</p>
                  <p className="text-lg font-bold text-orange-600">
                    Rp {history.supplier.total_spent.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-3">Riwayat Restock</h3>
              {history.restocks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Belum ada riwayat restock</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {history.restocks.map(r => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-700">{r.product}</span>
                        <span className="text-sm font-bold text-slate-900">
                          Rp {r.total_cost.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{r.quantity} unit × Rp {r.cost_price.toLocaleString('id-ID')}</span>
                        <span>{r.created_at}</span>
                      </div>
                      {r.note && (
                        <p className="text-xs text-slate-400 italic mt-1">{r.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center h-48">
              <p className="text-3xl mb-2">🏭</p>
              <p className="text-sm font-medium text-slate-500">Pilih Supplier</p>
              <p className="text-xs text-slate-400 mt-1">Klik nama supplier untuk lihat riwayat restock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}