import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

export default function Dashboard() {
  const { token, role } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }
  const [data, setData] = useState(null)
  const [activeUsers, setActiveUsers] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:5000/api/dashboard', { headers })
      .then(res => setData(res.data))
  }, [])

  useEffect(() => {
    if (role === 'owner' || role === 'manager') {
      axios.get('http://localhost:5000/api/shifts/active-users', { headers })
        .then(res => setActiveUsers(res.data))
        .catch(() => setActiveUsers([]))
    }
  }, [role])

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const formatRupiah = (value) => `Rp ${Number(value).toLocaleString('id-ID')}`

  const roleLabel = { owner: 'Owner', manager: 'Manager', cashier: 'Kasir' }
  const roleBadgeColor = {
    owner:   'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    cashier: 'bg-slate-100 text-slate-700'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{data.tanggal}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Total Transaksi Hari Ini</p>
          <p className="text-3xl font-bold text-slate-900">{data.total_transaksi}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Total Pendapatan</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatRupiah(data.total_pendapatan)}
          </p>
          {data.perubahan_persen !== null && (
            <p className={`text-xs font-semibold mt-1 ${data.perubahan_persen >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {data.perubahan_persen >= 0 ? '▲' : '▼'} {Math.abs(data.perubahan_persen)}% dari kemarin
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Rata-rata per Transaksi</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatRupiah(data.rata_rata_transaksi)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Stok Menipis</p>
          <p className={`text-3xl font-bold ${data.stok_menipis.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {data.stok_menipis.length}
          </p>
        </div>
      </div>

      {/* Akun Aktif — cuma untuk owner & manager */}
      {(role === 'owner' || role === 'manager') && activeUsers && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-4">
            👥 {role === 'owner' ? 'Akun Aktif Sekarang' : 'Kasir Aktif Sekarang'}
          </h2>
          {activeUsers.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada yang sedang membuka shift</p>
          ) : (
            <div className="space-y-2">
              {activeUsers.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{u.username}</p>
                      <p className="text-xs text-slate-400">Sejak {u.opened_at}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor[u.role]}`}>
                    {roleLabel[u.role]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shift Aktif */}
      {data.shift_aktif && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-blue-900">🕐 Shift Aktif</h2>
            <span className="text-xs text-blue-500">Dibuka {data.shift_aktif.opened_at}</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-500">Kas Awal</p>
              <p className="text-lg font-bold text-blue-900">{formatRupiah(data.shift_aktif.opening_cash)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500">Penjualan Cash</p>
              <p className="text-lg font-bold text-blue-900">{formatRupiah(data.shift_aktif.total_cash_sales)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500">Transfer + QRIS</p>
              <p className="text-lg font-bold text-blue-900">
                {formatRupiah(data.shift_aktif.total_transfer_sales + data.shift_aktif.total_qris_sales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-500">Estimasi Kas Sekarang</p>
              <p className="text-lg font-bold text-emerald-700">{formatRupiah(data.shift_aktif.estimasi_kas_sekarang)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grafik 7 hari */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-900 mb-6">📈 Pendapatan 7 Hari Terakhir</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.ringkasan_7hari}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip formatter={(value) => [formatRupiah(value), 'Pendapatan']} />
            <Line type="monotone" dataKey="revenue" stroke="#1e40af" strokeWidth={2}
              dot={{ fill: '#1e40af', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stok Menipis */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">⚠️ Stok Menipis</h2>
        </div>
        <div className="p-6">
          {data.stok_menipis.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <span>✅</span>
              <p className="text-sm font-medium">Semua stok dalam kondisi aman</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-xs font-medium text-slate-400 pb-3">Produk</th>
                  <th className="text-xs font-medium text-slate-400 pb-3">Sisa Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.stok_menipis.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 text-sm text-slate-700">{p.name}</td>
                    <td className="py-3 text-sm font-bold text-red-500">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}