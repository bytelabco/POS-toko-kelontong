import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(sessionStorage.getItem('token'))
  const [username, setUsername] = useState(sessionStorage.getItem('username'))
  const [role, setRole] = useState(sessionStorage.getItem('role'))

  const login = (token, username, role) => {
    sessionStorage.setItem('token', token)
    sessionStorage.setItem('username', username)
    sessionStorage.setItem('role', role)
    setToken(token)
    setUsername(username)
    setRole(role)
  }

  const logout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    setToken(null)
    setUsername(null)
    setRole(null)
  }

  // Auto logout saat token expired (401)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          logout()
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  return (
    <AuthContext.Provider value={{ token, username, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)