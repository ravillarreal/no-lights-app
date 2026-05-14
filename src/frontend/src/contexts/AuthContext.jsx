import { createContext, useContext, useState } from 'react'
import { googleLogout } from '@react-oauth/google'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('no_lights_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  function login(userData) {
    setUser(userData)
    localStorage.setItem('no_lights_user', JSON.stringify(userData))
  }

  function logout() {
    googleLogout()
    setUser(null)
    localStorage.removeItem('no_lights_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
