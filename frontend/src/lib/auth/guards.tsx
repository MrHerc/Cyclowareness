/**
 * Route guards.
 *
 * A guard sends someone somewhere they *can* go rather than showing them a
 * dead end. `replace` is used everywhere so the back button never bounces a
 * user between a page they cannot see and the redirect away from it.
 */

import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { homeFor, type Permission } from './permissions'

export function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    // Remember where they were headed so sign-in can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactElement
}) {
  const { isAuthenticated, role, can } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!can(permission)) return <Navigate to={homeFor(role)} replace />
  return children
}

/** Sends an already-authenticated visitor away from /login and /register. */
export function RedirectIfAuthenticated({ children }: { children: ReactElement }) {
  const { isAuthenticated, role } = useAuth()
  if (isAuthenticated) return <Navigate to={homeFor(role)} replace />
  return children
}
