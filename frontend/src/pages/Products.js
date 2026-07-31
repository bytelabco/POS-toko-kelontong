import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:5000/api/products'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const sortVariants = (variants) => [...variants].sort((a, b) => {
  const ai = SIZE_ORDER.indexOf(a.variant_name.toUpperCase())
  const bi = SIZE_ORDER.indexOf(b.variant_name.toUpperCase())
  if (ai === -1 && bi === -1) return a.variant_name.localeCompare(b.variant_name)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
})

function VariantCell({ variants }) {
  const [expanded, setExpanded] = useState(false)
  const sorted  = sortVariants(variants)
  const maxShow = 2
  const shown   = expanded ? sorted : sorted.slice(0, maxShow)
  const extra   = sorted.length - maxShow

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {shown.map(v => (
        <span key={v.id} className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-medium">
          {v.variant_name}
        </span>
      ))}
      {!expanded && extra > 0 && (
        <button onClick={() => setExpanded(true)}
          className="text-xs text-slate-400 hover:text-purple-600 font-medium transition-all">
          +{extra} lagi
        </button>
      )}
      {expanded && sorted.length > maxShow && (
        <button onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-all">
          Tutup
        </button>
      )}
    </div>
  )
}

function VariantStockCell({ variants, threshold }) {
  const [expanded, setExpanded] = useState(false)
  const sorted  = sortVariants(variants)
  const maxShow = 2
  const shown   = expanded ? sorted : sorted.slice(0, maxShow)
  const extra   = sorted.length - maxShow

  return (
    <div className="space-y-0.5">
      {shown.map(v => (
        <div key={v.id} className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">{v.variant_name}:</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            v.stock <= threshold ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {v.stock}
          </span>
        </div>
      ))}
      {!expanded && extra > 0 && (
        <button onClick={() => setExpanded(true)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-all">
          +{extra} lagi
        </button>
      )}
      {expanded && sorted.length > maxShow && (
        <button onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-all">
          Tutup
        </button>
      )}
    </div>
  )
}

function VariantHPPCell({ variants }) {
  const [expanded, setExpanded] = useState(false)
  const sorted  = sortVariants(variants)
  const maxShow = 2
  const shown   = expanded ? sorted : sorted.slice(0, maxShow)
  const extra   = sorted.length - maxShow

  return (
    <div className="space-y-0.5">
      {shown.map(v => (
        <div key={v.id} className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">{v.variant_name}:</span>
          <span className="text-xs font-medium text-slate-700">
            {v.cost_price > 0
              ? `Rp ${Math.round(v.cost_price).toLocaleString('id-ID')}`
              : <span className="text-slate-300">—</span>}
          </span>
        </div>
      ))}
      {!expanded && extra > 0 && (
        <button onClick={() => setExpanded(true)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-all">
          +{extra} lagi
        </button>
      )}
      {expanded && sorted.length > maxShow && (
        <button onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-all">
          Tutup
        </button>
      )}
    </div>
  )
}

function VariantMarginCell({ variants }) {
  const [expanded, setExpanded] = useState(false)
  const sorted  = sortVariants(variants)
  const maxShow = 2
  const shown   = expanded ? sorted : sorted.slice(0, maxShow)
  const extra   = sorted.length - maxShow

  return (
    <div className="space-y-0.5">
      {shown.map(v => (
        <div key={v.id} className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">{v.variant_name}:</span>
          {v.margin !== null ? (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              v.margin >= 20 ? 'bg-emerald-100 text-emerald-700'
              : v.margin >= 10 ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'}`}>
              {v.margin}%
            </span>
          ) : <span className="text-slate-300 text-xs">—</span>}
        </div>
      ))}
      {!expanded && extra > 0 && (
        <button onClick={() => setExpanded(true)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-all">
          +{extra} lagi
        </button>
      )}
      {expanded && sorted.length > maxShow && (
        <button onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-all">
          Tutup
        </button>
      )}
    </div>
  )
}

export default function Products() {
  const { token, role } = useAuth()                          // ← tambah role
  const headers = { Authorization: `Bearer ${token}` }

  const canManage = role === 'owner' || role === 'manager'    // ← baru: tambah/edit
  const canDelete = role === 'owner'                          // ← baru: hapus

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [form, setForm] = useState({
    name: '', price: '', stock: '', low_stock_threshold: 5,
    category_id: '', promo_price: '', promo_active: false
  })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [unitForm, setUnitForm] = useState({ unit_name: '', conversion: '', price: '' })
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [variantRows, setVariantRows] = useState([{ variant_name: '', price: '', stock: '' }])
  const [editingVariant, setEditingVariant] = useState(null)

  const fetchProducts = () => axios.get(API, { headers }).then(res => setProducts(res.data))
  const fetchCategories = () => axios.get('http://localhost:5000/api/categories', { headers })
    .then(res => setCategories(res.data))

  useEffect(() => {
    // eslint-disable-next-line
    fetchProducts(); fetchCategories()
  }, [])

  const toTitleCase = (str) => str.replace(/\b\w/g, char => char.toUpperCase())

  const handleSubmit = () => {
    if (!form.name || !form.price) return alert('Isi semua field!')
    const payload = {
      ...form,
      price:        Number(form.price),
      stock:        Number(form.stock || 0),
      category_id:  form.category_id ? Number(form.category_id) : null,
      promo_price:  form.promo_price ? Number(form.promo_price) : null,
      promo_active: form.promo_active
    }
    if (editId) {
      axios.put(`${API}/${editId}`, payload, { headers }).then(() => { fetchProducts(); resetForm() })
    } else {
      axios.post(API, payload, { headers }).then(() => { fetchProducts(); resetForm() })
    }
  }

  const handleEdit = (p) => {
    setForm({
      name:                p.name,
      price:               p.price,
      stock:               p.stock,
      low_stock_threshold: p.low_stock_threshold,
      category_id:         p.category_id || '',
      promo_price:         p.promo_price || '',
      promo_active:        p.promo_active || false
    })
    setCategorySearch(p.category_name || '')
    setEditId(p.id)
    setShowForm(true)
    setShowUnitForm(false)
    setShowVariantForm(false)
    setUnitForm({ unit_name: '', conversion: '', price: '' })
    setVariantRows([{ variant_name: '', price: '', stock: '' }])
    setEditingVariant(null)
  }

  const handleDelete = (id) => {
    if (window.confirm('Hapus produk ini?')) axios.delete(`${API}/${id}`, { headers }).then(fetchProducts)
  }

  const handleAddUnit = async () => {
    if (!unitForm.unit_name || !unitForm.conversion || !unitForm.price)
      return alert('Isi semua field unit!')
    try {
      await axios.post(`${API}/${editId}/units`, {
        unit_name:  unitForm.unit_name,
        conversion: Number(unitForm.conversion),
        price:      Number(unitForm.price)
      }, { headers })
      setUnitForm({ unit_name: '', conversion: '', price: '' })
      setShowUnitForm(false)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah unit')
    }
  }

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm('Hapus unit ini?')) return
    try {
      await axios.delete(`${API}/units/${unitId}`, { headers })
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus unit')
    }
  }

  const handleSaveAllVariants = async () => {
    const validRows = variantRows.filter(r => r.variant_name.trim())
    if (validRows.length === 0) return alert('Isi minimal 1 nama varian!')
    try {
      await Promise.all(validRows.map(row =>
        axios.post(`${API}/${editId}/variants`, {
          variant_name: row.variant_name,
          price:        row.price ? Number(row.price) : null,
          stock:        Number(row.stock || 0)
        }, { headers })
      ))
      setVariantRows([{ variant_name: '', price: '', stock: '' }])
      setShowVariantForm(false)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan varian')
    }
  }

  const handleUpdateVariant = async (variantId) => {
    try {
      await axios.put(`${API}/variants/${variantId}`, {
        variant_name: editingVariant.variant_name,
        price:        Number(editingVariant.price),
        stock:        Number(editingVariant.stock)
      }, { headers })
      setEditingVariant(null)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal update varian')
    }
  }

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('Hapus varian ini?')) return
    try {
      await axios.delete(`${API}/variants/${variantId}`, { headers })
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus varian')
    }
  }

  const resetForm = () => {
    setForm({ name: '', price: '', stock: '', low_stock_threshold: 5, category_id: '', promo_price: '', promo_active: false })
    setCategorySearch('')
    setShowCategoryDropdown(false)
    setEditId(null)
    setShowForm(false)
    setShowUnitForm(false)
    setShowVariantForm(false)
    setUnitForm({ unit_name: '', conversion: '', price: '' })
    setVariantRows([{ variant_name: '', price: '', stock: '' }])
    setEditingVariant(null)
  }

  const filtered = products.filter(p => {
    const matchSearch   = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = filterCategory === 'all' || String(p.category_id) === String(filterCategory)
    return matchSearch && matchCategory
  })

  const filteredCategories = categories
    .filter(c => categorySearch
      ? c.name.toLowerCase().startsWith(categorySearch.toLowerCase())
      : true
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))

  const editingProduct = products.find(p => p.id === editId)
  const hasVariants    = editingProduct?.variants?.length > 0
  const sortedEditingVariants = editingProduct ? sortVariants(editingProduct.variants) : []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produk</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} produk terdaftar</p>
        </div>
        {canManage && (                                        // ← baru
          <button onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
            {showForm ? 'Batal' : '+ Tambah Produk'}
          </button>
        )}
      </div>

      {/* Search & Filter */}
      {!showForm && (
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <input
              className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="Cari nama produk atau SKU..."
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
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all bg-white text-slate-700 cursor-pointer"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Form — hanya render kalau canManage, jaga-jaga meski tombol trigger-nya sudah disembunyikan */}
      {showForm && canManage && (                               // ← tambah canManage
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            {editId ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h2>
          <div className="grid grid-cols-2 gap-4">

            {/* Nama Produk */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Produk</label>
              <div className="relative">
                <input
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  placeholder="Contoh: Indomie Goreng"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: toTitleCase(e.target.value) })}
                />
                {form.name && (
                  <button type="button" onClick={() => setForm({ ...form, name: '' })}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Kategori</label>
              <div className="relative">
                <input
                  className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  placeholder="Cari kategori..."
                  value={categorySearch}
                  onChange={e => {
                    setCategorySearch(e.target.value)
                    setForm({ ...form, category_id: '' })
                    setShowCategoryDropdown(true)
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                {categorySearch && (
                  <button type="button"
                    onClick={() => { setCategorySearch(''); setForm({ ...form, category_id: '' }) }}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredCategories.length > 0 ? filteredCategories.map(c => (
                      <button key={c.id} type="button"
                        className="w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-all font-medium text-slate-800"
                        onClick={() => {
                          setForm({ ...form, category_id: c.id })
                          setCategorySearch(c.name)
                          setShowCategoryDropdown(false)
                        }}>
                        {c.name}
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-sm text-slate-400">Kategori tidak ditemukan</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Harga Jual */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Harga Jual (Rp)</label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                type="number" placeholder="Contoh: 3500"
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>

            {/* Stok */}
            {!hasVariants && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Stok</label>
                <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  type="number" placeholder="Contoh: 100"
                  value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
            )}

            {hasVariants && (
              <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600">📦 Stok dikelola per varian di bawah</p>
              </div>
            )}

            {/* Batas Stok */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Batas Stok Menipis
                {hasVariants && <span className="text-slate-400 ml-1">(berlaku per varian)</span>}
              </label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                type="number" placeholder="Contoh: 5"
                value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
            </div>

            {/* Harga Promo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Harga Promo (Rp) <span className="text-slate-300">(opsional)</span>
              </label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                type="number" placeholder="Contoh: 3000"
                value={form.promo_price} onChange={e => setForm({ ...form, promo_price: e.target.value })} />
            </div>

            {/* Toggle Promo */}
            {form.promo_price && (
              <div className="col-span-2 flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div
                  onClick={() => setForm({ ...form, promo_active: !form.promo_active })}
                  className={`relative w-11 h-6 rounded-full transition-all cursor-pointer ${form.promo_active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.promo_active ? 'left-6' : 'left-1'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {form.promo_active
                      ? <span className="text-emerald-600">✅ Promo Aktif</span>
                      : <span className="text-slate-400">Promo tidak aktif</span>}
                  </p>
                  {form.promo_price && form.price && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hemat Rp {(Number(form.price) - Number(form.promo_price)).toLocaleString('id-ID')}
                      {' '}({Math.round((Number(form.price) - Number(form.promo_price)) / Number(form.price) * 100)}% off)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
              {editId ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
            <button onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>

          {/* Kelola Unit & Varian */}
          {editId && editingProduct && (
            <div className="mt-6 pt-6 border-t border-slate-100">

              {/* Unit Produk */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Unit Produk</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola unit penjualan</p>
                  </div>
                  <button onClick={() => { setShowUnitForm(!showUnitForm); setShowVariantForm(false) }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-700 text-white rounded-lg transition-all">
                    {showUnitForm ? 'Batal' : '+ Tambah Unit'}
                  </button>
                </div>

                {showUnitForm && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Unit</label>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                          placeholder="Contoh: Lusin"
                          value={unitForm.unit_name}
                          onChange={e => setUnitForm({ ...unitForm, unit_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Konversi</label>
                        <input type="number" min="1"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                          placeholder="Contoh: 12"
                          value={unitForm.conversion}
                          onChange={e => setUnitForm({ ...unitForm, conversion: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Harga (Rp)</label>
                        <input type="number" min="0"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                          placeholder="Contoh: 33000"
                          value={unitForm.price}
                          onChange={e => setUnitForm({ ...unitForm, price: e.target.value })}
                        />
                      </div>
                    </div>
                    <button onClick={handleAddUnit}
                      className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-all">
                      Simpan Unit
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {editingProduct.units?.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {u.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">Default</span>
                        )}
                        <span className="text-sm font-medium text-slate-800">{u.unit_name}</span>
                        <span className="text-xs text-slate-400">× {u.conversion} satuan</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          Rp {u.price.toLocaleString('id-ID')}
                        </span>
                        {!u.is_default && (
                          <button onClick={() => handleDeleteUnit(u.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-all">
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Varian Produk */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Varian Produk</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Contoh: Size S/M/L, Warna Merah/Biru</p>
                  </div>
                  <button onClick={() => {
                    setShowVariantForm(!showVariantForm)
                    setVariantRows([{ variant_name: '', price: '', stock: '' }])
                    setShowUnitForm(false)
                  }}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all">
                    {showVariantForm ? 'Batal' : '+ Tambah Varian'}
                  </button>
                </div>

                {showVariantForm && (
                  <div className="bg-purple-50 rounded-lg p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3 px-1">
                      <p className="text-xs font-medium text-slate-500">Nama Varian</p>
                      <p className="text-xs font-medium text-slate-500">Harga (opsional)</p>
                      <p className="text-xs font-medium text-slate-500">Stok</p>
                    </div>
                    {variantRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-3 items-center">
                        <input
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-purple-500 bg-white"
                          placeholder="Contoh: Size S"
                          value={row.variant_name}
                          onChange={e => {
                            const updated = [...variantRows]
                            updated[idx].variant_name = e.target.value
                            setVariantRows(updated)
                          }}
                        />
                        <input type="number" min="0"
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-purple-500 bg-white"
                          placeholder={Number(form.price || 0).toLocaleString('id-ID')}
                          value={row.price}
                          onChange={e => {
                            const updated = [...variantRows]
                            updated[idx].price = e.target.value
                            setVariantRows(updated)
                          }}
                        />
                        <div className="flex gap-2 items-center">
                          <input type="number" min="0"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-purple-500 bg-white"
                            placeholder="0"
                            value={row.stock}
                            onChange={e => {
                              const updated = [...variantRows]
                              updated[idx].stock = e.target.value
                              setVariantRows(updated)
                            }}
                          />
                          {variantRows.length > 1 && (
                            <button type="button"
                              onClick={() => setVariantRows(variantRows.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-red-500 transition-all shrink-0">
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setVariantRows([...variantRows, { variant_name: '', price: '', stock: '' }])}
                        className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-white border border-purple-200 hover:bg-purple-50 rounded-lg transition-all">
                        + Tambah Baris
                      </button>
                      <button onClick={handleSaveAllVariants}
                        className="px-4 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all">
                        💾 Simpan Semua
                      </button>
                    </div>
                  </div>
                )}

                {sortedEditingVariants.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada varian</p>
                ) : (
                  <div className="space-y-2">
                    {sortedEditingVariants.map(v => (
                      <div key={v.id} className="px-4 py-3 bg-slate-50 rounded-lg">
                        {editingVariant?.id === v.id ? (
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                              value={editingVariant.variant_name}
                              onChange={e => setEditingVariant({ ...editingVariant, variant_name: e.target.value })}
                            />
                            <input type="number"
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                              value={editingVariant.price}
                              onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })}
                            />
                            <input type="number"
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                              value={editingVariant.stock}
                              onChange={e => setEditingVariant({ ...editingVariant, stock: e.target.value })}
                            />
                            <div className="col-span-3 flex gap-2 mt-1">
                              <button onClick={() => handleUpdateVariant(v.id)}
                                className="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded-lg">
                                Simpan
                              </button>
                              <button onClick={() => setEditingVariant(null)}
                                className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg">
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-slate-800">{v.variant_name}</span>
                              {v.sku && (
                                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  {v.sku}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                v.stock <= editingProduct.low_stock_threshold
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-700'}`}>
                                {v.stock} unit
                              </span>
                              {v.cost_price > 0 && (
                                <span className="text-xs text-slate-500">
                                  HPP: Rp {Math.round(v.cost_price).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-slate-900">
                                Rp {(v.price || 0).toLocaleString('id-ID')}
                              </span>
                              <button
                                onClick={() => setEditingVariant({ id: v.id, variant_name: v.variant_name, price: v.price, stock: v.stock })}
                                className="text-xs text-blue-500 hover:text-blue-700 transition-all">
                                Edit
                              </button>
                              <button onClick={() => handleDeleteVariant(v.id)}
                                className="text-xs text-red-500 hover:text-red-700 transition-all">
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabel */}
      {!showForm && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Nama Produk</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">SKU</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Kategori</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Harga Jual</th>
                {canManage && (                                 // ← baru
                  <>
                    <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">HPP</th>
                    <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Margin</th>
                  </>
                )}
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Stok</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Unit</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Varian</th>
                {(canManage || canDelete) && (                   // ← baru
                  <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 10 : 7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-all">

                  {/* Nama */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{p.name}</span>
                      {p.promo_active && p.promo_price && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">PROMO</span>
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {p.sku || '—'}
                    </span>
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    {p.category_name
                      ? <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{p.category_name}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>

                  {/* Harga Jual */}
                  <td className="px-6 py-4">
                    {p.promo_active && p.promo_price ? (
                      <div>
                        <p className="text-xs text-slate-400 line-through">Rp {p.price.toLocaleString('id-ID')}</p>
                        <p className="text-sm font-semibold text-emerald-600">Rp {p.promo_price.toLocaleString('id-ID')}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">Rp {p.price.toLocaleString('id-ID')}</p>
                    )}
                  </td>

                  {/* HPP & Margin — hanya untuk owner/manager */}
                  {canManage && (                                // ← baru
                    <>
                      <td className="px-6 py-4">
                        {p.variants && p.variants.length > 0
                          ? <VariantHPPCell variants={p.variants} />
                          : <span className="text-sm text-slate-600">
                              {p.cost_price > 0
                                ? `Rp ${Math.round(p.cost_price).toLocaleString('id-ID')}`
                                : <span className="text-slate-300">—</span>}
                            </span>}
                      </td>

                      <td className="px-6 py-4">
                        {p.variants && p.variants.length > 0
                          ? <VariantMarginCell variants={p.variants} />
                          : p.cost_price > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${(p.promo_active && p.promo_margin !== null ? p.promo_margin : p.margin) >= 20
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : (p.promo_active && p.promo_margin !== null ? p.promo_margin : p.margin) >= 10
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'}`}>
                                  {p.promo_active && p.promo_margin !== null ? p.promo_margin : p.margin}%
                                </span>
                                {p.promo_active && p.promo_margin !== null && (
                                  <span className="text-xs text-orange-500 font-medium">promo</span>
                                )}
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </>
                  )}

                  {/* Stok */}
                  <td className="px-6 py-4">
                    {p.variants && p.variants.length > 0
                      ? <VariantStockCell variants={p.variants} threshold={p.low_stock_threshold} />
                      : <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${p.stock <= p.low_stock_threshold ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {p.stock} unit
                        </span>}
                  </td>

                  {/* Unit */}
                  <td className="px-6 py-4">
                    {p.units && p.units.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.units.map(u => (
                          <span key={u.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {u.unit_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Satuan</span>
                    )}
                  </td>

                  {/* Varian */}
                  <td className="px-6 py-4">
                    {p.variants && p.variants.length > 0
                      ? <VariantCell variants={p.variants} />
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>

                  {/* Aksi — Edit untuk owner/manager, Hapus khusus owner */}
                  {(canManage || canDelete) && (                 // ← baru
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {canManage && (
                          <button onClick={() => handleEdit(p)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(p.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}