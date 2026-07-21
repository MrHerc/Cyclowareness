import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './api'

/**
 * Poll a fetcher on an interval.
 *
 * Returns `status` alongside `error` so callers can distinguish *why* a load
 * failed — "you don't have an employee profile" (403) needs a different screen
 * from "the API is down" (0/5xx), and a bare message string cannot tell them
 * apart.
 */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs = 2500, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  // Generation counter: drop responses that arrive after deps changed
  // (e.g. rapid navigation between loop runs) so stale data never wins.
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const gen = generation.current
    try {
      const result = await fetcherRef.current()
      if (gen !== generation.current) return
      setData(result)
      setError(null)
      setStatus(null)
    } catch (e) {
      if (gen !== generation.current) return
      setError(e instanceof Error ? e.message : String(e))
      setStatus(e instanceof ApiError ? e.status : null)
    }
  }, [])

  useEffect(() => {
    generation.current += 1
    setData(null)
    setError(null)
    setStatus(null)
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, refresh, ...deps])

  return { data, error, status, refresh }
}
