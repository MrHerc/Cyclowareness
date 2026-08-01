/**
 * The loading / error / empty / content ladder, written once.
 *
 * Every page in this product resolves the same four states, and every hand-rolled
 * version of that ladder gets one of them subtly wrong — usually by treating an
 * empty array as a failure, or by forgetting that a skeleton needs to announce
 * itself to a screen reader.
 *
 * **Pass `error` only when there is nothing left to render.** React Query keeps
 * the last good data when a background refetch fails, so
 * `error={data ? null : query.error}` is almost always what you want: a poll
 * that blips while a live dashboard is on screen belongs to `DisconnectedBanner`,
 * which says so without taking the numbers away. Replacing a working view with
 * an error panel because one 4-second poll missed is the failure mode this note
 * exists to prevent.
 */

import type { ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface AsyncBoundaryBase {
  /** True only while there is no data yet — `query.isLoading`, not `isFetching`. */
  isLoading?: boolean
  /** Anything thrown. Null or undefined means "no failure worth showing". */
  error?: unknown
  /** Shown while loading. Must have the shape of the content it stands in for. */
  skeleton: ReactNode
  /** Wired to the retry control, when the error is retryable. */
  onRetry?: () => void
  /** What is being fetched, spoken while the skeleton is up. */
  loadingLabel?: string
  children: ReactNode
}

/**
 * `isEmpty` and `empty` travel together. Declaring a view can be empty without
 * saying what to show then is how "No data" ends up on a screen — the type
 * makes that impossible rather than merely discouraged.
 */
type EmptyBranch = { isEmpty: boolean; empty: ReactNode } | { isEmpty?: false; empty?: never }

export type AsyncBoundaryProps = AsyncBoundaryBase & EmptyBranch

/**
 * Renders exactly one of: error, skeleton, empty, children.
 *
 * The skeleton is wrapped in a live region so the wait is audible; without it a
 * screen-reader user hears silence and then, eventually, a page that changed
 * underneath them.
 */
export function AsyncBoundary(props: AsyncBoundaryProps) {
  const { isLoading, error, skeleton, onRetry, loadingLabel = 'Loading', children } = props

  if (error !== null && error !== undefined) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{loadingLabel}</span>
        {skeleton}
      </div>
    )
  }

  if (props.isEmpty) return <>{props.empty}</>

  return <>{children}</>
}
