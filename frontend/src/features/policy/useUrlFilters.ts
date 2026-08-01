/**
 * Filters that live in the URL.
 *
 * A governance screen is something people send each other. "The four critical
 * findings owned by Kamran that are overdue" has to survive being pasted into a
 * chat window, and a filter held in component state does not. Keeping the whole
 * filter set in the query string also means the browser's back button undoes a
 * filter, which is what everyone tries first.
 *
 * `'all'` is the sentinel for "no constraint" because Radix's Select cannot hold
 * an empty string as an item value. It is stripped before anything reaches the
 * API, so `?severity=all` never becomes a query parameter.
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export const ANY_VALUE = 'all'

export interface UrlFilters<K extends string> {
  /** Every key, with `''` where the URL says nothing. */
  values: Record<K, string>
  /** Only the keys carrying a real constraint — ready for an API call. */
  active: Partial<Record<K, string>>
  activeCount: number
  set: (key: K, value: string) => void
  /** Applies several at once, so one navigation covers a whole form submit. */
  setMany: (patch: Partial<Record<K, string>>) => void
  clear: () => void
}

export function useUrlFilters<K extends string>(keys: readonly K[]): UrlFilters<K> {
  const [params, setParams] = useSearchParams()

  const values = useMemo(() => {
    const out = {} as Record<K, string>
    for (const key of keys) out[key] = params.get(key) ?? ''
    return out
    // `params` is a new object on every navigation; keys are a stable literal.
  }, [params, keys])

  const active = useMemo(() => {
    const out: Partial<Record<K, string>> = {}
    for (const key of keys) {
      const value = values[key]
      if (value && value !== ANY_VALUE) out[key] = value
    }
    return out
  }, [values, keys])

  const setMany = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            const raw = typeof value === 'string' ? value : ''
            if (!raw || raw === ANY_VALUE) next.delete(key)
            else next.set(key, raw)
          }
          return next
        },
        // A filter change is not a place in history worth stepping back through
        // one keystroke at a time.
        { replace: true },
      )
    },
    [setParams],
  )

  const set = useCallback(
    (key: K, value: string) => setMany({ [key]: value } as Partial<Record<K, string>>),
    [setMany],
  )

  const clear = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const key of keys) next.delete(key)
        return next
      },
      { replace: true },
    )
  }, [setParams, keys])

  return {
    values,
    active,
    activeCount: Object.keys(active).length,
    set,
    setMany,
    clear,
  }
}
