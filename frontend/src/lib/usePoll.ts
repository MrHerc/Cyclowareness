import { useCallback, useEffect, useRef, useState } from 'react'

/** Poll a fetcher on an interval; pauses when the tab is hidden. */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs = 2500, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    } catch (e) {
      if (gen !== generation.current) return
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    generation.current += 1
    setData(null)
    setError(null)
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, refresh, ...deps])

  return { data, error, refresh }
}
