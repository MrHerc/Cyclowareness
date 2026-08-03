/**
 * Reading the session, apart from the provider that supplies it.
 *
 * Fast Refresh only works when a module exports components alone, so a file
 * exporting both `<AuthProvider>` and these hooks made every edit to either a
 * full page reload. Splitting them is the whole reason this file exists.
 */

import { useContext } from 'react'
import { AuthContext, type AuthValue } from './context'
import type { Permission } from './permissions'

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** Convenience for the common `can(...)` call in a component. */
export function usePermission(permission: Permission): boolean {
  return useAuth().can(permission)
}
