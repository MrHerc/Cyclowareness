/**
 * The standard "we cannot say" block.
 *
 * An empty state that only says "No data" leaves the reader to decide whether
 * the system is broken, idle, or hiding something. This one always carries two
 * things: why there is no measurement, and what would produce one. That second
 * sentence is what turns a dead panel into the next action.
 *
 * Use this where a chart or a panel would have gone. For a single cell or stat
 * row use `NoMeasurement` instead.
 */

import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '../../lib/format'
import { SampleSizeLabel } from './SampleSizeLabel'

export interface InsufficientDataStateProps {
  /** Sentence case. Defaults to the honest general case. */
  title?: string
  /** Why nothing can be measured: "no simulation results in this period". */
  reason: string
  /** What would make it measurable: "launch a campaign to start measuring". */
  remedy?: string
  /** What was counted, when anything was counted at all. */
  sample?: number
  sampleNoun?: string
  windowDays?: number
  /** A button or link the caller supplies — this component never navigates. */
  action?: ReactNode
  className?: string
}

export function InsufficientDataState({
  title = 'Not enough data to measure',
  reason,
  remedy,
  sample,
  sampleNoun,
  windowDays,
  action,
  className,
}: InsufficientDataStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-panel border border-dashed border-line px-5 py-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-fg-faint" aria-hidden="true" />
        <div>
          <p className="text-h text-fg-muted">{title}</p>
          <p className="mt-1 text-sm text-fg-subtle">{reason}</p>
          {remedy ? <p className="mt-1 text-sm text-fg-faint">{remedy}</p> : null}
        </div>
      </div>

      {sample !== undefined && sampleNoun ? (
        <SampleSizeLabel sample={sample} noun={sampleNoun} windowDays={windowDays} className="pl-8" />
      ) : null}

      {action ? <div className="pl-8">{action}</div> : null}
    </div>
  )
}
