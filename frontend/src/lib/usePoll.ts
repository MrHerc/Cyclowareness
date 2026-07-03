import { useCallback, useEffect, useRef, useState } from 'react'

/** Poll a fetcher on an interval; pauses when the tab is hidden. */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs = 2500, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, refresh, ...deps])

  return { data, error, refresh }
}
