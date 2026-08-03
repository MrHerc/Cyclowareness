/**
 * Who is signed in, and what they may do.
 *
 * The session lives in `localStorage` (written by the transport layer) and is
 * mirrored into React state here. The mirroring matters: a 401 on a background
 * poll clears the credential inside `client.ts`, and this provider is what turns
 * that into a re-render so the route guards can react — instead of the transport
 * layer reloading the document out from under an unsaved form.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext, type AuthValue } from './context'
import { api, getSession, onSessionCleared, setSession } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { Session } from '../../domain/types'
import { can, permissionsFor, type Permission } from './permissions'



export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession())
  const queryClient = useQueryClient()

  // The transport layer cleared the credential (expired token on any request).
  useEffect(() => onSessionCleared(() => setSessionState(null)), [])

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await api.post<Session>(
        endpoints.auth.login(),
        { email, password },
        { anonymous: true },
      )
      setSession(next)
      setSessionState(next)
      // A different identity sees different data. Never let the previous user's
      // cached answers survive a sign-in.
      queryClient.clear()
      return next
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    setSession(null)
    setSessionState(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthValue>(() => {
    const role = session?.role
    const permissions = permissionsFor(role)
    return {
      session,
      role,
      isAuthenticated: !!session,
      permissions,
      can: (permission: Permission) => can(role, permission),
      login,
      logout,
      switchRole: login,
    }
  }, [session, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
