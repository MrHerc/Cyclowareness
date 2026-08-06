/**
 * The small pieces every intake surface repeats.
 *
 * They live together because they encode two rules that must not drift between
 * the queue, the table and the detail page: an artifact's channel always gets
 * the same glyph, and an action that failed always leaves a sentence on the
 * page. A toast disappears; a push that did not happen must still be visible
 * ten seconds later, which is what `ActionError` is for.
 */

import { useT } from '../../lib/i18n'
import {
  AtSign,
  FileText,
  Link2,
  MessageSquare,
  QrCode,
  Rss,
  Smartphone,
  UserRound,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '../../lib/api/client'
import { channelLabel, cn } from '../../lib/format'
import type { ThreatSource } from '../../domain/types'

/* ============================================================================
   Artifact channel
   ========================================================================== */

const GLYPHS: Record<string, LucideIcon> = {
  email: AtSign,
  url: Link2,
  file: FileText,
  sms: Smartphone,
  qr: QrCode,
  chat: MessageSquare,
}

export interface ArtifactGlyphProps {
  type: string | null | undefined
  className?: string
}

/** Decorative: the channel label is always rendered beside it in words. */
export function ArtifactGlyph({ type, className }: ArtifactGlyphProps) {
  const Icon = GLYPHS[type ?? ''] ?? FileText
  return <Icon className={cn('size-4 shrink-0 text-fg-subtle', className)} aria-hidden="true" strokeWidth={1.75} />
}

export function ArtifactTypeTag({ type }: { type: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
      <ArtifactGlyph type={type} className="size-3.5" />
      {channelLabel(type)}
    </span>
  )
}

/* ============================================================================
   Where it came from
   ========================================================================== */

const SOURCES: Record<ThreatSource, { label: string; icon: LucideIcon; hint: string }> = {
  human_sensor: {
    label: 'Human sensor',
    icon: UserRound,
    hint: 'An employee reported this and an analyst pushed it into the loop.',
  },
  feed: {
    label: 'Curated feed',
    icon: Rss,
    hint: 'Taken from the curated intel feed by an analyst.',
  },
  manual: {
    label: 'Analyst submission',
    icon: Waypoints,
    hint: 'Submitted directly by an analyst on this screen.',
  },
}

export interface SourceTagProps {
  source: string | null | undefined
  className?: string
}

/** Reads the source as a word, never as a colour — a source is not a health signal. */
export function SourceTag({ source, className }: SourceTagProps) {
  const spec = SOURCES[(source ?? '') as ThreatSource]
  if (!spec) {
    return <span className={cn('text-sm text-fg-faint', className)}>Source not recorded</span>
  }
  const Icon = spec.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-xs text-fg-muted',
        className,
      )}
      title={spec.hint}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {spec.label}
    </span>
  )
}

/* ============================================================================
   A failed action
   ========================================================================== */

export interface ActionErrorProps {
  error: unknown
  className?: string
}

/**
 * The server's own sentence, kept on the page after the toast has gone.
 *
 * Deliberately not `ErrorState`: this is one control that did not work, not a
 * view that could not load, and replacing a report card with a full error panel
 * would lose the analyst the thing they were deciding about.
 */
export function ActionError({ error, className }: ActionErrorProps) {
  const t = useT()
  if (error === null || error === undefined) return null
  const message =
    error instanceof ApiError
      ? error.message
      : t('p.the-request-did-not-complete-and')
  return (
    <p role="alert" className={cn('text-sm text-critical', className)}>
      {message}
    </p>
  )
}

/* ============================================================================
   Label / value
   ========================================================================== */

export interface DetailRowProps {
  label: string
  children: ReactNode
  className?: string
}

export function DetailRow({ label, children, className }: DetailRowProps) {
  return (
    <div className={cn('grid gap-1 py-2.5 sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-4', className)}>
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-fg">{children}</dd>
    </div>
  )
}
