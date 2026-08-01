/**
 * One stage, told properly: what happened, who did it, when, and from what.
 *
 * This is the unit an analyst reads when a run went wrong, so it refuses to
 * round anything off. A stage that never started shows "—", not a zero
 * duration; an error is a `role="alert"` block rather than red body text; and
 * the owning role is always named even when no individual actor was recorded,
 * because "Risk engine" and "an unknown person" are very different answers to
 * "who did this".
 */

import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, CircleDot, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StageStatus } from '../../domain/types'
import { cn, duration, formatDateTime } from '../../lib/format'
import { msBetween } from './derive'
import { STAGE_ICONS } from './icons'
import type { LoopStageDef } from './types'

/** A stage the run has not reached yet has no server entry at all. */
export type TimelineStageStatus = StageStatus | 'pending'

export interface StageDetailPanelProps {
  stage: LoopStageDef
  status: TimelineStageStatus
  startedAt: string | null
  completedAt: string | null
  detail: string
  error: string | null
  /** The individual who acted, when one was recorded. The owning role always shows. */
  actor?: string | null
  /** Where the facts came from. Defaults to the stage hint in `STAGES`. */
  source?: ReactNode
  /** What this stage produced — a sandbox verdict, a target list, quiz results. */
  evidence?: ReactNode
  /** Stage-specific controls, e.g. "Open sandbox job". */
  actions?: ReactNode
  className?: string
}

const STATUS_STYLE: Record<
  TimelineStageStatus,
  { label: string; tone: string; icon: LucideIcon }
> = {
  // A stage completing is mechanical, not an outcome, so it stays neutral —
  // emerald is reserved for claims about risk actually being low.
  completed: { label: 'Completed', tone: 'text-fg-muted border-line', icon: CircleCheck },
  in_progress: { label: 'In progress', tone: 'text-brand border-brand/40', icon: CircleDot },
  failed: { label: 'Failed', tone: 'text-critical border-critical/40', icon: TriangleAlert },
  pending: { label: 'Not reached', tone: 'text-fg-faint border-line-subtle', icon: CircleDashed },
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label text-fg-faint">{label}</dt>
      <dd className="truncate text-xs text-fg-muted">{value}</dd>
    </div>
  )
}

/** The body of one timeline row. Used by `LoopTimeline`, usable on its own. */
export function StageDetailPanel({
  stage,
  status,
  startedAt,
  completedAt,
  detail,
  error,
  actor,
  source,
  evidence,
  actions,
  className,
}: StageDetailPanelProps) {
  const style = STATUS_STYLE[status]
  const StageIcon = STAGE_ICONS[stage.key]
  const elapsed = msBetween(startedAt, completedAt)

  return (
    <section
      className={cn('rounded-panel border border-line-subtle bg-surface p-4', className)}
      aria-label={`Stage ${stage.n}, ${stage.label}, ${style.label.toLowerCase()}`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StageIcon className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <h3 className="text-h text-fg">{stage.label}</h3>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs',
            style.tone,
          )}
        >
          <style.icon className="size-3.5" aria-hidden="true" />
          {style.label}
        </span>
        <span className="label ml-auto text-fg-faint">{stage.owner}</span>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Started" value={formatDateTime(startedAt)} />
        <Meta label="Completed" value={formatDateTime(completedAt)} />
        {/* No end time means we do not know how long it took — not that it was instant. */}
        <Meta label="Took" value={elapsed === null ? '—' : duration(elapsed)} />
        <Meta label="Actor" value={actor ? `${actor} (${stage.owner})` : stage.owner} />
      </dl>

      {detail && <p className="mt-3 text-body text-fg-muted">{detail}</p>}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-control border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical"
        >
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-fg-subtle">
        <span className="text-fg-faint">Source: </span>
        {source ?? stage.hint}
      </p>

      {evidence && (
        <div className="mt-3 rounded-control border border-line-subtle bg-base p-3">{evidence}</div>
      )}

      {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}
