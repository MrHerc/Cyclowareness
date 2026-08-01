/**
 * Where a single loop run stands, in one chip.
 *
 * On the colour choice: cyan is the brand and means "the loop is turning", so it
 * belongs to `running` and nothing else. The other four are outcomes with
 * genuine weight — a run that failed, a run blocked on a person, a run waiting
 * on employees, a run that closed — so they take the severity palette, which is
 * what that palette encodes. No status borrows a hue it has not earned.
 */

import { CircleCheck, GraduationCap, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LoopStatus } from '../../domain/types'
import { cn } from '../../lib/format'

export interface LoopStatusBadgeProps {
  status: LoopStatus
  className?: string
}

const STATUS: Record<
  LoopStatus,
  { label: string; tone: string; icon: LucideIcon | null }
> = {
  running: {
    label: 'Running',
    tone: 'text-brand bg-brand/10 border-brand/30',
    // A dot that breathes, not a spinner: the run is progressing, not blocking.
    icon: null,
  },
  awaiting_approval: {
    label: 'Awaiting approval',
    tone: 'text-medium bg-medium/10 border-medium/30',
    icon: ShieldCheck,
  },
  awaiting_training: {
    label: 'Awaiting training',
    tone: 'text-low bg-low/10 border-low/30',
    icon: GraduationCap,
  },
  completed: {
    label: 'Completed',
    tone: 'text-safe bg-safe/10 border-safe/30',
    icon: CircleCheck,
  },
  failed: {
    label: 'Failed',
    tone: 'text-critical bg-critical/10 border-critical/30',
    icon: TriangleAlert,
  },
}

/** The run-status chip used in tables, cards and run headers. */
export function LoopStatusBadge({ status, className }: LoopStatusBadgeProps) {
  const config = STATUS[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs whitespace-nowrap',
        config.tone,
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <span className="pulse-soft size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
      )}
      {config.label}
    </span>
  )
}
