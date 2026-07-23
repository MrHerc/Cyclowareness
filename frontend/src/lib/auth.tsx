import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getSession, onSessionCleared, setSession } from './api'
import type { Session } from './types'

interface AuthContextValue {
  session: Session | null
  login: (email: string, password: string) => Promise<Session>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(getSession())

  // A 401 on any request — including a background poll — clears the stored
  // credential inside api.ts. Mirroring that into React state is what lets the
  // route guards redirect on the next render, instead of api.ts reloading the
  // whole document out from under an unsaved form.
  useEffect(() => onSessionCleared(() => setSessionState(null)), [])

  const login = useCallback(async (email: string, password: string) => {
    const s = await api.post<Session>('/api/auth/login', { email, password })
    setSession(s)
    setSessionState(s)
    return s
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    setSessionState(null)
  }, [])

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

export function homeFor(role: string): string {
  if (role === 'analyst') return '/'
  if (role === 'executive') return '/exec'
  return '/me'
}
