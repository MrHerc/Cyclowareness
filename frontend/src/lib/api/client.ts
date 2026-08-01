/**
 * The one place the frontend talks to the network.
 *
 * Everything above this file works with typed values and `ApiError`; nothing
 * above it knows about `fetch`, headers, tokens or status codes. That boundary
 * is what keeps presentation components free of transport logic and what makes
 * every failure mode expressible in the UI rather than swallowed.
 *
 * Three behaviours worth knowing about:
 *
 * - **A 401 clears the session but does not navigate.** Every page polls in the
 *   background, so a hard redirect from inside the transport layer would throw
 *   away whatever an analyst was typing, from a timer tick, with no warning.
 *   Clearing the credential is enough; the route guards react on the next
 *   render and the in-flight caller still gets a real error to show.
 *
 * - **Unreachable is a distinct failure from a server error.** "The API is
 *   down" and "the API said no" need different words in front of a user, so
 *   they get different `ApiError.kind`s rather than one generic message.
 *
 * - **Timeouts are enforced client-side.** A request that hangs forever is a
 *   spinner that never resolves, which is the worst state a demo can be in.
 */

import type { Session } from '../../domain/types'

/* ============================================================================
   Configuration
   ========================================================================== */

/**
 * Base URL for the API. Empty by default because the production image serves
 * the SPA and the API from the same origin — which is also why there is no CORS
 * and why the WebSocket is same-origin. Override for a split deployment.
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30_000)

const TOKEN_KEY = 'cyclo.session'

/* ============================================================================
   Session storage
   ========================================================================== */

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing, quota — a failure to persist must not break the app */
  }
}

/**
 * Lets the auth provider hear about a session cleared inside the transport
 * layer (an expired token on a background poll) without this module importing
 * React.
 */
const sessionListeners = new Set<() => void>()

export function onSessionCleared(listener: () => void): () => void {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

function notifySessionCleared(): void {
  for (const listener of sessionListeners) listener()
}

/* ============================================================================
   Errors
   ========================================================================== */

export type ApiErrorKind =
  | 'unreachable' // no response at all — server down, offline, DNS
  | 'timeout' // we gave up waiting
  | 'unauthorized' // 401 — session gone
  | 'forbidden' // 403 — authenticated, but not allowed
  | 'not_found' // 404
  | 'conflict' // 409 — illegal state transition
  | 'validation' // 422
  | 'server' // 5xx
  | 'client' // other 4xx

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly detail: unknown

  constructor(kind: ApiErrorKind, status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.detail = detail
  }

  /** Retrying only helps for transport faults and server faults. */
  get retryable(): boolean {
    return this.kind === 'unreachable' || this.kind === 'timeout' || this.kind === 'server'
  }
}

export const UNREACHABLE_MESSAGE =
  'Cannot reach the Cyclowareness API. The service may be starting, or the connection dropped.'

function kindFor(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'client'
}

/** Pull a human sentence out of FastAPI's several error shapes. */
function messageFrom(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload && typeof payload === 'object') {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    // 422 validation: [{loc, msg, type}, …]
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: string; loc?: unknown[] }
      if (first?.msg) {
        const field = Array.isArray(first.loc) ? first.loc.slice(1).join('.') : ''
        return field ? `${field}: ${first.msg}` : first.msg
      }
    }
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

/* ============================================================================
   The request
   ========================================================================== */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Sent as multipart. Content-Type is deliberately left to the browser. */
  formData?: FormData
  signal?: AbortSignal
  timeoutMs?: number
  /** Suppresses the session-cleared broadcast — used by the login call itself. */
  anonymous?: boolean
  headers?: Record<string, string>
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    anonymous = false,
    headers: extraHeaders,
  } = options

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders }

  if (!anonymous) {
    const session = getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  // Only set Content-Type for JSON. For FormData the browser must set it itself
  // so the multipart boundary is correct.
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
    if (isTimeout) {
      throw new ApiError('timeout', 0, `The request to ${path} took longer than ${Math.round(timeoutMs / 1000)}s.`)
    }
    // An external abort (component unmounted, query cancelled) is not an error
    // the user should ever see — re-throw it untouched so React Query can
    // recognise its own cancellation.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('unreachable', 0, UNREACHABLE_MESSAGE)
  } finally {
    clearTimeout(timer)
  }

  // The dev proxy answers 502/503/504 with an empty body when the API itself is
  // down — same root cause as a network failure, so it earns the same words.
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError('unreachable', response.status, UNREACHABLE_MESSAGE)
  }

  if (response.status === 401 && !anonymous) {
    setSession(null)
    notifySessionCleared()
    throw new ApiError('unauthorized', 401, 'Your session has expired. Sign in again to continue.')
  }

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      /* an error response without a JSON body is normal */
    }
    const kind = kindFor(response.status)
    throw new ApiError(kind, response.status, messageFrom(payload, response.statusText || 'Request failed'), payload)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    // A 200 that is not JSON means the SPA fallback answered an API path —
    // almost always a wrong base URL or a route that does not exist server-side.
    throw new ApiError('server', response.status, `Expected JSON from ${path} but received something else.`)
  }
}

/** Fetches a binary payload (PDF export, evidence download). */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers: Record<string, string> = {}
  const session = getSession()
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

  let response: Response
  try {
    response = await fetch(url, { method: options.method ?? 'GET', headers, signal: options.signal })
  } catch {
    throw new ApiError('unreachable', 0, UNREACHABLE_MESSAGE)
  }
  if (!response.ok) {
    throw new ApiError(kindFor(response.status), response.status, `Download failed (${response.status}).`)
  }
  return response.blob()
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', formData }),
  blob: requestBlob,
}
