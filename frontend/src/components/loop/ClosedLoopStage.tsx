/**
 * One node in the closed-loop figure — either a stage or the human approval gate.
 *
 * The gate is a variant of this component rather than a line style on an edge,
 * because it is the product's most important control: a reviewer must be able to
 * point at it from across a room. It gets its own surface, its own frame and its
 * own copy, and it is the only node that says a person is required.
 *
 * Sizing is the parent's job — the node fills whatever box it is given, so the
 * flow can lay it out in SVG coordinates and a card can lay it out in CSS.
 */

import type { ReactNode } from 'react'
import { useT, type TFunction } from '../../lib/i18n'
import { ShieldCheck } from 'lucide-react'
import { cn, duration } from '../../lib/format'
import { STAGE_ICONS } from './icons'
import type { LoopStageDef, LoopStageState, StageCounts, StageTiming } from './types'

interface CommonNodeProps {
  /** Draws the selection ring. The caller owns "which filter is on". */
  selected?: boolean
  /** Omit to render a static, non-focusable card — every fact is on it either way. */
  onClick?: () => void
  className?: string
}

export interface ClosedLoopStageNodeProps extends CommonNodeProps {
  kind: 'stage'
  stage: LoopStageDef
  state: LoopStageState
  counts: StageCounts
  timing: StageTiming
}

export interface ClosedLoopGateNodeProps extends CommonNodeProps {
  kind: 'gate'
  /** Runs parked at the gate right now. */
  waiting: number
  /** Runs the gate has released in the window. */
  approved: number
  /** Longest current wait in seconds; `null` when nothing is waiting. */
  oldestWaitSeconds: number | null
}

export type ClosedLoopStageProps = ClosedLoopStageNodeProps | ClosedLoopGateNodeProps

/* -------------------------------------------------------------------------- */

/** Frame and accent per state. Risk hues appear only where the state is a problem. */
const STATE_STYLE: Record<LoopStageState, { frame: string; dot: string }> = {
  idle: { frame: 'border-line-subtle bg-surface', dot: 'bg-fg-faint' },
  active: { frame: 'border-brand/45 bg-elevated', dot: 'bg-brand pulse-soft' },
  waiting: { frame: 'border-medium/40 bg-elevated', dot: 'bg-medium' },
  failed: { frame: 'border-critical/50 bg-elevated', dot: 'bg-critical' },
  complete: { frame: 'border-line bg-elevated', dot: 'bg-fg-subtle' },
}

/** Only non-zero counts are drawn: a row of zeroes is noise pretending to be data. */
function countChips(counts: StageCounts): { text: string; tone: string }[] {
  const chips: { text: string; tone: string }[] = []
  if (counts.failed > 0) {
    chips.push({ text: `${counts.failed} failed`, tone: 'text-critical bg-critical/10' })
  }
  if (counts.active > 0) {
    chips.push({ text: `${counts.active} active`, tone: 'text-brand bg-brand/10' })
  }
  if (counts.waiting > 0) {
    chips.push({ text: `${counts.waiting} waiting`, tone: 'text-medium bg-medium/10' })
  }
  return chips
}

function timingLine(timing: StageTiming, t: TFunction): string {
  // `null` is "never measured". Rendering it as 0ms would invent a fact.
  if (timing.avgMs === null) return t('p.duration-not-measured')
  return t('p.avg-over-n', { avg: duration(timing.avgMs), sample: timing.sample })
}

function waitLine(seconds: number | null): string {
  if (seconds === null) return 'Queue clear'
  return `oldest ${duration(seconds * 1000)}`
}

/* -------------------------------------------------------------------------- */

/** A stage node, or the approval gate when `kind` is `'gate'`. */
export function ClosedLoopStage(props: ClosedLoopStageProps) {
  const t = useT()
  const { selected, onClick, className } = props

  let frameClass: string
  let label: string
  let body: ReactNode

  if (props.kind === 'gate') {
    const { waiting, approved, oldestWaitSeconds } = props
    // Brand-framed at every state: this is the control the product is built
    // around, not a status that comes and goes.
    frameClass = 'items-center justify-center gap-1.5 border-brand/50 bg-brand/10 text-center shadow-float'
    label =
      `Approval gate between stage 3 and stage 4. ` +
      `${waiting} waiting for a human decision. ${waitLine(oldestWaitSeconds)}. ${approved} released.`
    body = (
      <>
        <ShieldCheck className="size-5 text-brand" aria-hidden="true" />
        <span className="label text-brand-fg" aria-hidden="true">
          Approval gate
        </span>
        <span className="text-xs text-fg-muted" aria-hidden="true">
          Human decision required
        </span>
        <span className="flex items-baseline gap-1.5" aria-hidden="true">
          <span className={cn('text-title', waiting > 0 ? 'text-medium' : 'text-fg-subtle')}>
            {waiting}
          </span>
          <span className="text-xs text-fg-subtle">waiting</span>
        </span>
        <span className="text-xs text-fg-faint" aria-hidden="true">
          {waitLine(oldestWaitSeconds)} · {approved} released
        </span>
      </>
    )
  } else {
    const { stage, state, counts, timing } = props
    const style = STATE_STYLE[state]
    const Icon = STAGE_ICONS[stage.key]
    const chips = countChips(counts)
    const occupancy = chips.length > 0 ? chips.map((c) => c.text).join(', ') : 'no runs here'

    frameClass = style.frame
    label = [
      `Stage ${stage.n} of 7, ${t(stage.labelKey)}`,
      `owned by ${t(stage.ownerKey)}`,
      occupancy,
      `${counts.completed} cleared`,
      timingLine(timing, t),
    ].join('. ')

    body = (
      <>
        <span className="flex items-center gap-2" aria-hidden="true">
          <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} />
          <span className="tech text-fg-faint">{String(stage.n).padStart(2, '0')}</span>
          <span className="label ml-auto truncate text-fg-faint">{t(stage.ownerKey)}</span>
        </span>

        <span className="flex items-center gap-2" aria-hidden="true">
          <Icon
            className={cn('size-4 shrink-0', state === 'idle' ? 'text-fg-faint' : 'text-fg-muted')}
          />
          <span className="truncate text-sm font-semibold text-fg">{t(stage.labelKey)}</span>
        </span>

        <span className="flex items-center gap-1.5 overflow-hidden" aria-hidden="true">
          {chips.length === 0 ? (
            <span className="text-xs text-fg-faint">No runs here</span>
          ) : (
            chips.slice(0, 2).map((chip) => (
              <span
                key={chip.text}
                className={cn('shrink-0 rounded-chip px-1.5 py-0.5 text-xs', chip.tone)}
              >
                {chip.text}
              </span>
            ))
          )}
          <span className="ml-auto shrink-0 text-xs text-fg-faint">{counts.completed} cleared</span>
        </span>

        <span className="truncate text-xs text-fg-subtle" aria-hidden="true">
          {timingLine(timing, t)}
        </span>
      </>
    )
  }

  const shell = cn(
    'flex h-full w-full flex-col justify-between overflow-hidden rounded-panel border px-3 py-2.5',
    'text-left shadow-panel transition-colors duration-200',
    frameClass,
    selected && 'border-brand ring-1 ring-brand',
    className,
  )

  // The visible content is aria-hidden and the accessible name comes from one
  // sentence, so a screen reader hears "3 active, 12 cleared" instead of a
  // scattered pile of orphaned numbers.
  const content = (
    <>
      <span className="sr-only">{label}</span>
      {body}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected ?? false}
        className={cn(shell, 'cursor-pointer hover:border-line-strong')}
      >
        {content}
      </button>
    )
  }

  return <div className={shell}>{content}</div>
}
