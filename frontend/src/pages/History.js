import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function History() {
  const { token, role } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [transactions, setTransactions] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '', dateTo: '', status: 'all'
  })

  useEffect(() => {
    if (dateFrom) {
      if (!dateTo || dateTo < dateFrom) {
        setDateTo(dateFrom)
      }
    }
  }, [dateFrom])

  const fetchHistory = () => {
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    axios.get('http://localhost:5000/api/history', { headers, params })
      .then(res => setTransactions(res.data))
  }

  useEffect(() => { fetchHistory() }, [])

  const handleFilter = () => {
    setAppliedFilters(prev => ({ ...prev, dateFrom, dateTo }))
    fetchHistory()
  }

  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setFilterStatus('all')
    setSearch('')
    setAppliedFilters({ dateFrom: '', dateTo: '', status: 'all' })
    axios.get('http://localhost:5000/api/history', { headers })
      .then(res => setTransactions(res.data))
  }

  const handleVoid = async (id) => {
    if (!window.confirm('Batalkan transaksi ini? Stok akan dikembalikan.')) return
    try {
      await axios.post(`http://localhost:5000/api/transactions/${id}/void`, {}, { headers })
      fetchHistory()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membatalkan transaksi')
    }
  }

  const handleExport = (type) => {
    const params = new URLSearchParams()
    if (appliedFilters.dateFrom)         params.append('date_from', appliedFilters.dateFrom)
    if (appliedFilters.dateTo)           params.append('date_to', appliedFilters.dateTo)
    if (appliedFilters.status !== 'all') params.append('status', appliedFilters.status)

    fetch(`http://localhost:5000/api/export/${type}?${params.toString()}`, { headers })
      .then(res => res.blob())
      .then(blob => {
        const a    = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = `laporan_${new Date().toISOString().slice(0,10)}.${type === 'excel' ? 'xlsx' : 'pdf'}`
        a.click()
        URL.revokeObjectURL(a.href)
        setShowExport(false)
      })
  }

  const filtered = transactions.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchSearch = !search || t.items.some(i =>
      i.product_name.toLowerCase().includes(search.toLowerCase())
    )
    return matchStatus && matchSearch
  })

  const totalFiltered = filtered
    .filter(t => t.status !== 'void')
    .reduce((sum, t) => sum + t.total_price, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Transaksi</h1>
          <p className="text-slate-500 text-sm mt-1">{transactions.length} transaksi tercatat</p>
        </div>

        {role === 'owner' && (
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all">
              ⬇️ Export
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showExport ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExport && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Filter yang diterapkan:</p>
                  <p className="text-xs text-slate-600">
                    📅 {appliedFilters.dateFrom
                      ? `${appliedFilters.dateFrom} → ${appliedFilters.dateTo || appliedFilters.dateFrom}`
                      : 'Semua tanggal'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    📋 {appliedFilters.status === 'all' ? 'Semua status'
                      : appliedFilters.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                  </p>
                </div>
                <button onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                  <span className="text-lg">📊</span>
                  <div className="text-left">
                    <p className="font-medium">Excel (.xlsx)</p>
                    <p className="text-xs text-slate-400">Spreadsheet</p>
                  </div>
                </button>
                <button onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all border-t border-slate-100">
                  <span className="text-lg">📄</span>
                  <div className="text-left">
                    <p className="font-medium">PDF (.pdf)</p>
                    <p className="text-xs text-slate-400">Laporan cetak</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 space-y-3">

        {/* Row 1 — Search + X */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1">
            <input
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="Cari nama produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            {search && (
              <button type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2 — Date range + X */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Dari tanggal</label>
              <div className="relative">
                <input type="date"
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
                {dateFrom && (
                  <button type="button"
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 text-slate-400">→</div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Sampai tanggal</label>
              <div className="relative">
                <input type="date"
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                  value={dateTo}
                  min={dateFrom}
                  onChange={e => setDateTo(e.target.value)}
                />
                {dateTo && (
                  <button type="button"
                    onClick={() => setDateTo('')}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleFilter}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all">
              Terapkan
            </button>
            {(dateFrom || dateTo || search || filterStatus !== 'all') && (
              <button onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">Transaksi Ditampilkan</p>
          <p className="text-xl font-bold text-slate-900">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">Total Pendapatan</p>
          <p className="text-xl font-bold text-slate-900">Rp {totalFiltered.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">Transaksi Dibatalkan</p>
          <p className="text-xl font-bold text-red-500">
            {filtered.filter(t => t.status === 'void').length}
          </p>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">#</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Waktu</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Item</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Total</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Status</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                  Tidak ada transaksi yang sesuai filter
                </td>
              </tr>
            ) : filtered.map(t => (
              <>
                <tr key={t.id} className={`hover:bg-slate-50 transition-all ${t.status === 'void' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 text-sm text-slate-400">#{t.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{t.created_at}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{t.items.length} item</td>
                  <td className={`px-6 py-4 text-sm font-semibold ${t.status === 'void' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    Rp {t.total_price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${t.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {t.status === 'void' ? '✕ Dibatalkan' : '✓ Selesai'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                        {expanded === t.id ? 'Tutup' : 'Lihat'}
                      </button>
                      {role === 'owner' && t.status !== 'void' && (
                        <button onClick={() => handleVoid(t.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                          Batalkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === t.id && (
                  <tr key={`${t.id}-detail`}>
                    <td colSpan="6" className="px-6 pb-4 bg-slate-50">
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Produk</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Qty</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Harga Satuan</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {t.items.map((item, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2.5 text-sm text-slate-700">{item.product_name}</td>
                                <td className="px-4 py-2.5 text-sm text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-sm text-slate-600">
                                  Rp {item.price_at_time.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                                  Rp {(item.price_at_time * item.quantity).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}