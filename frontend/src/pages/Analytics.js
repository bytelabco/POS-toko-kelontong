import { useEffect, useState, Fragment } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

export default function Analytics() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }
  const [data, setData] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [breakdowns, setBreakdowns] = useState({})
  const [loadingBreakdown, setLoadingBreakdown] = useState(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: '', dateTo: '' })

  const [marginSearch, setMarginSearch] = useState('')          // ← baru
  const [showAllMargins, setShowAllMargins] = useState(false)   // ← baru
  const MARGIN_LIMIT = 10

  useEffect(() => {
    if (dateFrom) {
      if (!dateTo || dateTo < dateFrom) {
        setDateTo(dateFrom)
      }
    }
  }, [dateFrom])

  const fetchAnalytics = (from, to) => {
    const params = {}
    if (from) params.date_from = from
    if (to)   params.date_to   = to
    axios.get(`${process.env.REACT_APP_API_URL}/api/analytics`, { headers, params })
      .then(res => {
        setData(res.data)
        if (!from && !to) {
          setDateFrom(res.data.date_from)
          setDateTo(res.data.date_to)
        }
      })
      .catch(err => {
        if (err.response?.status === 403) setAccessDenied(true)
      })
  }

  useEffect(() => { fetchAnalytics() }, [])

  const handleFilter = () => {
    setAppliedFilters({ dateFrom, dateTo })
    setBreakdowns({})
    setExpandedId(null)
    fetchAnalytics(dateFrom, dateTo)
  }

  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedFilters({ dateFrom: '', dateTo: '' })
    setBreakdowns({})
    setExpandedId(null)
    fetchAnalytics()
  }

  const toggleExpand = async (product) => {
    if (!product.has_variants) return

    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)

    if (!breakdowns[product.id]) {
      setLoadingBreakdown(product.id)
      try {
        const params = {}
        if (appliedFilters.dateFrom) params.date_from = appliedFilters.dateFrom
        if (appliedFilters.dateTo)   params.date_to   = appliedFilters.dateTo
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/analytics/product/${product.id}/variant-breakdown`,
          { headers, params }
        )
        setBreakdowns(prev => ({ ...prev, [product.id]: res.data }))
      } finally {
        setLoadingBreakdown(null)
      }
    }
  }

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-3xl mb-3">🔒</p>
      <p className="text-slate-500 font-medium">Kamu tidak memiliki akses ke halaman ini</p>
      <p className="text-xs text-slate-400 mt-1">Hubungi manager atau owner untuk info lebih lanjut</p>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const formatRupiah = (value) => `Rp ${Number(value).toLocaleString('id-ID')}`

  // Filter & batasi Margin per Produk                          // ← baru
  const filteredMargins = data.product_margins.filter(p =>
    p.name.toLowerCase().includes(marginSearch.toLowerCase())
  )
  const displayedMargins = showAllMargins ? filteredMargins : filteredMargins.slice(0, MARGIN_LIMIT)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analisa</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan performa toko</p>
      </div>

      {/* Filter tanggal */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
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
          <div className="pb-2 text-slate-400">→</div>
          <div className="flex-1 min-w-[140px]">
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
          <button onClick={handleFilter}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all">
            Terapkan
          </button>
          {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
            <button onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
              Reset ke bulan ini
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          📅 Menampilkan data <span className="font-medium text-slate-600">{data.date_from}</span> s/d{' '}
          <span className="font-medium text-slate-600">{data.date_to}</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pendapatan',   value: formatRupiah(data.summary.total_revenue),  color: 'text-slate-900' },
          { label: 'Total HPP',          value: formatRupiah(data.summary.total_hpp),       color: 'text-red-500'   },
          { label: 'Total Profit',       value: formatRupiah(data.summary.total_profit),    color: 'text-emerald-600' },
          { label: 'Total Transaksi',    value: data.summary.total_transactions,            color: 'text-slate-900' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Grafik pendapatan & restock */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">📈 Tren Pendapatan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.daily_revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(value) => [formatRupiah(value), 'Pendapatan']} />
              <Line type="monotone" dataKey="revenue" stroke="#1e40af" strokeWidth={2}
                dot={{ fill: '#1e40af', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">📦 Biaya Restock</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.daily_restock}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(value) => [formatRupiah(value), 'Biaya Restock']} />
              <Bar dataKey="total_cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Margin per produk */}
      {data.product_margins.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">💰 Margin per Produk</h2>
            <span className="text-xs text-slate-400">Selalu menampilkan data terkini (tidak terpengaruh filter tanggal)</span>
          </div>

          {/* Search + info jumlah */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="Cari nama produk..."
                value={marginSearch}
                onChange={e => setMarginSearch(e.target.value)}
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
            <p className="text-xs text-slate-400 shrink-0">
              Menampilkan {displayedMargins.length} dari {filteredMargins.length} produk
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={Math.max(220, displayedMargins.length * 32)}>
              <BarChart data={displayedMargins} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                <Tooltip formatter={(value) => [`${value}%`, 'Margin']} />
                <Bar dataKey="margin" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Produk</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">HPP</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Harga Jual</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Profit/unit</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMargins.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 text-sm text-slate-600">Rp {p.cost_price.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-sm text-slate-600">Rp {p.price.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-sm font-semibold text-emerald-600">
                        Rp {p.profit.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${p.margin >= 20 ? 'bg-emerald-100 text-emerald-700'
                          : p.margin >= 10 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'}`}>
                          {p.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMargins.length > MARGIN_LIMIT && (
                <button onClick={() => setShowAllMargins(!showAllMargins)}
                  className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 transition-all">
                  {showAllMargins ? '↑ Tampilkan lebih sedikit' : `↓ Tampilkan semua (${filteredMargins.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Produk terlaris */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">🏆 Produk Terlaris (Qty)</h2>
          {data.top_products_by_qty.length === 0 ? (
            <p className="text-slate-400 text-sm">Belum ada data di rentang tanggal ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_products_by_qty} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                <Tooltip formatter={(value) => [value, 'Unit Terjual']} />
                <Bar dataKey="total_qty" fill="#1e40af" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">💰 Produk by Pendapatan</h2>
          {data.top_products_by_revenue.length === 0 ? (
            <p className="text-slate-400 text-sm">Belum ada data di rentang tanggal ini</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500">Produk</th>
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500">Qty</th>
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.top_products_by_revenue.map((p, i) => (
                  <Fragment key={p.id}>
                    <tr
                      onClick={() => toggleExpand(p)}
                      className={p.has_variants ? 'cursor-pointer hover:bg-slate-50 transition-all' : ''}
                    >
                      <td className="py-3 text-sm font-medium text-slate-900">
                        <span className="text-slate-400 mr-2">#{i + 1}</span>
                        {p.name}
                        {p.has_variants && (
                          <span className="ml-2 text-xs text-slate-400">
                            {expandedId === p.id ? '▲' : '▼'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-slate-600">{p.total_qty} unit</td>
                      <td className="py-3 text-sm font-semibold text-slate-900">
                        Rp {p.total_revenue.toLocaleString('id-ID')}
                      </td>
                    </tr>

                    {expandedId === p.id && (
                      <tr>
                        <td colSpan={3} className="bg-slate-50 px-3 py-2">
                          {loadingBreakdown === p.id ? (
                            <p className="text-xs text-slate-400 py-2">Memuat breakdown varian...</p>
                          ) : (breakdowns[p.id] || []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-2 pl-4">
                              Belum ada data varian di rentang tanggal ini
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-200">
                              {breakdowns[p.id].map((v, vi) => (
                                <div key={vi} className="flex justify-between items-center py-1.5 pl-4">
                                  <span className="text-xs text-slate-600">↳ {v.variant_name}</span>
                                  <span className="text-xs text-slate-500">{v.total_qty} unit</span>
                                  <span className="text-xs font-medium text-slate-700">
                                    Rp {v.total_revenue.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}