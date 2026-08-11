/**
 * One door to the standalone Cyclowareness Sandbox, opened from two places.
 *
 * The panel on the Sandbox page and the button in the top bar do the same
 * thing: ask the portal for a session in the standalone's format and open it.
 * That is a credential-minting call, and the one way to get it wrong twice is
 * to write it twice — so it lives here, and both callers are presentation.
 *
 * WHY THE TOKEN GOES IN THE FRAGMENT. Everything after `#` stays in the
 * browser: it is not sent to the server, never lands in an access log, and is
 * not carried on the `Referer` of the next request. The standalone erases it
 * from the address bar on arrival. A query string would have leaked it into
 * three places before the page finished loading.
 *
 * WHY A NEW TAB. The standalone is a different application with its own
 * navigation. Replacing the portal with it strands the analyst outside the loop
 * they were working in, with the browser's back button as their only way home.
 */

import { useCallback, useState } from 'react'
import { api } from '../../lib/api/client'
import { useCapabilities } from '../../lib/api/queries'

interface HandoffResponse {
  url: string
  token: string
  subject: string
  expires_at: number
}

export interface StandaloneDoor {
  /** Whether this deployment has a standalone at all. False until
   *  `/api/capabilities` answers, so nothing is drawn on a guess. */
  configured: boolean
  /** A session is being minted. Callers must disable their control. */
  busy: boolean
  /** The mint failed and the analyst is owed an explanation. */
  error: string | null
  open: () => void
}

export function useStandaloneDoor(): StandaloneDoor {
  const { data: capabilities } = useCapabilities()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** A 404 means the operator never set this up. It is a fact about the
   *  deployment, so it is remembered rather than rediscovered on every click —
   *  and it also covers the older servers that predate the capability flag. */
  const [refused, setRefused] = useState(false)

  const open = useCallback(() => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const handoff = await api.post<HandoffResponse>('/api/sandbox/app-session', {})
        const fragment = new URLSearchParams({
          handoff: handoff.token,
          subject: handoff.subject,
          expires: String(handoff.expires_at),
        })
        window.open(`${handoff.url}/#${fragment}`, '_blank', 'noopener,noreferrer')
      } catch (caught) {
        const status = (caught as { status?: number }).status
        if (status === 404) setRefused(true)
        else setError(caught instanceof Error ? caught.message : String(caught))
      } finally {
        setBusy(false)
      }
    })()
  }, [])

  return {
    configured: capabilities?.sandbox_app === true && !refused,
    busy,
    error,
    open,
  }
}
