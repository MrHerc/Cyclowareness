/**
 * The palette's "Recent" group — where this person has actually been.
 *
 * Only destinations that exist in `app/navigation.ts` are remembered. That is a
 * deliberate limit rather than an oversight: a detail URL like `/loops/412` has
 * no label the palette could show, and "Recent: /loops/412" is a worse entry
 * than no entry. It also means a remembered route always has a permission, so a
 * stored history cannot survive a role switch into a link the new role cannot
 * open — the palette re-filters on every render.
 */

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { allNavItems } from '../../app/navigation'

const STORAGE_KEY = 'cyclo.recent-routes'
const LIMIT = 5

export interface RecentRoute {
  /** The nav item's `id`, so the palette can re-resolve label, icon and permission. */
  id: string
  to: string
}

function read(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is RecentRoute =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentRoute).id === 'string' &&
        typeof (entry as RecentRoute).to === 'string',
    )
  } catch {
    return []
  }
}

function write(routes: RecentRoute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes))
  } catch {
    /* private browsing or a full quota must not break navigation */
  }
}

/**
 * Records the current route and returns the recent list, newest first.
 *
 * Call it once, from the command palette. Mounting it twice would double-write
 * the same entry — harmless, but the dedupe below only runs per call site.
 */
export function useRouteMemory(): RecentRoute[] {
  const { pathname } = useLocation()
  const [recent, setRecent] = useState<RecentRoute[]>(read)

  useEffect(() => {
    const match = allNavItems().find((item) => item.to === pathname)
    if (!match) return

    setRecent((current) => {
      if (current[0]?.id === match.id) return current
      const next = [
        { id: match.id, to: match.to },
        ...current.filter((entry) => entry.id !== match.id),
      ].slice(0, LIMIT)
      write(next)
      return next
    })
  }, [pathname])

  return recent
}
