/**
 * The list's filter state, kept in the URL.
 *
 * An analyst who has narrowed to "critical, still open, in Finance" needs to be
 * able to send that view to somebody else, and to still have it after a reload.
 * Component state cannot do either. The query string is also what the server
 * takes, so there is no second representation to keep in step.
 *
 * `all` is the absent value rather than an empty string, because a Radix select
 * cannot hold `""` — it treats it as "no item chosen" and falls back to the
 * placeholder, which would make "Any status" unselectable once a status was set.
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface RiskFilters {
  status: string
  severity: string
  risk_type: string
  department_id: string
  q: string
}

const EMPTY: RiskFilters = {
  status: 'all',
  severity: 'all',
  risk_type: 'all',
  department_id: 'all',
  q: '',
}

export interface RiskFilterState {
  filters: RiskFilters
  /** Only the keys the server should receive — `all` and `''` are dropped. */
  query: Record<string, string | undefined>
  set: (patch: Partial<RiskFilters>) => void
  reset: () => void
  activeCount: number
}

export function useRiskFilters(): RiskFilterState {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<RiskFilters>(
    () => ({
      status: params.get('status') ?? EMPTY.status,
      severity: params.get('severity') ?? EMPTY.severity,
      risk_type: params.get('risk_type') ?? EMPTY.risk_type,
      department_id: params.get('department_id') ?? EMPTY.department_id,
      q: params.get('q') ?? EMPTY.q,
    }),
    [params],
  )

  const set = useCallback(
    (patch: Partial<RiskFilters>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === 'all') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const query = useMemo(() => {
    const out: Record<string, string | undefined> = {}
    if (filters.status !== 'all') out.status = filters.status
    if (filters.severity !== 'all') out.severity = filters.severity
    if (filters.risk_type !== 'all') out.risk_type = filters.risk_type
    if (filters.department_id !== 'all') out.department_id = filters.department_id
    if (filters.q.trim()) out.q = filters.q.trim()
    return out
  }, [filters])

  return { filters, query, set, reset, activeCount: Object.keys(query).length }
}
