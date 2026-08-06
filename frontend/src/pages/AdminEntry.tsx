/**
 * `/admin` — leads somewhere every time it is opened.
 *
 * THE BUG THIS FIXES. `/admin` was wrapped in `RedirectIfAuthenticated`, so
 * anyone who already had a session was bounced away before the page rendered.
 * From the outside that is indistinguishable from "there is no admin page",
 * which is exactly how it was reported.
 *
 * * not signed in            -> the phone + one-time-code door
 * * signed in as an analyst  -> the console, which IS the admin portal
 * * signed in as anyone else -> their own home
 *
 * The redirect still exists for the signed-in cases, but it now depends on WHO
 * you are rather than merely on having a session — and an analyst lands on the
 * portal rather than being told, in effect, that the address is empty.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/useAuth'
import { homeFor } from '../lib/auth/permissions'
import AdminLogin from './AdminLogin'

export default function AdminEntry() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) return <AdminLogin />
  if (role === 'analyst') return <Navigate to="/command-center" replace />
  return <Navigate to={homeFor(role)} replace />
}
