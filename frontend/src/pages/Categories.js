import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Categories() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchCategories = () => {
    axios.get('http://localhost:5000/api/categories', { headers })
      .then(res => setCategories(res.data))
  }

  useEffect(() => { fetchCategories() }, [])

  const toTitleCase = (str) => str.replace(/\b\w/g, c => c.toUpperCase())

  const handleAdd = async () => {
    if (!newCategory.trim()) return setError('Nama kategori tidak boleh kosong!')
    setLoading(true)
    setError('')
    try {
      await axios.post('http://localhost:5000/api/categories',
        { name: newCategory.trim() }, { headers })
      setNewCategory('')
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah kategori')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus kategori "${name}"? Produk dengan kategori ini akan kehilangan kategorinya.`)) return
    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`, { headers })
      fetchCategories()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus kategori')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Kategori</h1>
        <p className="text-slate-500 text-sm mt-1">{categories.length} kategori terdaftar</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Form tambah */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-fit">
          <h2 className="font-semibold text-slate-900 mb-4">Tambah Kategori Baru</h2>
          <div className="space-y-3">
            <div className="relative">
              <input
                className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Contoh: Minuman Segar"
                value={newCategory}
                onChange={e => {
                  setNewCategory(toTitleCase(e.target.value))
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              {newCategory && (
                <button type="button"
                  onClick={() => { setNewCategory(''); setError('') }}
                  className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                  ✕
                </button>
              )}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={handleAdd} disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
              {loading ? 'Menyimpan...' : '+ Tambah Kategori'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-600 mb-2">💡 Tips</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Nama kategori akan otomatis Title Case</li>
              <li>• Tekan Enter untuk menambah cepat</li>
              <li>• Hapus kategori tidak akan menghapus produk</li>
            </ul>
          </div>
        </div>

        {/* List kategori */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Daftar Kategori</h2>
          </div>
          {categories.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              Belum ada kategori
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {categories
                .sort((a, b) => a.name.localeCompare(b.name, 'id'))
                .map(c => (
                  <li key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {c.name.charAt(0)}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                    </div>
                    <button onClick={() => handleDelete(c.id, c.name)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                      Hapus
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}