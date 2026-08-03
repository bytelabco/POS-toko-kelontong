import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Vouchers() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [vouchers, setVouchers] = useState([])
  const [form, setForm] = useState({
    code: '', discount_type: 'percent', discount_value: '',
    min_transaction: '', max_uses: '', expired_at: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const fetchVouchers = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/vouchers`, { headers })
      .then(res => setVouchers(res.data))
  }

  useEffect(() => { fetchVouchers() }, [])

  const toUpperCase = (str) => str.toUpperCase().replace(/\s/g, '')

  const resetForm = () => {
    setForm({ code: '', discount_type: 'percent', discount_value: '', min_transaction: '', max_uses: '', expired_at: '' })
    setEditId(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.code || !form.discount_value) return setError('Isi kode dan nilai diskon!')
    setLoading(true)
    setError('')
    try {
      if (editId) {
        await axios.put(`${process.env.REACT_APP_API_URL}/api/vouchers/${editId}`, {
          discount_type:   form.discount_type,
          discount_value:  Number(form.discount_value),
          min_transaction: Number(form.min_transaction || 0),
          max_uses:        form.max_uses ? Number(form.max_uses) : null,
          expired_at:      form.expired_at || null
        }, { headers })
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/vouchers`, {
          ...form,
          code:            form.code.toUpperCase(),
          discount_value:  Number(form.discount_value),
          min_transaction: Number(form.min_transaction || 0),
          max_uses:        form.max_uses ? Number(form.max_uses) : null,
          expired_at:      form.expired_at || null
        }, { headers })
      }
      resetForm()
      fetchVouchers()
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan voucher')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (v) => {
    setForm({
      code:            v.code,
      discount_type:   v.discount_type,
      discount_value:  v.discount_value,
      min_transaction: v.min_transaction || '',
      max_uses:        v.max_uses || '',
      expired_at:      v.expired_at || ''
    })
    setEditId(v.id)
    setShowForm(true)
    setError('')
  }

  const handleToggle = async (id) => {
    await axios.patch(`${process.env.REACT_APP_API_URL}/api/vouchers/${id}/toggle`, {}, { headers })
    fetchVouchers()
  }

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Hapus voucher "${code}"?`)) return
    await axios.delete(`${process.env.REACT_APP_API_URL}/api/vouchers/${id}`, { headers })
    fetchVouchers()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Voucher</h1>
          <p className="text-slate-500 text-sm mt-1">{vouchers.length} voucher terdaftar</p>
        </div>
        <button onClick={() => { showForm ? resetForm() : setShowForm(true) }}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
          {showForm ? 'Batal' : '+ Buat Voucher'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            {editId ? `Edit Voucher — ${form.code}` : 'Buat Voucher Baru'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Kode Voucher
                {editId && <span className="text-slate-300 ml-1">(tidak bisa diubah)</span>}
              </label>
              <input
                className={`w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all font-mono uppercase ${editId ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                placeholder="Contoh: DISKON10"
                value={form.code}
                disabled={!!editId}
                onChange={e => setForm({ ...form, code: toUpperCase(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipe Diskon</label>
              <select
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all bg-white"
                value={form.discount_type}
                onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Nilai Diskon {form.discount_type === 'percent' ? '(%)' : '(Rp)'}
              </label>
              <input type="number" min="0"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder={form.discount_type === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Minimum Transaksi (Rp)</label>
              <input type="number" min="0"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: 20000 (kosongkan jika tidak ada)"
                value={form.min_transaction}
                onChange={e => setForm({ ...form, min_transaction: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Maks. Penggunaan <span className="text-slate-300">(opsional)</span>
              </label>
              <input type="number" min="1"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Kosongkan = tidak terbatas"
                value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Expired Date <span className="text-slate-300">(opsional)</span>
              </label>
              <input type="date"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                value={form.expired_at}
                onChange={e => setForm({ ...form, expired_at: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit} disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
              {loading ? 'Menyimpan...' : editId ? '💾 Simpan Perubahan' : '🎟️ Buat Voucher'}
            </button>
            <button onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel Voucher */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Kode</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Diskon</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Min. Transaksi</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Penggunaan</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Expired</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Status</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm">
                  Belum ada voucher
                </td>
              </tr>
            ) : vouchers.map(v => {
              const usagePercent = v.max_uses ? Math.min(100, (v.used_count / v.max_uses) * 100) : 0
              return (
                <tr key={v.id} className={`hover:bg-slate-50 transition-all ${!v.is_active || v.is_expired ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-sm">
                      {v.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-emerald-600">
                      {v.discount_type === 'percent'
                        ? `${v.discount_value}%`
                        : `Rp ${v.discount_value.toLocaleString('id-ID')}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {v.min_transaction > 0
                      ? `Rp ${v.min_transaction.toLocaleString('id-ID')}`
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 shrink-0">
                        {v.used_count} / {v.max_uses || '∞'}
                      </span>
                      {v.max_uses && (
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-red-400' : usagePercent >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {v.expired_at ? (
                      <div>
                        <p className="text-sm text-slate-600">{v.expired_at}</p>
                        {v.is_expired && (
                          <span className="text-xs font-medium text-red-500">⏰ Sudah lewat</span>
                        )}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(v.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all
                        ${v.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {v.is_active ? '✓ Aktif' : '✕ Nonaktif'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(v)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(v.id, v.code)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}