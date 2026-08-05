/**
 * What a failure looks like.
 *
 * Three decisions this file exists to enforce.
 *
 * 1. **The headline is words, never a status code.** "500" is not a sentence.
 *    Each `ApiError.kind` gets copy that says what happened and, where it is
 *    knowable, whose fault it was — "the API is not answering" and "you do not
 *    have access to this" are different situations and must not share a screen.
 *
 * 2. **Retry is offered only when retrying can work.** `ApiError.retryable` is
 *    true for transport and server faults and false for 403/404/409/422. A
 *    retry button on a permission error teaches people that the product is
 *    unreliable rather than that they are not allowed.
 *
 * 3. **The server's own message is a detail, not the headline.** It is shown
 *    below, in mono, one line, and only when it adds something — and a stack
 *    trace is never shown at all.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Ban,
  CircleAlert,
  GitMerge,
  KeyRound,
  Lock,
  RotateCw,
  SearchX,
  ServerCrash,
  TimerOff,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../../lib/i18n'
import { ApiError, type ApiErrorKind } from '../../lib/api/client'
import { cn } from '../../lib/format'
import { StateAction } from './StateAction'

/**
 * Severity of the *situation*, which is what picks the colour.
 *
 * `degraded` (amber) means the system is not answering but nothing is wrong
 * with what you did; `failed` (red) means the request genuinely broke;
 * `refused` is neutral grey, because being told "no" by a working system is
 * not a fault and must not look like one.
 */
type ErrorTone = 'degraded' | 'failed' | 'refused'

interface ErrorCopy {
  headline: string
  sentence: string
  icon: LucideIcon
  tone: ErrorTone
}

const TONE_CLASS: Record<ErrorTone, string> = {
  degraded: 'text-medium',
  failed: 'text-critical',
  refused: 'text-fg-subtle',
}

/** The copy table. One entry per `ApiErrorKind`, plus the non-API fallback. */
const COPY: Record<ApiErrorKind | 'unknown', ErrorCopy> = {
  unreachable: {
    headline: 'The API is not answering',
    sentence:
      'Cyclowareness cannot reach its backend. The service may still be starting, or the connection dropped. Nothing you did caused this, and nothing was lost.',
    icon: WifiOff,
    tone: 'degraded',
  },
  timeout: {
    headline: 'The request took too long',
    sentence:
      'The server took the request but did not answer in time. It is likely busy rather than broken — trying again usually works.',
    icon: TimerOff,
    tone: 'degraded',
  },
  unauthorized: {
    headline: 'Your session has ended',
    sentence:
      'The session expired or was signed out elsewhere. Sign in again to pick up where you left off.',
    icon: KeyRound,
    tone: 'refused',
  },
  forbidden: {
    headline: 'You do not have access to this',
    sentence:
      'Your role does not include this view. An administrator can grant the permission if you need it.',
    icon: Lock,
    tone: 'refused',
  },
  not_found: {
    headline: 'Not found',
    sentence:
      'This record does not exist. It may have been deleted, or the link may point at a different environment.',
    icon: SearchX,
    tone: 'refused',
  },
  conflict: {
    headline: 'That change no longer applies',
    sentence:
      'The item moved to another state before this action reached the server — usually because someone else acted on it first. Reload to see where it stands now.',
    icon: GitMerge,
    tone: 'refused',
  },
  validation: {
    headline: 'The server rejected these values',
    sentence: 'Something in the request did not pass validation. The field is named below.',
    icon: TriangleAlert,
    tone: 'refused',
  },
  server: {
    headline: 'The server failed on this request',
    sentence:
      'The API returned an error instead of data. This is a fault on the server side, not something you did wrong.',
    icon: ServerCrash,
    tone: 'failed',
  },
  client: {
    headline: 'The request could not be completed',
    sentence:
      'The server refused this request. Reloading is unlikely to change the answer — what it said is below.',
    icon: Ban,
    tone: 'refused',
  },
  unknown: {
    headline: 'Something went wrong',
    sentence:
      'An unexpected error stopped this view from loading. The details below are all the product knows.',
    icon: CircleAlert,
    tone: 'failed',
  },
}

/**
 * The one line of raw detail worth showing.
 *
 * Returns null when the message would only repeat the copy above it, and when
 * it looks like a stack trace — a wall of frames in front of a user is noise at
 * best and an information leak at worst.
 */
function detailOf(error: unknown): string | null {
  if (!(error instanceof Error)) return null
  // These two messages are written by our own transport layer and are already
  // said better by the copy table.
  if (error instanceof ApiError && (error.kind === 'unreachable' || error.kind === 'timeout')) {
    return null
  }
  const first = error.message.split('\n')[0]?.trim()
  if (!first) return null
  if (/\bat\s+\S+\s+\(/.test(first)) return null // a stack frame
  return first.length > 180 ? `${first.slice(0, 179)}…` : first
}

function copyFor(error: unknown): ErrorCopy {
  return error instanceof ApiError ? COPY[error.kind] : COPY.unknown
}

export interface ErrorStateProps {
  /** Anything thrown: an `ApiError`, a plain `Error`, or a value from a boundary. */
  error: unknown
  /** Wired up only when the error is retryable; otherwise the button is not shown. */
  onRetry?: () => void
  retryLabel?: string
  /** A secondary control the situation calls for — "Sign in", "Back to the queue". */
  action?: ReactNode
  /** Overrides the headline when the caller knows what was being loaded. */
  title?: string
  /** Inline variant for inside a card, without the panel frame. */
  compact?: boolean
  className?: string
}

/**
 * Renders a failed request in words a person can act on.
 *
 * `role="alert"` so it is announced when it replaces a spinner mid-page — a
 * silent swap is invisible to a screen-reader user who is waiting for data.
 */
export function ErrorState({
  error,
  onRetry,
  retryLabel,
  action,
  title,
  compact = false,
  className,
}: ErrorStateProps) {
  const t = useT()
  const copy = copyFor(error)
  const Icon = copy.icon
  const detail = detailOf(error)
  const canRetry = Boolean(onRetry) && (!(error instanceof ApiError) || error.retryable)

  return (
    <div
      role="alert"
      className={cn(
        'rise flex flex-col items-center text-center',
        compact ? 'gap-3 py-6' : 'gap-4 rounded-panel border border-line bg-surface px-6 py-12 shadow-panel',
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('size-7', TONE_CLASS[copy.tone])} strokeWidth={1.5} />

      <div className="max-w-md space-y-2">
        <h2 className="text-h text-fg">{title ?? (copy.headline === 'Something went wrong' ? t('state.error') : copy.headline)}</h2>
        <p className="text-body text-fg-muted">{copy.sentence}</p>
      </div>

      {detail ? (
        <p className="tech max-w-md break-words text-fg-faint">{detail}</p>
      ) : null}

      {canRetry || action ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {canRetry ? (
            <StateAction
              tone="primary"
              onClick={onRetry}
              icon={<RotateCw className="size-4" strokeWidth={1.75} />}
            >
              {retryLabel ?? t('action.retry')}
            </StateAction>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}
