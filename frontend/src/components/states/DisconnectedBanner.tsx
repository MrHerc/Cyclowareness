/**
 * "The API stopped answering" — said once, quietly, and taken back automatically.
 *
 * Every screen in this product polls, so when the backend goes away the user
 * gets six error panels at once and no idea whether the problem is this page or
 * the whole service. This banner is the single place that answer lives.
 *
 * Two design decisions worth knowing about:
 *
 * - **Detection is free; recovery is measured.** Going *down* is inferred from
 *   errors the app was already making — no extra request in the healthy case.
 *   Coming *back* is not inferred from the cache, because a query that errored
 *   and then went inactive keeps its error object forever; instead the banner
 *   polls `/api/health` and only that answering clears it. A banner that lies
 *   about being back is worse than no banner.
 *
 * - **It is never a blocker.** No overlay, no dialog, no focus steal. A demo
 *   that loses wifi for four seconds must not eat a click, and whatever was
 *   typed into a form must survive.
 */

import { CircleCheck, PlugZap, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { cn, timeAgo } from '../../lib/format'

/** Slow enough not to hammer a server that is restarting, fast enough to feel live. */
const PROBE_INTERVAL_MS = 5_000
/** A health check that hangs is itself evidence of being down. */
const PROBE_TIMEOUT_MS = 6_000
/** How long "reconnected" stays up before the banner removes itself entirely. */
const RECOVERED_MS = 4_000

export interface DisconnectedBannerProps {
  className?: string
}

/**
 * Mount once, in the app shell, inside the QueryClientProvider.
 *
 * Renders nothing at all while the API is answering.
 */
export function DisconnectedBanner({ className }: DisconnectedBannerProps) {
  const queryClient = useQueryClient()
  const [downSince, setDownSince] = useState<number | null>(null)
  const [probing, setProbing] = useState(false)
  const [recovered, setRecovered] = useState(false)
  const [nonce, setNonce] = useState(0)

  /* Errors older than the last confirmed recovery are history, not evidence.
     Without this, one stale cache entry would re-raise the banner forever. */
  const recoveredAt = useRef(0)

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const evaluate = () => {
      const unreachable = cache.getAll().some((query) => {
        const error = query.state.error
        return (
          error instanceof ApiError &&
          error.kind === 'unreachable' &&
          query.state.errorUpdatedAt > recoveredAt.current
        )
      })
      // Only ever raises the banner. Lowering it is the health probe's job.
      if (unreachable) setDownSince((previous) => previous ?? Date.now())
    }

    evaluate()
    const unsubscribe = cache.subscribe(evaluate)

    // The browser knows about a pulled cable before any request has failed.
    const goOffline = () => setDownSince((previous) => previous ?? Date.now())
    const goOnline = () => setNonce((n) => n + 1)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    if (navigator.onLine === false) goOffline()

    return () => {
      unsubscribe()
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [queryClient])

  useEffect(() => {
    if (downSince === null) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    /**
     * Reachability, not authorization. Any answer the service gives — including
     * a refusal — proves it is up, so a health endpoint that starts requiring a
     * token can never strand this banner in the "down" state. The probe is
     * anonymous for the same reason: a 401 here must not clear the session.
     */
    const answered = async (): Promise<boolean> => {
      try {
        await api.get<unknown>(endpoints.health(), { timeoutMs: PROBE_TIMEOUT_MS, anonymous: true })
        return true
      } catch (error) {
        return error instanceof ApiError && error.kind !== 'unreachable' && error.kind !== 'timeout'
      }
    }

    const probe = async () => {
      if (cancelled) return
      setProbing(true)
      const up = await answered()
      if (cancelled) return
      setProbing(false)

      if (!up) {
        timer = setTimeout(probe, PROBE_INTERVAL_MS)
        return
      }
      recoveredAt.current = Date.now()
      setDownSince(null)
      setRecovered(true)
      // The pages behind this banner are showing error panels. Refill the ones
      // the user is actually looking at rather than making them press retry.
      void queryClient.refetchQueries({ type: 'active' })
    }

    void probe()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [downSince, nonce, queryClient])

  useEffect(() => {
    if (!recovered) return
    const timer = setTimeout(() => setRecovered(false), RECOVERED_MS)
    return () => clearTimeout(timer)
  }, [recovered])

  const checkNow = useCallback(() => setNonce((n) => n + 1), [])

  if (downSince === null && !recovered) return null

  const down = downSince !== null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rise glass fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3',
        'rounded-panel border px-4 py-3 shadow-float',
        down ? 'border-medium/40' : 'border-safe/40',
        className,
      )}
    >
      {down ? (
        <PlugZap aria-hidden="true" className="size-5 shrink-0 text-medium" strokeWidth={1.5} />
      ) : (
        <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-safe" strokeWidth={1.5} />
      )}

      <div className="min-w-0">
        <p className="text-sm text-fg">
          {down ? 'The API is not answering' : 'Reconnected'}
        </p>
        <p className="text-xs text-fg-subtle">
          {down
            ? `Live data is paused. This clears itself when the service answers — stopped responding ${timeAgo(
                new Date(downSince).toISOString(),
              )}.`
            : 'Live data has resumed. Open views have been refreshed.'}
        </p>
      </div>

      {down ? (
        <button
          type="button"
          onClick={checkNow}
          disabled={probing}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-control border border-line px-2.5 py-1.5',
            'text-xs text-fg-muted transition-colors hover:bg-raised hover:text-fg',
            'disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          <RotateCw aria-hidden="true" className={cn('size-3.5', probing && 'pulse-soft')} strokeWidth={1.75} />
          {probing ? 'Checking' : 'Check now'}
        </button>
      ) : null}
    </div>
  )
}
