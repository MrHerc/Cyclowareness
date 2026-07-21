import { useEffect, useState } from 'react'
import { api } from './api'

export interface Capabilities {
  demo_mode: boolean
  ai_provider: 'anthropic' | 'mock'
  analyzer: string
}

const UNKNOWN: Capabilities = { demo_mode: false, ai_provider: 'mock', analyzer: 'mock' }

/** Cached across mounts — capabilities are fixed for the life of a deployment. */
let cached: Capabilities | null = null
let inflight: Promise<Capabilities> | null = null

function load(): Promise<Capabilities> {
  inflight ??= api
    .get<Capabilities>('/api/capabilities')
    .then((c) => {
      cached = c
      return c
    })
    .catch((e) => {
      // Do not cache a failure: the API may simply have been restarting.
      inflight = null
      throw e
    })
  return inflight
}

/**
 * What this deployment can actually do.
 *
 * Several controls (demo reset, synthetic simulation outcomes, one-click demo
 * logins) only exist in the exhibition build. Rendering them unconditionally
 * means they 404 in production, which reads as a broken product — so the UI
 * asks first.
 *
 * Defaults to `demo_mode: false` while unknown: better to briefly hide a demo
 * button than to briefly show a dead one to a customer. Because that default
 * is also what an *outage* produces, the fetch retries with backoff — without
 * it, one blip at startup would hide the demo controls until a full reload.
 */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(cached ?? UNKNOWN)

  useEffect(() => {
    if (cached) return
    let alive = true
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const attemptLoad = () => {
      load()
        .then((c) => alive && setCaps(c))
        .catch(() => {
          if (!alive || attempt >= 5) return
          attempt += 1
          timer = setTimeout(attemptLoad, Math.min(attempt * 2000, 10000))
        })
    }
    attemptLoad()

    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  return caps
}
