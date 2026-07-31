import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const { token } = useAuth()
  const { collapsed } = useSidebar()
  const [activeShift, setActiveShift] = useState(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingCash, setClosingCash] = useState('')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!token) return
    axios.get('http://localhost:5000/api/shifts/active', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setActiveShift(res.data)).catch(() => {})
  }, [token])

  const handleCloseShift = async () => {
    setClosing(true)
    try {
      await axios.post('http://localhost:5000/api/shifts/close',
        { closing_cash: Number(closingCash) || 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowCloseModal(false)
      setActiveShift(null)
      setClosingCash('')
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menutup shift')
    } finally {
      setClosing(false)
    }
  }

  if (!token) return <Navigate to="/login" />

  return (
    <div className="flex">
      <Sidebar />
      <main className={`flex-1 min-h-screen bg-slate-50 p-8 transition-all duration-300
        ${collapsed ? 'ml-16' : 'ml-60'}`}>

        {activeShift && (
          <div className="mb-6 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">
              ⚠️ Shift kamu masih terbuka sejak <b>{activeShift.opened_at}</b>. Jangan lupa ditutup setelah selesai bekerja.
            </p>
            <button onClick={() => setShowCloseModal(true)}
              className="ml-4 shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-all">
              Tutup Shift Sekarang
            </button>
          </div>
        )}

        {children}
      </main>

      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h2 className="font-bold text-slate-900 mb-1">Tutup Shift</h2>
            <p className="text-xs text-slate-500 mb-4">
              Dibuka {activeShift?.opened_at} · Kas awal Rp {activeShift?.opening_cash?.toLocaleString('id-ID')}
            </p>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Kas Akhir (hitung fisik)</label>
            <input type="number" autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 mb-4"
              placeholder="Masukkan jumlah kas fisik..."
              value={closingCash}
              onChange={e => setClosingCash(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleCloseShift} disabled={closing}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all">
                {closing ? 'Menutup...' : 'Tutup Shift'}
              </button>
              <button onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all">
                Batal, lanjut kerja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}