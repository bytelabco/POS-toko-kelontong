import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const PAYMENT_METHODS = [
  { value: 'cash',     label: '💵 Cash'    },
  { value: 'transfer', label: '🏦 Transfer' },
  { value: 'qris',     label: '📱 QRIS'     },
]

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const sortVariants = (variants) => [...variants].sort((a, b) => {
  const ai = SIZE_ORDER.indexOf(a.variant_name.toUpperCase())
  const bi = SIZE_ORDER.indexOf(b.variant_name.toUpperCase())
  if (ai === -1 && bi === -1) return a.variant_name.localeCompare(b.variant_name)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
})

export default function Transactions() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_id: '', variant_id: '' }])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [productSearches, setProductSearches] = useState([''])
  const [showDropdowns, setShowDropdowns] = useState([false])
  const [transactionDiscount, setTransactionDiscount] = useState('')
  const [transactionDiscountType, setTransactionDiscountType] = useState('none')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherData, setVoucherData] = useState(null)
  const [voucherError, setVoucherError] = useState('')
  const [checkingVoucher, setCheckingVoucher] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/products`, { headers })
      .then(res => setProducts(res.data))
    axios.get(`${process.env.REACT_APP_API_URL}/api/customers`, { headers })
      .then(res => setCustomers(res.data))
  }, [])

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    if (field === 'product_id') {
      updated[index]['unit_id']    = ''
      updated[index]['variant_id'] = ''
    }
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: '', unit_id: '', variant_id: '' }])
    setProductSearches([...productSearches, ''])
    setShowDropdowns([...showDropdowns, false])
  }

  const removeItem = (i) => {
    setItems(items.filter((_, idx) => idx !== i))
    setProductSearches(productSearches.filter((_, idx) => idx !== i))
    setShowDropdowns(showDropdowns.filter((_, idx) => idx !== i))
  }

  const clearProductSearch = (i) => {
    const updatedSearches = [...productSearches]
    updatedSearches[i] = ''
    setProductSearches(updatedSearches)
    updateItem(i, 'product_id', '')
    const updatedDropdowns = [...showDropdowns]
    updatedDropdowns[i] = false
    setShowDropdowns(updatedDropdowns)
  }

  const getProduct = (id) => products.find(p => p.id === Number(id))

  const getSelectedUnit = (item) => {
    const p = getProduct(item.product_id)
    if (!p || !item.unit_id) return null
    return p.units?.find(u => u.id === Number(item.unit_id)) || null
  }

  const getSelectedVariant = (item) => {
    const p = getProduct(item.product_id)
    if (!p || !item.variant_id) return null
    return p.variants?.find(v => v.id === Number(item.variant_id)) || null
  }

  const getItemPrice = (item) => {
    const p = getProduct(item.product_id)
    if (!p) return 0

    // Kalau ada varian → pakai harga varian
    const variant = getSelectedVariant(item)
    if (variant) return variant.price || p.price

    // Kalau ada unit → pakai harga unit
    const unit = getSelectedUnit(item)
    if (unit) {
      if (unit.is_default && p.promo_active && p.promo_price) return p.promo_price
      return unit.price
    }

    return p.promo_active && p.promo_price ? p.promo_price : p.price
  }

  const getItemSubtotal = (item) => {
    if (!item.quantity) return 0
    return getItemPrice(item) * Number(item.quantity)
  }

  const subtotalKeseluruhan = items.reduce((sum, item) => sum + getItemSubtotal(item), 0)

  const getTransactionDiscount = () => {
    if (transactionDiscountType === 'voucher' && voucherData)
      return voucherData.discount_amount
    if (transactionDiscountType === 'percent')
      return subtotalKeseluruhan * Number(transactionDiscount || 0) / 100
    if (transactionDiscountType === 'fixed')
      return Number(transactionDiscount || 0)
    return 0
  }

  const totalHarga = Math.max(0, subtotalKeseluruhan - getTransactionDiscount())

  const kembalian = paymentMethod === 'cash'
    ? Math.max(0, Number(cashReceived) - totalHarga)
    : 0

  const kurang = paymentMethod === 'cash' && cashReceived
    ? Math.max(0, totalHarga - Number(cashReceived))
    : 0

  const handleCheckVoucher = async () => {
    setCheckingVoucher(true)
    setVoucherError('')
    setVoucherData(null)
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/vouchers/check`, {
        code:  voucherCode,
        total: subtotalKeseluruhan
      }, { headers })
      setVoucherData(res.data)
    } catch (err) {
      setVoucherError(err.response?.data?.error || 'Voucher tidak valid')
    } finally {
      setCheckingVoucher(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  )

  const handleSubmit = async () => {
    if (items.length === 0) return alert('Tambahkan produk dulu!')
    if (items.some(i => !i.product_id)) return alert('Pilih produk untuk semua item!')
    if (items.some(i => !i.quantity || Number(i.quantity) < 1)) return alert('Isi quantity untuk semua item!')

    // Validasi varian wajib dipilih
    for (const item of items) {
      const p = getProduct(item.product_id)
      if (p?.variants?.length > 0 && !item.variant_id) {
        return alert(`Pilih varian untuk produk ${p.name}!`)
      }
    }

    if (paymentMethod === 'cash' && (!cashReceived || Number(cashReceived) < totalHarga)) {
      return alert('Uang diterima kurang dari total!')
    }
    setLoading(true)
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/transactions`, {
        items: items.map(i => ({
          product_id: Number(i.product_id),
          quantity:   Number(i.quantity),
          unit_id:    i.unit_id    ? Number(i.unit_id)    : null,
          variant_id: i.variant_id ? Number(i.variant_id) : null
        })),
        payment_method:            paymentMethod,
        cash_received:             paymentMethod === 'cash' ? Number(cashReceived) : totalHarga,
        transaction_discount:      transactionDiscountType !== 'voucher' ? Number(transactionDiscount || 0) : 0,
        transaction_discount_type: transactionDiscountType !== 'voucher' ? transactionDiscountType : 'none',
        voucher_code:              transactionDiscountType === 'voucher' && voucherData ? voucherCode : null,
        customer_id:               selectedCustomer ? selectedCustomer.id : null
      }, { headers })

      setReceipt(res.data)
      setItems([{ product_id: '', quantity: '', unit_id: '', variant_id: '' }])
      setProductSearches([''])
      setShowDropdowns([false])
      setCashReceived('')
      setPaymentMethod('cash')
      setTransactionDiscount('')
      setTransactionDiscountType('none')
      setVoucherCode('')
      setVoucherData(null)
      setVoucherError('')
      setSelectedCustomer(null)
      setCustomerSearch('')
    } catch (err) {
      alert(err.response?.data?.error || 'Transaksi gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">

      {/* Modal Struk */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 max-h-screen overflow-y-auto">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #struk, #struk * { visibility: visible; }
                #struk { position: fixed; top: 0; left: 0; width: 80mm; }
              }
            `}</style>

            <div id="struk" className="p-6">
              <div className="text-center mb-4">
                <p className="font-bold text-lg text-slate-900">ByteLab Toko</p>
                <p className="text-xs text-slate-500">Management System</p>
                <div className="border-t border-dashed border-slate-300 mt-3 mb-3" />
                <p className="text-xs text-slate-500">#{receipt.transaction_id} · {receipt.created_at}</p>
                {receipt.customer_name && (
                  <p className="text-xs text-slate-600 font-medium mt-1">👤 {receipt.customer_name}</p>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.product_name}</p>
                      <p className="text-xs text-slate-400">
                        {item.quantity} {item.unit_name || 'Satuan'} × Rp {item.price.toLocaleString('id-ID')}
                      </p>
                      {item.discount_amount > 0 && (
                        <p className="text-xs text-red-400">
                          Promo: -Rp {item.discount_amount.toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5">
                {receipt.discount_amount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Subtotal</span>
                      <span className="text-xs text-slate-600">
                        Rp {receipt.subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-red-500">
                        {receipt.voucher_code ? `Voucher (${receipt.voucher_code})` : 'Diskon'}
                      </span>
                      <span className="text-xs text-red-500">
                        -Rp {receipt.discount_amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-slate-900">Total</span>
                  <span className="text-sm font-bold text-slate-900">
                    Rp {receipt.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Metode Bayar</span>
                  <span className="text-xs font-medium text-slate-700">
                    {receipt.payment_method.toUpperCase()}
                  </span>
                </div>
                {receipt.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Uang Diterima</span>
                      <span className="text-xs font-medium text-slate-700">
                        Rp {receipt.cash_received.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-100">
                      <span className="text-sm font-bold text-emerald-600">Kembalian</span>
                      <span className="text-sm font-bold text-emerald-600">
                        Rp {receipt.change.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 mt-4 pt-3 text-center">
                <p className="text-xs text-slate-400">Terima kasih telah berbelanja!</p>
                <p className="text-xs text-slate-400">Powered by ByteLab</p>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
                🖨️ Print Struk
              </button>
              <button onClick={() => setReceipt(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
                ✕ Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Transaksi Baru</h1>
        <p className="text-slate-500 text-sm mt-1">Catat penjualan produk</p>
      </div>

      {/* Pilih Customer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm shrink-0">👤 Customer:</span>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 px-3 py-1.5 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-blue-500">{selectedCustomer.phone}</p>
                )}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                className="text-slate-300 hover:text-slate-500 transition-all">
                ✕
              </button>
            </div>
          ) : (
            <div className="relative flex-1">
              <input
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Cari customer... (opsional)"
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              {showCustomerDropdown && customerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                    <button key={c.id} type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-all text-left"
                      onClick={() => {
                        setSelectedCustomer(c)
                        setCustomerSearch('')
                        setShowCustomerDropdown(false)
                      }}>
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.phone || 'No HP'}</span>
                    </button>
                  )) : (
                    <p className="px-4 py-3 text-sm text-slate-400">Customer tidak ditemukan</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Item list */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <h2 className="font-semibold text-slate-900 mb-4">Item Pembelian</h2>
        <div className="space-y-4">
          {items.map((item, i) => {
            const p               = getProduct(item.product_id)
            const hasVariants     = p?.variants?.length > 0
            const sortedVariants  = p ? sortVariants(p.variants) : []

            const filteredProducts = products.filter(prod =>
              prod.name.toLowerCase().startsWith((productSearches[i] || '').toLowerCase())
            ).sort((a, b) => a.name.localeCompare(b.name, 'id'))

            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-3">

                  {/* Search produk */}
                  <div className="relative flex-1">
                    <input
                      className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                      placeholder="Cari produk..."
                      value={productSearches[i] || ''}
                      onChange={e => {
                        const updated = [...productSearches]
                        updated[i] = e.target.value
                        setProductSearches(updated)
                        updateItem(i, 'product_id', '')
                        const updatedDropdowns = [...showDropdowns]
                        updatedDropdowns[i] = true
                        setShowDropdowns(updatedDropdowns)
                      }}
                      onFocus={() => {
                        const updated = [...showDropdowns]
                        updated[i] = true
                        setShowDropdowns(updated)
                      }}
                      onBlur={() => setTimeout(() => {
                        const updated = [...showDropdowns]
                        updated[i] = false
                        setShowDropdowns(updated)
                      }, 150)}
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                    {productSearches[i] && (
                      <button type="button" onClick={() => clearProductSearch(i)}
                        className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                        ✕
                      </button>
                    )}

                    {showDropdowns[i] && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts.length > 0 ? filteredProducts.map(prod => (
                          <button key={prod.id} type="button"
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-all text-left"
                            onClick={() => {
                              updateItem(i, 'product_id', prod.id)
                              const updatedSearches = [...productSearches]
                              updatedSearches[i] = prod.name
                              setProductSearches(updatedSearches)
                              const updatedDropdowns = [...showDropdowns]
                              updatedDropdowns[i] = false
                              setShowDropdowns(updatedDropdowns)
                            }}>
                            <div>
                              <span className="font-medium text-slate-800">{prod.name}</span>
                              {prod.variants?.length > 0 && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                  {prod.variants.length} varian
                                </span>
                              )}
                              {prod.promo_active && prod.promo_price && (
                                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">PROMO</span>
                              )}
                            </div>
                            <div className="text-right">
                              {prod.promo_active && prod.promo_price ? (
                                <div>
                                  <p className="text-xs text-slate-400 line-through">Rp {prod.price.toLocaleString('id-ID')}</p>
                                  <p className="text-xs text-emerald-600 font-semibold">Rp {prod.promo_price.toLocaleString('id-ID')}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">Rp {prod.price.toLocaleString('id-ID')}</p>
                              )}
                              <p className="text-xs text-slate-400">stok: {prod.stock}</p>
                            </div>
                          </button>
                        )) : (
                          <p className="px-4 py-3 text-sm text-slate-400">
                            {productSearches[i] ? 'Produk tidak ditemukan' : 'Ketik nama produk...'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <input type="number" min="1"
                    className="w-20 px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-center outline-none focus:border-blue-500 transition-all"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                  />

                  {/* Subtotal */}
                  <div className="w-28 text-right">
                    {p && item.quantity ? (
                      <p className="text-sm font-semibold text-slate-700">
                        Rp {getItemSubtotal(item).toLocaleString('id-ID')}
                      </p>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </div>

                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      ✕
                    </button>
                  )}
                </div>

                {/* Pilih Varian — wajib kalau produk punya varian */}
                {p && hasVariants && (
                  <div className="pl-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-slate-400 shrink-0">Varian:</span>
                      {!item.variant_id && (
                        <span className="text-xs text-red-400 font-medium">*wajib dipilih</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {sortedVariants.map(v => (
                        <button key={v.id} type="button"
                          onClick={() => updateItem(i, 'variant_id', v.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all border
                            ${Number(item.variant_id) === v.id
                              ? 'bg-purple-600 text-white border-purple-600'
                              : v.stock === 0
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-purple-400'}`}
                          disabled={v.stock === 0}>
                          {v.variant_name}
                          <span className="ml-1 opacity-70">({v.stock})</span>
                        </button>
                      ))}
                    </div>
                    {item.variant_id && (() => {
                      const selectedV = sortedVariants.find(v => v.id === Number(item.variant_id))
                      return selectedV ? (
                        <p className="text-xs text-purple-600 mt-1">
                          Rp {(selectedV.price || p.price).toLocaleString('id-ID')} per unit
                        </p>
                      ) : null
                    })()}
                  </div>
                )}

                {/* Pilih Unit — hanya kalau tidak ada varian */}
                {p && !hasVariants && p.units && p.units.length > 1 && (
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs text-slate-400 shrink-0">Unit:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {p.units.map(u => (
                        <button key={u.id} type="button"
                          onClick={() => updateItem(i, 'unit_id', u.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all border
                            ${Number(item.unit_id) === u.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                          {u.unit_name} — Rp {(
                            u.is_default && p.promo_active && p.promo_price
                              ? p.promo_price
                              : u.price
                          ).toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={addItem}
          className="mt-4 w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700 text-sm rounded-lg transition-all">
          + Tambah Item
        </button>
      </div>

      {/* Pembayaran */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Pembayaran</h2>

        {/* Metode bayar */}
        <div className="flex gap-2 mb-5">
          {PAYMENT_METHODS.map(m => (
            <button key={m.value}
              onClick={() => { setPaymentMethod(m.value); setCashReceived('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border
                ${paymentMethod === m.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Subtotal & Diskon */}
        <div className="space-y-3 py-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">Subtotal</span>
            <span className="text-sm font-medium text-slate-700">
              Rp {subtotalKeseluruhan.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex gap-2">
            {['none', 'diskon', 'voucher'].map(type => (
              <button key={type}
                onClick={() => {
                  setTransactionDiscountType(type === 'diskon' ? 'percent' : type)
                  setTransactionDiscount('')
                  setVoucherCode('')
                  setVoucherData(null)
                  setVoucherError('')
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border
                  ${(transactionDiscountType === 'none' && type === 'none') ||
                    (['percent', 'fixed'].includes(transactionDiscountType) && type === 'diskon') ||
                    (transactionDiscountType === 'voucher' && type === 'voucher')
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                {type === 'none' ? 'Tidak ada' : type === 'diskon' ? '🏷️ Diskon' : '🎟️ Voucher'}
              </button>
            ))}
          </div>

          {['percent', 'fixed'].includes(transactionDiscountType) && (
            <div className="flex items-center gap-2">
              <select
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none bg-white text-slate-600"
                value={transactionDiscountType}
                onChange={e => { setTransactionDiscountType(e.target.value); setTransactionDiscount('') }}>
                <option value="percent">%</option>
                <option value="fixed">Rp</option>
              </select>
              <input type="number" min="0"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
                placeholder={transactionDiscountType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                value={transactionDiscount}
                onChange={e => setTransactionDiscount(e.target.value)}
              />
              {transactionDiscount && (
                <span className="text-sm text-red-500 font-medium shrink-0">
                  -Rp {getTransactionDiscount().toLocaleString('id-ID')}
                </span>
              )}
            </div>
          )}

          {transactionDiscountType === 'voucher' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 font-mono uppercase tracking-widest"
                  placeholder="Masukkan kode voucher..."
                  value={voucherCode}
                  onChange={e => {
                    setVoucherCode(e.target.value.toUpperCase())
                    setVoucherData(null)
                    setVoucherError('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleCheckVoucher()}
                />
                <button
                  onClick={handleCheckVoucher}
                  disabled={!voucherCode || checkingVoucher}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
                  {checkingVoucher ? '...' : 'Pakai'}
                </button>
              </div>
              {voucherError && <p className="text-xs text-red-500">❌ {voucherError}</p>}
              {voucherData && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div>
                    <p className="text-xs font-bold text-emerald-700">✅ Voucher {voucherData.code} berhasil!</p>
                    <p className="text-xs text-emerald-600">
                      Diskon {voucherData.discount_type === 'percent'
                        ? `${voucherData.discount_value}%`
                        : `Rp ${voucherData.discount_value.toLocaleString('id-ID')}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    -Rp {voucherData.discount_amount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          )}

          {getTransactionDiscount() > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-500">Total Diskon</span>
              <span className="text-sm font-semibold text-red-500">
                -Rp {getTransactionDiscount().toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-3 border-t border-slate-200">
          <span className="text-slate-700 font-bold">Total</span>
          <span className="text-2xl font-bold text-slate-900">
            Rp {totalHarga.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Cash input */}
        {paymentMethod === 'cash' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Uang Diterima</label>
              <div className="relative">
                <input type="number"
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  placeholder="Masukkan jumlah uang..."
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
                {cashReceived && (
                  <button type="button" onClick={() => setCashReceived('')}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[totalHarga, 5000, 10000, 20000, 50000, 100000]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .sort((a, b) => a - b)
                .filter(v => v >= totalHarga)
                .slice(0, 4)
                .map(nominal => (
                  <button key={nominal}
                    onClick={() => setCashReceived(nominal)}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all">
                    Rp {nominal.toLocaleString('id-ID')}
                  </button>
                ))
              }
            </div>

            {cashReceived && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                kurang > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <span className={`text-sm font-medium ${kurang > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {kurang > 0 ? '⚠️ Kurang' : '✅ Kembalian'}
                </span>
                <span className={`text-lg font-bold ${kurang > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  Rp {(kurang > 0 ? kurang : kembalian).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Transfer / QRIS */}
        {paymentMethod !== 'cash' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              {paymentMethod === 'transfer' ? '🏦 Pembayaran via Transfer Bank' : '📱 Pembayaran via QRIS'}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Pastikan pembayaran sudah diterima sebelum klik Simpan
            </p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-5 py-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all">
          {loading ? 'Menyimpan...' : '💾 Simpan Transaksi'}
        </button>
      </div>
    </div>
  )
}