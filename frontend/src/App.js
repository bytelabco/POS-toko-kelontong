import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SidebarProvider } from './context/SidebarContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Transactions from './pages/Transactions'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Users from './pages/Users'
import Restock from './pages/Restock'
import Categories from './pages/Categories'
import Vouchers from './pages/Vouchers'
import Shifts from './pages/Shifts'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'

export default function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/products" element={<Layout><Products /></Layout>} />
            <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
            <Route path="/history" element={<Layout><History /></Layout>} />
            <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
            <Route path="/users" element={<Layout><Users /></Layout>} />
            <Route path="/restock" element={<Layout><Restock /></Layout>} />
            <Route path="/categories" element={<Layout><Categories /></Layout>} />
            <Route path="/vouchers" element={<Layout><Vouchers /></Layout>} />
            <Route path="/shifts" element={<Layout><Shifts /></Layout>} />
            <Route path="/customers" element={<Layout><Customers /></Layout>} />
            <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </AuthProvider>
  )
}