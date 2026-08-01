/**
 * `/` is not a screen — it is "wherever this role starts".
 *
 * An analyst lands on the command centre, an executive on the posture read, an
 * employee on their own portal. Sending everyone to one shared home and letting
 * a permission guard bounce two of the three roles off it would make the first
 * thing a new user sees a redirect away from a page they were never meant to
 * reach.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthProvider'
import { homeFor } from '../lib/auth/permissions'

export function RootRedirect() {
  const { role } = useAuth()
  return <Navigate to={homeFor(role)} replace />
}
