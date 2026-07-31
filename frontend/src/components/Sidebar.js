import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'

export default function Sidebar() {
  const { username, role, logout } = useAuth()
  const { collapsed, setCollapsed } = useSidebar()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const menus = [
    { path: '/',             icon: '📊', label: 'Dashboard',   roles: ['owner', 'manager', 'cashier'] },
    { path: '/products',     icon: '📦', label: 'Produk',      roles: ['owner', 'manager', 'cashier'] },
    { path: '/restock',      icon: '🔄', label: 'Restock',     roles: ['owner', 'manager']             },
    { path: '/transactions', icon: '🧾', label: 'Transaksi',   roles: ['owner', 'manager', 'cashier'] },
    { path: '/history',      icon: '📋', label: 'Riwayat',     roles: ['owner', 'manager']             },
    { path: '/analytics',    icon: '📈', label: 'Analisa',     roles: ['owner', 'manager']             },
    { path: '/categories',   icon: '🏷️', label: 'Kategori',    roles: ['owner', 'manager']             },
    { path: '/customers',    icon: '👤', label: 'Customer',    roles: ['owner', 'manager', 'cashier'] },
    { path: '/users',        icon: '👥', label: 'Kelola User', roles: ['owner']                        },
    { path: '/vouchers',     icon: '🎟️', label: 'Voucher',     roles: ['owner', 'manager']             },
    { path: '/shifts',       icon: '🕐', label: 'Shift',       roles: ['owner', 'manager', 'cashier'] },
    { path: '/suppliers',    icon: '🏭', label: 'Supplier',    roles: ['owner', 'manager']             },
  ]

  const filteredMenus = menus.filter(m => m.roles.includes(role))

  const roleBadge = {
    owner:   { label: 'Owner',   color: 'bg-blue-500'   },
    manager: { label: 'Manager', color: 'bg-emerald-500' },
    cashier: { label: 'Kasir',   color: 'bg-slate-500'  },
  }

  return (
    <div className={`fixed left-0 top-0 h-screen bg-slate-900 flex flex-col z-10 transition-all duration-300
      ${collapsed ? 'w-16' : 'w-60'}`}>

      {/* Brand + toggle */}
      <div className={`flex items-center border-b border-slate-700 px-4 py-5
        ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base">ByteLab Toko</p>
            <p className="text-slate-400 text-xs mt-0.5">Management System</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white transition-all p-1 rounded-lg hover:bg-slate-800">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredMenus.map(m => (
          <NavLink key={m.path} to={m.path} end={m.path === '/'}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-all
              ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5'}
              ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
            }
            title={collapsed ? m.label : ''}>
            <span className="text-base shrink-0">{m.icon}</span>
            {!collapsed && m.label}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className={`border-t border-slate-700 py-4 space-y-3
        ${collapsed ? 'px-2' : 'px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{username}</p>
              <span className={`inline-block text-white text-xs px-2 py-0.5 rounded-full mt-0.5 ${roleBadge[role]?.color}`}>
                {roleBadge[role]?.label}
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {username?.[0]?.toUpperCase()}
            </div>
          </div>
        )}

        <button onClick={handleLogout}
          className={`w-full py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-all
            ${collapsed ? 'px-0 text-center text-xs' : ''}`}>
          {collapsed ? '↩' : 'Logout'}
        </button>
      </div>
    </div>
  )
}