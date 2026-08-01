/**
 * The two preferences this build can actually honour.
 *
 * A settings page full of toggles that do nothing is worse than a short one
 * that is true, so there are exactly two entries here and each is honest about
 * its reach.
 *
 * **The navigation rail** is a stored startup preference. The shell reads it
 * when it mounts, which is once per document, so changing it here decides how
 * the rail comes up next time rather than animating it now — and the switch on
 * this page says exactly that instead of appearing to have failed.
 *
 * **Reduced motion** is deliberately not a preference at all. The token layer
 * collapses every animation under the operating system's own
 * `prefers-reduced-motion`, which means an in-app duplicate would be a second
 * switch that could disagree with the first. This module reads the OS setting
 * so the page can state what is in force; it cannot set it, and does not claim
 * to.
 */

import { useEffect, useState } from 'react'

/**
 * Mirrors the key `AppShell` writes. Duplicated rather than exported from the
 * shell on purpose: the shell owns the live state, this page owns the stored
 * default, and a settings screen reaching into a layout component for a
 * constant is a dependency in the wrong direction.
 */
const NAV_COLLAPSED_KEY = 'cyclo.nav-collapsed'

export function readNavCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Returns false when the preference could not be stored, so the UI can say so. */
export function writeNavCollapsed(collapsed: boolean): boolean {
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, String(collapsed))
    return true
  } catch {
    // Private browsing or a full quota. A preference that cannot be persisted
    // is still a valid preference — it just will not survive the reload.
    return false
  }
}

/**
 * Whether the viewer's system asks for reduced motion.
 *
 * Listened to rather than read once: someone turning it on mid-demonstration
 * should see the page's statement change with it, not a stale claim.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}
