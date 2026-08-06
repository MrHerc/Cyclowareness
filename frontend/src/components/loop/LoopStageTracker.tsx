/**
 * The seven-dot loop tracker for table rows and cards.
 *
 * Small enough to sit in a dense row, but it still shows the approval gate as a
 * tick between dots three and four — the gate is the one thing about the loop a
 * reader must never have to infer.
 *
 * Announced as one string ("Stage 4 of 7, awaiting approval"), because seven
 * unlabelled dots are meaningless read one at a time.
 */

import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'
import { useT } from '../../lib/i18n'
import type { LoopStatus } from '../../domain/types'
import { cn, humanise } from '../../lib/format'

export interface LoopStageTrackerProps {
  /** `LoopRun.current_stage`. Clamped to 1–7 rather than trusted blindly. */
  currentStage: number
  status: LoopStatus
  /** Adds the stage name beside the dots. Off by default — rows are tight. */
  showLabel?: boolean
  className?: string
}

const TOTAL = STAGES.length

/** How the dot for the stage the run is sitting on is drawn. */
const CURRENT_DOT: Record<LoopStatus, string> = {
  running: 'bg-brand pulse-soft',
  awaiting_approval: 'bg-transparent ring-1 ring-medium',
  awaiting_training: 'bg-low',
  completed: 'bg-safe',
  failed: 'bg-critical',
}

export function LoopStageTracker({
  currentStage,
  status,
  showLabel = false,
  className,
}: LoopStageTrackerProps) {
  const t = useT()
  const current = Math.min(Math.max(Math.round(currentStage) || 1, 1), TOTAL)
  const stage = STAGES.find((s) => s.n === current)
  const label = `Stage ${current} of ${TOTAL}, ${humanise(status).toLowerCase()}`

  const dotClass = (n: number) => {
    // A closed loop is shown whole: every dot carries the outcome, not just the last.
    if (status === 'completed') return 'bg-safe'
    if (n < current) return 'bg-fg-subtle'
    if (n === current) return CURRENT_DOT[status]
    return 'bg-line-strong'
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span role="img" aria-label={label} className="inline-flex items-center gap-1">
        {STAGES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full', dotClass(s.n))} aria-hidden="true" />
            {s.n === APPROVAL_GATE_AFTER_STAGE && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-3 w-px',
                  status === 'awaiting_approval' ? 'bg-medium' : 'bg-line-strong',
                )}
              />
            )}
          </span>
        ))}
      </span>
      {showLabel && stage && (
        <span className="truncate text-xs text-fg-subtle" aria-hidden="true">
          {t(stage.labelKey)}
        </span>
      )}
    </span>
  )
}
