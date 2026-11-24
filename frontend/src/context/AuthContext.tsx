import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import type { AuthTokens, AuthUser } from '../types/monitoring'

interface AuthContextValue {
  authenticated: boolean
  user: AuthUser | null
  userLoading: boolean
  userError: string
  refreshUser: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string, institutionId: string) => Promise<string>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(window.localStorage.getItem('accessToken')))
  const queryClient = useQueryClient()
  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get<{ data: AuthUser }>('/auth/me')
      return response.data.data
    },
    enabled: authenticated,
    retry: false,
  })
  const user = userQuery.data ?? null
  const userLoading = authenticated && userQuery.isPending
  const userError = userQuery.isError ? 'Could not load your account permissions. Check the API connection and retry.' : ''

  async function refreshUser() {
    await queryClient.refetchQueries({ queryKey: ['auth', 'me'] })
  }

  useEffect(() => {
    const expire = () => {
      setAuthenticated(false)
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    }
    window.addEventListener('auth:expired', expire)
    return () => window.removeEventListener('auth:expired', expire)
  }, [queryClient])

  async function saveSession(path: string, body: Record<string, string>) {
    const response = await api.post<{ data: AuthTokens & { user: AuthUser } }>(path, body)
    window.localStorage.setItem('accessToken', response.data.data.accessToken)
    window.localStorage.setItem('refreshToken', response.data.data.refreshToken)
    queryClient.setQueryData(['auth', 'me'], response.data.data.user)
    setAuthenticated(true)
  }

  async function signIn(email: string, password: string) {
    await saveSession('/auth/login', { email, password })
  }

  async function signUp(fullName: string, email: string, password: string, institutionId: string) {
    const response = await api.post<{ data: { message: string } }>('/auth/register', { fullName, email, password, institutionId })
    return response.data.data.message
  }

  async function signOut() {
    try {
      await api.post('/auth/logout', { refreshToken: window.localStorage.getItem('refreshToken') })
    } finally {
      window.localStorage.removeItem('accessToken')
      window.localStorage.removeItem('refreshToken')
      setAuthenticated(false)
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    }
  }

  return <AuthContext.Provider value={{ authenticated, user, userLoading, userError, refreshUser, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}