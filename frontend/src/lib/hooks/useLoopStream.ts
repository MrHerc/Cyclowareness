/**
 * Live loop updates over WebSocket.
 *
 * Polling is the floor; this is the ceiling. Every screen that watches the loop
 * still polls on its own cadence, so a dropped socket degrades to "a few seconds
 * late" rather than to "silently stale". That belt-and-braces arrangement is
 * deliberate: a demo where the ring stops turning because a proxy ate a socket
 * is worse than one that updates a beat slower.
 *
 * The token is presented in the FIRST FRAME, never in the URL. A query-string
 * token is written verbatim into the server's access log and into every proxy
 * in front of it, and these tokens are valid for twelve hours.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSession } from '../api/client'
import { loopStreamUrl } from '../api/endpoints'
import { qk } from '../api/queries'

export interface LoopEvent {
  type: 'connected' | 'loop_update'
  run_id?: number
  stage?: number
  status?: string
}

/**
 * Subscribes to loop-stage transitions and invalidates the affected caches, so
 * an approval on one screen is visible on every other one without a refresh.
 *
 * @param onEvent optional extra handler for a page that wants to react directly.
 */
export function useLoopStream(onEvent?: (event: LoopEvent) => void): void {
  const queryClient = useQueryClient()
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const session = getSession()
    if (!session?.access_token) return

    let socket: WebSocket | null = null
    let closed = false
    let attempt = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (closed) return
      socket = new WebSocket(loopStreamUrl())

      socket.onopen = () => {
        attempt = 0
        // Authenticate in-band. The handshake URL carries nothing secret.
        socket?.send(JSON.stringify({ token: session.access_token }))
      }

      socket.onmessage = (event) => {
        let message: LoopEvent
        try {
          message = JSON.parse(event.data as string) as LoopEvent
        } catch {
          return // a malformed frame is not worth crashing a dashboard over
        }
        if (message.type !== 'loop_update') return

        queryClient.invalidateQueries({ queryKey: qk.loops.all })
        queryClient.invalidateQueries({ queryKey: qk.dashboard.analyst })
        queryClient.invalidateQueries({ queryKey: qk.approvals.all })
        if (message.run_id !== undefined) {
          queryClient.invalidateQueries({ queryKey: qk.loops.detail(message.run_id) })
        }
        handlerRef.current?.(message)
      }

      socket.onclose = () => {
        if (closed) return
        // Backoff, capped. Polling covers the gap meanwhile, so there is no
        // reason to hammer a server that is restarting.
        attempt = Math.min(attempt + 1, 6)
        reconnectTimer = setTimeout(connect, Math.min(attempt * 1500, 10_000))
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [queryClient])
}
