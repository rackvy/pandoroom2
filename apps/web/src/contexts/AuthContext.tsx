'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { LK_API_BASE } from '../lib/lk-api'

interface ClientUser {
  id: string
  phone: string
  name: string
  email: string | null
  birthday: string | null
}

interface AuthContextType {
  client: ClientUser | null
  token: string | null
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
  updateClient: (data: Partial<ClientUser>) => void
}

const AuthContext = createContext<AuthContextType>({
  client: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  updateClient: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, restore token from localStorage and fetch profile
  useEffect(() => {
    const savedToken = localStorage.getItem('lk_token')
    const savedClient = localStorage.getItem('lk_client')
    if (savedToken && savedClient) {
      setToken(savedToken)
      try {
        setClient(JSON.parse(savedClient))
      } catch {}
      // Refresh profile from server
      fetch(`${LK_API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(r => {
          if (!r.ok) throw new Error('Unauthorized')
          return r.json()
        })
        .then(data => {
          const c = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            email: data.email,
            birthday: data.birthday,
          }
          setClient(c)
          localStorage.setItem('lk_client', JSON.stringify(c))
        })
        .catch(() => {
          // Token invalid, clear
          localStorage.removeItem('lk_token')
          localStorage.removeItem('lk_client')
          setToken(null)
          setClient(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const res = await fetch(`${LK_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Ошибка авторизации')
    }
    const data = await res.json()
    const clientUser = {
      id: data.client.id,
      phone: data.client.phone,
      name: data.client.name,
      email: data.client.email,
      birthday: data.client.birthday,
    }
    setToken(data.accessToken)
    setClient(clientUser)
    localStorage.setItem('lk_token', data.accessToken)
    localStorage.setItem('lk_client', JSON.stringify(clientUser))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setClient(null)
    localStorage.removeItem('lk_token')
    localStorage.removeItem('lk_client')
  }, [])

  const updateClient = useCallback((data: Partial<ClientUser>) => {
    setClient(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      localStorage.setItem('lk_client', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ client, token, isLoading, login, logout, updateClient }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
