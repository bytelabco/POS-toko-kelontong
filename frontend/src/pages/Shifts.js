import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Shifts() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [activeShift, setActiveShift] = useState(null)
  const [shifts, setShifts] = useState([])
  const [shiftsAccessDenied, setShiftsAccessDenied] = useState(false)   // ← baru
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [closeResult, setCloseResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)

  const fetchAll = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/shifts/active`, { headers })
      .then(res => setActiveShift(res.data))
    axios.get(`${process.env.REACT_APP_API_URL}/api/shifts`, { headers })
      .then(res => setShifts(res.data))
      .catch(err => {                                                   // ← baru
        if (err.response?.status === 403) setShiftsAccessDenied(true)
      })
  }

  useEffect(() => { fetchAll() }, [])

  const handleOpenShift = async () => {
    setLoading(true)
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/shifts/open`, {
        opening_cash: Number(openingCash || 0)
      }, { headers })
      setOpeningCash('')
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membuka shift')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseShift = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/shifts/close`, {
        closing_cash: Number(closingCash || 0),
        notes
      }, { headers })
      setCloseResult(res.data)
      setClosingCash('')
      setNotes('')
      setShowCloseForm(false)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menutup shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Laporan Shift</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola shift kasir dan rekap kas harian</p>
      </div>

      {/* Close Result Modal */}
      {closeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <div className="text-center mb-6">
              <p className="text-3xl mb-2">✅</p>
              <h2 className="text-lg font-bold text-slate-900">Shift Berhasil Ditutup!</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Modal Awal</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.opening_cash.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">💵 Total Cash</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.total_cash.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">🏦 Total Transfer</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.total_transfer.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">📱 Total QRIS</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.total_qris.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Transaksi</span>
                <span className="text-sm font-medium text-slate-700">
                  {closeResult.total_transactions} transaksi
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Penjualan</span>
                <span className="text-sm font-bold text-slate-900">
                  Rp {closeResult.total_sales.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Kas Akhir (Aktual)</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.closing_cash.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Kas Seharusnya</span>
                <span className="text-sm font-medium text-slate-700">
                  Rp {closeResult.expected_cash.toLocaleString('id-ID')}
                </span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${
                closeResult.cash_difference === 0 ? 'bg-emerald-50'
                : closeResult.cash_difference > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <span className={`text-sm font-bold ${
                  closeResult.cash_difference === 0 ? 'text-emerald-700'
                  : closeResult.cash_difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {closeResult.cash_difference === 0 ? '✅ Kas Sesuai'
                  : closeResult.cash_difference > 0 ? '📈 Kas Lebih' : '⚠️ Kas Kurang'}
                </span>
                <span className={`text-sm font-bold ${
                  closeResult.cash_difference === 0 ? 'text-emerald-700'
                  : closeResult.cash_difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {closeResult.cash_difference > 0 ? '+' : ''}
                  Rp {closeResult.cash_difference.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <button onClick={() => setCloseResult(null)}
              className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-all">
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Status Shift */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Status Shift</h2>

          {activeShift ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-600">Shift Sedang Berjalan</span>
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dibuka oleh</span>
                  <span className="font-medium text-slate-700">{activeShift.opened_by}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Waktu buka</span>
                  <span className="font-medium text-slate-700">{activeShift.opened_at}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Modal awal</span>
                  <span className="font-medium text-slate-700">
                    Rp {activeShift.opening_cash.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {!showCloseForm ? (
                <button onClick={() => setShowCloseForm(true)}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all">
                  🔒 Tutup Shift
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Jumlah Kas Akhir (Rp)
                    </label>
                    <input type="number" min="0"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                      placeholder="Hitung dan masukkan total kas..."
                      value={closingCash}
                      onChange={e => setClosingCash(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Catatan <span className="text-slate-300">(opsional)</span>
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                      placeholder="Contoh: Shift sore, tidak ada masalah"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCloseShift} disabled={loading}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
                      {loading ? 'Menutup...' : '🔒 Konfirmasi Tutup'}
                    </button>
                    <button onClick={() => { setShowCloseForm(false); setClosingCash(''); setNotes('') }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-sm font-semibold text-slate-400">Tidak Ada Shift Aktif</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Modal Awal Kas (Rp)
                  </label>
                  <input type="number" min="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 transition-all"
                    placeholder="Contoh: 500000"
                    value={openingCash}
                    onChange={e => setOpeningCash(e.target.value)}
                  />
                </div>
                <button onClick={handleOpenShift} disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
                  {loading ? 'Membuka...' : '🔓 Buka Shift'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panduan */}
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6">
          <h2 className="font-semibold text-slate-700 mb-3">💡 Panduan Shift</h2>
          <div className="space-y-2 text-xs text-slate-500">
            <p>1. <span className="font-medium text-slate-700">Buka shift</span> di awal jam kerja — masukkan modal kas awal</p>
            <p>2. <span className="font-medium text-slate-700">Lakukan transaksi</span> seperti biasa — semua otomatis tercatat ke shift</p>
            <p>3. <span className="font-medium text-slate-700">Tutup shift</span> di akhir jam kerja — hitung fisik uang di laci kas</p>
            <p>4. <span className="font-medium text-slate-700">Sistem akan menghitung</span> selisih kas secara otomatis</p>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-1">Rumus selisih kas:</p>
            <p className="text-xs text-slate-500 font-mono">Kas Akhir - (Modal Awal + Total Cash)</p>
            <p className="text-xs text-slate-400 mt-1">+ = kas lebih &nbsp;|&nbsp; 0 = sesuai &nbsp;|&nbsp; - = kas kurang</p>
          </div>
        </div>
      </div>

      {/* Riwayat Shift */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Riwayat Shift</h2>
        </div>

        {shiftsAccessDenied ? (                                          
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            🔒 Kamu tidak memiliki akses untuk melihat riwayat shift toko
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Waktu</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Kasir</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Modal Awal</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Cash</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Transfer</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">QRIS</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Transaksi</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Selisih Kas</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400 text-sm">
                    Belum ada riwayat shift
                  </td>
                </tr>
              ) : shifts.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-700">{s.opened_at}</p>
                    {s.closed_at && <p className="text-xs text-slate-400">{s.closed_at}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-800">{s.opened_by}</p>
                    {s.closed_by && s.closed_by !== s.opened_by && (
                      <p className="text-xs text-slate-400">Tutup: {s.closed_by}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    Rp {s.opening_cash.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {s.total_cash_sales > 0 ? `Rp ${s.total_cash_sales.toLocaleString('id-ID')}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {s.total_transfer_sales > 0 ? `Rp ${s.total_transfer_sales.toLocaleString('id-ID')}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {s.total_qris_sales > 0 ? `Rp ${s.total_qris_sales.toLocaleString('id-ID')}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.total_transactions} txn</td>
                  <td className="px-6 py-4">
                    {s.cash_difference !== null ? (
                      <span className={`text-sm font-semibold ${
                        s.cash_difference === 0 ? 'text-emerald-600'
                        : s.cash_difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {s.cash_difference > 0 ? '+' : ''}Rp {s.cash_difference.toLocaleString('id-ID')}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${s.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.status === 'open' ? '🟢 Aktif' : '⚫ Selesai'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}