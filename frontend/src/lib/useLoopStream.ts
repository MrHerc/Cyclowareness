import { useEffect, useRef } from 'react'
import { getSession } from './api'

/**
 * Subscribe to live loop-stage updates over WebSocket. Calls `onEvent` on each
 * update so the caller can refresh immediately. Polling remains the fallback,
 * so a closed or unavailable socket degrades gracefully (auto-reconnect with
 * backoff). Returns nothing — purely a side-effect subscription.
 */
export function useLoopStream(onEvent: () => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const session = getSession()
    if (!session) return

    let ws: WebSocket | null = null
    let closed = false
    let retry = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (closed) return
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      // No token in the URL: the handshake URL is written verbatim into the
      // server's access log and into every proxy in front of it, and these
      // tokens live for twelve hours. It goes in the first frame instead.
      ws = new WebSocket(`${proto}://${location.host}/api/ws`)

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'loop_update') onEventRef.current()
        } catch {
          /* ignore malformed frames */
        }
      }
      ws.onopen = () => {
        retry = 0
        ws?.send(JSON.stringify({ token: session.access_token }))
      }
      ws.onclose = () => {
        if (closed) return
        // Exponential-ish backoff, capped — polling covers the gap meanwhile.
        retry = Math.min(retry + 1, 5)
        reconnectTimer = setTimeout(connect, retry * 1500)
      }
      ws.onerror = () => ws?.close()
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])
}
