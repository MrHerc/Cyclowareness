/**
 * The loop, in one glance, from anywhere in the product.
 *
 * It answers two questions an analyst asks all day: is anything moving, and is
 * anything waiting on me. Those are different facts and they get different
 * hues — cyan for "running" because the loop moving is a process fact, medium
 * for "waiting at the gate" because a queue ageing is a real problem.
 *
 * Deliberately **not** an `aria-live` region. The dashboard behind it repolls
 * every four seconds; announcing every tick would make the product unusable
 * with a screen reader. The pill is a link to the place where the detail lives.
 */

import { Radar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tooltip } from '../ui'
import { cn } from '../../lib/format'
import { useAnalystDashboard } from '../../lib/api/queries'

export interface LoopStatusPillProps {
  className?: string
}

const PILL =
  'inline-flex items-center gap-2 rounded-chip border border-line px-2 py-0.5 text-xs whitespace-nowrap transition-colors hover:border-line-strong hover:bg-raised'

export function LoopStatusPill({ className }: LoopStatusPillProps) {
  const { data, isPending, isError } = useAnalystDashboard()

  if (isPending || isError) {
    return (
      <Tooltip
        content={
          isError
            ? 'The loop counts could not be read. Open Closed Loops for the error in full.'
            : 'Reading the live loop counts.'
        }
      >
        <span
          className={cn(
            PILL,
            'border-dashed text-fg-faint hover:border-line hover:bg-transparent',
            className,
          )}
        >
          <Radar className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          {isError ? 'Loop status unavailable' : 'Loop status'}
        </span>
      </Tooltip>
    )
  }

  const running = data.counts.active_runs
  const waiting = data.counts.awaiting_approval

  return (
    <Tooltip
      content={
        <span className="block space-y-1">
          <span className="block">
            {running === 0
              ? 'No loop runs are executing right now.'
              : `${running} loop ${running === 1 ? 'run is' : 'runs are'} executing.`}
          </span>
          <span className="block">
            {waiting === 0
              ? 'Nothing is waiting at the approval gate.'
              : `${waiting} ${waiting === 1 ? 'run is' : 'runs are'} waiting for a human decision.`}
          </span>
          <span className="block text-fg-subtle">Open Closed Loops for the full picture.</span>
        </span>
      }
    >
      <Link to="/loops" className={cn(PILL, 'text-fg-muted', className)}>
        <Radar className="size-3.5 shrink-0 text-brand" aria-hidden="true" strokeWidth={1.75} />
        <span className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full bg-brand', running > 0 && 'pulse-soft')}
          />
          <span className="text-fg">{running}</span>
          <span className="text-fg-faint">running</span>
        </span>
        <span aria-hidden="true" className="text-fg-faint">
          ·
        </span>
        <span className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full', waiting > 0 ? 'bg-medium' : 'bg-fg-subtle')}
          />
          <span className={waiting > 0 ? 'text-medium' : 'text-fg'}>{waiting}</span>
          <span className="text-fg-faint">at gate</span>
        </span>
      </Link>
    </Tooltip>
  )
}
