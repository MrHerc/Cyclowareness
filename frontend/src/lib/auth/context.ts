/**
 * The session context, apart from the provider and the hooks.
 *
 * Three modules for what reads like one thing, and the reason is mechanical:
 * Fast Refresh only works when a file exports components alone, so a context
 * or a hook living beside `<AuthProvider>` turns every edit to any of them
 * into a full page reload.
 */

import { createContext } from 'react'
import type { RoleName, Session } from '../../domain/types'
import type { Permission } from './permissions'

export interface AuthValue {
  session: Session | null
  role: RoleName | undefined
  isAuthenticated: boolean
  permissions: Set<Permission>
  can: (permission: Permission) => boolean
  login: (email: string, password: string) => Promise<Session>
  logout: () => void
  /**
   * Demo-only. Signs in as one of the seeded accounts so a presenter can move
   * between the three role experiences without typing credentials on stage.
   * It is a real sign-in, not a client-side role fake — the server still issues
   * the token and still enforces every permission.
   */
  switchRole: (email: string, password: string) => Promise<Session>
}

export const AuthContext = createContext<AuthValue | null>(null)
