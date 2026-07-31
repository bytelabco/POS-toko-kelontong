import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const sortVariants = (variants) => [...variants].sort((a, b) => {
  const ai = SIZE_ORDER.indexOf(a.variant_name.toUpperCase())
  const bi = SIZE_ORDER.indexOf(b.variant_name.toUpperCase())
  if (ai === -1 && bi === -1) return a.variant_name.localeCompare(b.variant_name)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
})

export default function Restock() {
  const { token, role } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({ product_id: '', quantity: '', cost_price: '', note: '' })
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:5000/api/products', { headers }).then(res => setProducts(res.data))
    axios.get('http://localhost:5000/api/restock', { headers }).then(res => setHistory(res.data))
    axios.get('http://localhost:5000/api/suppliers', { headers }).then(res => setSuppliers(res.data))
  }, [])

  useEffect(() => {
    const product = products.find(p => p.id === Number(form.product_id))
    if (product && form.quantity && form.cost_price) {
      const currentStock = selectedVariant ? selectedVariant.stock : product.stock
      const oldCost      = selectedVariant ? (selectedVariant.cost_price || 0) : (product.cost_price || 0)
      const newQty       = Number(form.quantity)
      const newCost      = Number(form.cost_price)
      const newAvgCost   = (currentStock * oldCost + newQty * newCost) / (currentStock + newQty)
      setPreview({
        product_name: product.name,
        variant_name: selectedVariant?.variant_name || null,
        old_stock:    currentStock,
        old_cost:     oldCost,
        new_stock:    currentStock + newQty,
        new_avg_cost: Math.round(newAvgCost),
        total_cost:   newQty * newCost
      })
    } else {
      setPreview(null)
    }
  }, [form.product_id, form.quantity, form.cost_price, selectedVariant])

  const fetchAll = () => {
    axios.get('http://localhost:5000/api/products', { headers }).then(res => setProducts(res.data))
    axios.get('http://localhost:5000/api/restock', { headers }).then(res => setHistory(res.data))
  }

  const handleSubmit = async () => {
    if (!form.product_id || !form.quantity || !form.cost_price)
      return alert('Isi semua field!')

    const product = products.find(p => p.id === Number(form.product_id))
    if (product?.variants?.length > 0 && !selectedVariant)
      return alert('Pilih varian produk terlebih dahulu!')

    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/restock', {
        product_id:  Number(form.product_id),
        quantity:    Number(form.quantity),
        cost_price:  Number(form.cost_price),
        note:        form.note,
        supplier_id: selectedSupplier ? selectedSupplier.id : null,
        variant_id:  selectedVariant ? selectedVariant.id : null
      }, { headers })
      setForm({ product_id: '', quantity: '', cost_price: '', note: '' })
      setProductSearch('')
      setSupplierSearch('')
      setSelectedSupplier(null)
      setSelectedVariant(null)
      setPreview(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Restock gagal')
    } finally {
      setLoading(false)
    }
  }

  const handleVoidRestock = async (id) => {
    if (!window.confirm('Batalkan restock ini? Stok akan dikurangi kembali dan avg cost akan dihitung ulang.')) return
    try {
      await axios.post(`http://localhost:5000/api/restock/${id}/void`, {}, { headers })
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membatalkan restock')
    }
  }

  const clearProduct = () => {
    setProductSearch('')
    setForm({ ...form, product_id: '' })
    setShowDropdown(false)
    setSelectedVariant(null)
  }

  const selectedProduct  = products.find(p => p.id === Number(form.product_id))
  const hasVariants      = selectedProduct?.variants?.length > 0
  const sortedVariants   = selectedProduct ? sortVariants(selectedProduct.variants) : []

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().startsWith(productSearch.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name, 'id'))

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().startsWith(supplierSearch.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name, 'id'))

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Restock Produk</h1>
        <p className="text-slate-500 text-sm mt-1">Tambah stok dengan perhitungan Average Cost otomatis</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Form restock */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">Form Restock</h2>
          <div className="space-y-5">

            {/* Search produk */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Produk</label>
              <div className="relative">
                <input
                  className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                  placeholder="Cari nama produk..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value)
                    setForm({ ...form, product_id: '' })
                    setSelectedVariant(null)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                {productSearch && (
                  <button type="button" onClick={clearProduct}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}

                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <button key={p.id} type="button"
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-all text-left"
                        onClick={() => {
                          setForm({ ...form, product_id: p.id })
                          setProductSearch(p.name)
                          setSelectedVariant(null)
                          setShowDropdown(false)
                        }}>
                        <div>
                          <span className="font-semibold text-slate-800">{p.name}</span>
                          {p.variants?.length > 0 && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                              {p.variants.length} varian
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500">stok: {p.stock}</span>
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-sm text-slate-400">
                        {productSearch ? 'Produk tidak ditemukan' : 'Ketik nama produk...'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Info produk terpilih */}
              {selectedProduct && (
                <div className="mt-2 px-4 py-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Stok saat ini</span>
                    <span className="text-xs font-bold text-slate-900">{selectedProduct.stock} unit</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Avg. Cost saat ini</span>
                    <span className="text-xs font-bold text-slate-900">
                      Rp {(selectedProduct.cost_price || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Harga jual</span>
                    <span className="text-xs font-bold text-slate-900">
                      Rp {selectedProduct.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pilih Varian — urut S/M/L/XL/XXL */}
            {hasVariants && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Varian <span className="text-red-400 font-normal text-xs">*wajib dipilih</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sortedVariants.map(v => (
                    <button key={v.id} type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border
                        ${selectedVariant?.id === v.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}`}>
                      {v.variant_name}
                      <span className="ml-1.5 opacity-70">({v.stock} unit)</span>
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <div className="mt-2 px-3 py-2 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 font-medium">
                      Varian dipilih: <span className="font-bold">{selectedVariant.variant_name}</span>
                      {' '}— Stok saat ini: {selectedVariant.stock} unit
                      {selectedVariant.cost_price > 0 && (
                        <span className="ml-2">| HPP: Rp {Math.round(selectedVariant.cost_price).toLocaleString('id-ID')}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Supplier <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              {selectedSupplier ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-orange-50 rounded-lg">
                    <p className="text-sm font-semibold text-orange-800">{selectedSupplier.name}</p>
                    {selectedSupplier.phone && (
                      <p className="text-xs text-orange-500">{selectedSupplier.phone}</p>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => { setSelectedSupplier(null); setSupplierSearch('') }}
                    className="text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                    placeholder="Cari supplier..."
                    value={supplierSearch}
                    onChange={e => {
                      setSupplierSearch(e.target.value)
                      setShowSupplierDropdown(true)
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 150)}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                  {supplierSearch && (
                    <button type="button"
                      onClick={() => { setSupplierSearch(''); setShowSupplierDropdown(false) }}
                      className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                      ✕
                    </button>
                  )}

                  {showSupplierDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredSuppliers.length > 0 ? filteredSuppliers.map(s => (
                        <button key={s.id} type="button"
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-all text-left"
                          onClick={() => {
                            setSelectedSupplier(s)
                            setSupplierSearch('')
                            setShowSupplierDropdown(false)
                          }}>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                          <span className="text-xs text-slate-400">{s.phone || 'No HP'}</span>
                        </button>
                      )) : (
                        <p className="px-4 py-3 text-sm text-slate-400">
                          {supplierSearch ? 'Supplier tidak ditemukan' : 'Ketik nama supplier...'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Jumlah Restock</label>
              <div className="relative">
                <input type="number" min="1"
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                  placeholder="Contoh: 100"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                />
                {form.quantity && (
                  <button type="button" onClick={() => setForm({ ...form, quantity: '' })}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Harga beli */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Harga Beli per Unit (Rp)</label>
              <div className="relative">
                <input type="number" min="0"
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                  placeholder="Contoh: 2500"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                />
                {form.cost_price && (
                  <button type="button" onClick={() => setForm({ ...form, cost_price: '' })}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Catatan <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <div className="relative">
                <input
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                  placeholder="Contoh: Beli dari supplier A"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                />
                {form.note && (
                  <button type="button" onClick={() => setForm({ ...form, note: '' })}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all">
              {loading ? 'Menyimpan...' : '📦 Simpan Restock'}
            </button>
          </div>
        </div>

        {/* Preview Average Cost */}
        <div>
          {preview ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">📊 Preview Average Cost</h2>
              <p className="text-sm text-slate-500 mb-4">
                Hasil perhitungan setelah restock{' '}
                <span className="font-bold text-slate-800">{preview.product_name}</span>
                {preview.variant_name && (
                  <span className="ml-1 text-purple-600 font-bold">({preview.variant_name})</span>
                )}:
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Stok sebelum</span>
                  <span className="text-sm font-bold text-slate-900">{preview.old_stock} unit</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Avg. Cost sebelum</span>
                  <span className="text-sm font-bold text-slate-900">
                    Rp {preview.old_cost.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Total biaya restock</span>
                  <span className="text-sm font-bold text-slate-900">
                    Rp {preview.total_cost.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-700">Stok setelah</span>
                    <span className="text-lg font-bold text-blue-700">{preview.new_stock} unit</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-700">Avg. Cost baru</span>
                    <span className="text-lg font-bold text-blue-700">
                      Rp {preview.new_avg_cost.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                {selectedProduct && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-emerald-700">Margin per unit</span>
                      <span className="text-sm font-bold text-emerald-700">
                        Rp {(selectedProduct.price - preview.new_avg_cost).toLocaleString('id-ID')}
                        {' '}({Math.round((selectedProduct.price - preview.new_avg_cost) / selectedProduct.price * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center h-48">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm font-bold text-slate-600">Preview Average Cost</p>
              <p className="text-xs text-slate-400 mt-1">Pilih produk, qty, dan harga beli untuk melihat preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Restock */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Riwayat Restock</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Waktu</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Produk</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Supplier</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Qty</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Harga Beli</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Total Biaya</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Status</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Catatan</th>
              {role === 'owner' && (
                <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-700">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan={role === 'owner' ? 9 : 8} className="px-6 py-12 text-center text-slate-400 text-sm">
                  Belum ada riwayat restock
                </td>
              </tr>
            ) : history.map(r => (
              <tr key={r.id} className={`hover:bg-slate-50 transition-all ${r.status === 'void' ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 text-sm text-slate-600">{r.created_at}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{r.product}</p>
                  {r.variant && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                      {r.variant}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {r.supplier
                    ? <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{r.supplier}</span>
                    : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                  <span className={r.status === 'void' ? 'line-through' : ''}>{r.quantity} unit</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  Rp {r.cost_price.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  <span className={r.status === 'void' ? 'line-through text-slate-400' : ''}>
                    Rp {r.total_cost.toLocaleString('id-ID')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${r.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {r.status === 'void' ? '✕ Dibatalkan' : '✓ Selesai'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400 italic">
                  {r.note || '-'}
                </td>
                {role === 'owner' && (
                  <td className="px-6 py-4">
                    {r.status !== 'void' && (
                      <button onClick={() => handleVoidRestock(r.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                        Batalkan
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}