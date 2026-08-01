/**
 * Every context the application needs, in the order it needs them.
 *
 * The nesting is not arbitrary:
 *
 * - `ErrorBoundary` is outermost so a provider that throws during construction
 *   still produces a readable panel instead of a white document.
 * - `AuthProvider` calls `useQueryClient()` — it clears the cache on sign-in and
 *   sign-out, because a different identity sees different data — so it must sit
 *   inside `QueryClientProvider`.
 * - `TooltipProvider` and `ToastProvider` are innermost: they are consumed by
 *   the shell and by every page, and neither has a dependency of its own.
 *
 * The retry policy is the interesting part. React Query's default is to retry
 * everything three times, which turns a 403 into four identical refusals and a
 * four-second wait before the user is told they lack a permission. Here only
 * `ApiError.retryable` — transport faults and 5xx — is worth a second attempt;
 * a refusal, a 404 and a validation failure are answers, not accidents.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ErrorBoundary } from '../components/states'
import { ToastProvider, TooltipProvider } from '../components/ui'
import { ApiError } from '../lib/api/client'
import { AuthProvider } from '../lib/auth/AuthProvider'

/** Two attempts after the first. Beyond that the API is not coming back inside a click. */
const MAX_RETRIES = 2

/**
 * Ten seconds. Long enough that moving between two screens does not refetch the
 * same dashboard twice, short enough that a queue does not look stale after an
 * approval was made in another tab.
 */
const DEFAULT_STALE_MS = 10_000

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_MS,
        // An analyst alt-tabs to their mail client and back mid-incident. The
        // numbers must be current when they look again.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.retryable && failureCount < MAX_RETRIES,
      },
      mutations: {
        // Never. A write that crosses the human approval gate must happen once
        // or not at all — a retried POST is a second approval nobody made.
        retry: false,
      },
    },
  })
}

/**
 * Wraps the router in every application-wide context.
 *
 * Mount it exactly once, in `App.tsx`. The `QueryClient` is created in state
 * rather than at module scope so a hot reload of this file does not silently
 * strand every in-flight query against a client nothing is reading any more.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <ErrorBoundary name="application root">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={250} skipDelayDuration={400}>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
