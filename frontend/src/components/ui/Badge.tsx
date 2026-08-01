/**
 * Status, in two weights.
 *
 * `StatusDot` is the default. A dense table of solid pills is a colour riot in
 * which nothing stands out, so most rows get a small coloured dot beside plain
 * text and the pill is saved for the one place a status is the headline.
 *
 * Both read `status` through `statusTone()` — see `status.ts` for why that
 * lookup is centralised. Colour is never the only carrier: the word is always
 * present, because a red dot alone is invisible to a colour-blind analyst and
 * to a projector with the contrast turned down.
 */

import type { ReactNode } from 'react'
import { cn, humanise } from '../../lib/format'
import { statusMeaning, TONE_DOT, TONE_PILL, type StatusTone } from './status'

export interface BadgeProps {
  /** A raw backend value: `awaiting_approval`, `malicious`, `connected`… */
  status?: string | null
  /** Overrides the tone the lookup would choose. Use sparingly. */
  tone?: StatusTone
  /** Overrides the label. Defaults to the humanised status. */
  children?: ReactNode
  /** Prefixes a coloured dot inside the pill. */
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ status, tone, children, dot = false, size = 'md', className }: BadgeProps) {
  const meaning = statusMeaning(status)
  const resolved = tone ?? meaning.tone
  const label = children ?? meaning.label ?? (status ? humanise(status) : '—')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm',
        TONE_PILL[resolved],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[resolved], meaning.live && 'pulse-soft')}
        />
      )}
      {label}
    </span>
  )
}

export interface StatusDotProps {
  status?: string | null
  tone?: StatusTone
  /** Set false for the dot alone — only where a nearby label already says it. */
  showLabel?: boolean
  children?: ReactNode
  className?: string
}

/** A coloured dot followed by the status word. The default status treatment. */
export function StatusDot({
  status,
  tone,
  showLabel = true,
  children,
  className,
}: StatusDotProps) {
  const meaning = statusMeaning(status)
  const resolved = tone ?? meaning.tone
  const label = children ?? meaning.label ?? (status ? humanise(status) : '—')

  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-fg', className)}>
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          TONE_DOT[resolved],
          meaning.live && 'pulse-soft',
        )}
        // The dot carries no information the label does not; when the label is
        // hidden the accessible name has to come from somewhere.
        aria-hidden={showLabel ? 'true' : undefined}
        role={showLabel ? undefined : 'img'}
        aria-label={showLabel ? undefined : typeof label === 'string' ? label : undefined}
      />
      {showLabel && <span className="truncate">{label}</span>}
    </span>
  )
}
