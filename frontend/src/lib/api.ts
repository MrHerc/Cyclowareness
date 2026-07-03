// Minimal typed API client with JWT handling.

const TOKEN_KEY = 'cyclo_session'

import type { Session } from './types'

export function getSession(): Session | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function setSession(session: Session | null) {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const session = getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session) headers['Authorization'] = `Bearer ${session.access_token}`
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && !path.endsWith('/auth/login')) {
    setSession(null)
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
}
