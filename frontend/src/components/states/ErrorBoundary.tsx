/**
 * The last line of defence: a component threw while rendering.
 *
 * React unmounts the whole tree when a render throws and nothing catches it,
 * which in practice means a blank white page — the single worst thing that can
 * happen on stage. This boundary keeps the shell alive, explains what happened
 * in words, and offers two genuinely different recoveries: re-render the subtree
 * (cheap, keeps the session and any other in-flight work), or reload (expensive,
 * but survives a corrupted client-side cache).
 *
 * It also logs. `console.error` is not decoration here — it is the only record
 * of a client-side crash that anyone can read off a demo laptop afterwards.
 */

import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ApiError, type ApiErrorKind } from '../../lib/api/client'
import { ErrorState } from './ErrorState'
import { StateAction } from './StateAction'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Named in the console log, so a crash report says which region died. */
  name?: string
  /** Replaces the default panel. `reset` re-renders the children. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Called alongside `reset` — clear the state that caused the throw here. */
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors in its subtree and shows a recoverable panel.
 *
 * Wrap regions, not just the app root: a chart that throws on a malformed
 * series should cost you the chart, not the page around it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[Cyclowareness] render error in ${this.props.name ?? 'component tree'}`, error, info.componentStack)
  }

  reset = (): void => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <ErrorState
        error={error}
        onRetry={this.reset}
        retryLabel="Try again"
        action={
          <StateAction tone="quiet" onClick={() => window.location.reload()}>
            Reload the page
          </StateAction>
        }
      />
    )
  }
}

/** Route errors carry a status but no `ApiError`; give them the same words. */
const ROUTE_STATUS_KIND: Record<number, ApiErrorKind> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
}

/**
 * The `errorElement` for react-router routes — loader failures, a bad URL, and
 * anything a route component threw before this file's boundary could see it.
 *
 * Only a reload is offered, because there is no subtree left to re-render:
 * router error state survives until the route is entered again.
 */
export function RouteErrorBoundary() {
  const routeError = useRouteError()

  // In an effect, not in render: a boundary that re-renders must not multiply
  // the crash record it left behind.
  useEffect(() => {
    console.error('[Cyclowareness] route error', routeError)
  }, [routeError])

  let error: unknown = routeError
  if (isRouteErrorResponse(routeError)) {
    const kind = ROUTE_STATUS_KIND[routeError.status] ?? (routeError.status >= 500 ? 'server' : 'client')
    error = new ApiError(kind, routeError.status, routeError.statusText || 'This route could not be loaded.')
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <ErrorState
        error={error}
        onRetry={() => window.location.reload()}
        retryLabel="Reload the page"
        // A 404 is not retryable, so the retry button is withheld — without this
        // there would be no way out of the route at all.
        action={
          <StateAction tone="quiet" onClick={() => window.history.back()}>
            Go back
          </StateAction>
        }
      />
    </div>
  )
}
