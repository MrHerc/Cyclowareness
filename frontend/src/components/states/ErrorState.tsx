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
import { useT, type MessageKey } from '../../lib/i18n'
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
  headline: MessageKey
  sentence: MessageKey
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
    headline: 'p.the-api-is-not-answering',
    sentence:
      'p.cyclowareness-cannot-reach-its-backend-the',
    icon: WifiOff,
    tone: 'degraded',
  },
  timeout: {
    headline: 'p.the-request-took-too-long',
    sentence:
      'p.the-server-took-the-request-but',
    icon: TimerOff,
    tone: 'degraded',
  },
  unauthorized: {
    headline: 'p.your-session-has-ended',
    sentence:
      'p.the-session-expired-or-was-signed',
    icon: KeyRound,
    tone: 'refused',
  },
  forbidden: {
    headline: 'p.you-do-not-have-access-to',
    sentence:
      'p.your-role-does-not-include-this',
    icon: Lock,
    tone: 'refused',
  },
  not_found: {
    headline: 'p.err-not-found',
    sentence:
      'p.this-record-does-not-exist-it',
    icon: SearchX,
    tone: 'refused',
  },
  conflict: {
    headline: 'p.that-change-no-longer-applies',
    sentence:
      'p.the-item-moved-to-another-state',
    icon: GitMerge,
    tone: 'refused',
  },
  validation: {
    headline: 'p.the-server-rejected-these-values',
    sentence: 'p.something-in-the-request-did-not',
    icon: TriangleAlert,
    tone: 'refused',
  },
  server: {
    headline: 'p.the-server-failed-on-this-request',
    sentence:
      'p.the-api-returned-an-error-instead',
    icon: ServerCrash,
    tone: 'failed',
  },
  client: {
    headline: 'p.the-request-could-not-be-completed',
    sentence:
      'p.the-server-refused-this-request-reloading',
    icon: Ban,
    tone: 'refused',
  },
  unknown: {
    headline: 'state.error',
    sentence:
      'p.an-unexpected-error-stopped-this-view',
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
        <h2 className="text-h text-fg">{title ?? t(copy.headline)}</h2>
        <p className="text-body text-fg-muted">{t(copy.sentence)}</p>
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
