/**
 * The closed loop — the product's signature figure.
 *
 * WHY HAND-BUILT SVG RATHER THAN REACT FLOW
 * The topology here is fixed and known: seven stages, one gate, one closing
 * edge. A layout engine solves a problem this figure does not have, and would
 * still need custom node and edge types to draw the gate corner and the return
 * arc. Three concrete costs decided it:
 *   1. React Flow's stylesheet ships its own colour literals, which is exactly
 *      what `design/tokens.css` exists to prevent.
 *   2. Its canvas pans and zooms. On a projector, one stray trackpad gesture
 *      drags the signature image off screen mid-demo.
 *   3. `.flow-line` in tokens.css is an SVG dash animation. The foundation
 *      already anticipated the edges being SVG paths.
 * The nodes are real HTML inside `<foreignObject>`, so they are real `<button>`
 * elements with real focus rings — and they scale with the viewBox, so the
 * geometry can never drift out of alignment with the edges.
 *
 * WHAT ANIMATES
 * An edge only animates when the stage it feeds is genuinely processing. The
 * edge into the gate never animates: arriving at a gate is stopping, not moving.
 * Nothing here loops for decoration.
 */

import { useId } from 'react'
import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'
import { cn } from '../../lib/format'
import { ClosedLoopStage } from './ClosedLoopStage'
import { describeFlow, EMPTY_COUNTS, stageStateOf } from './derive'
import type { GateActivity, LoopStageKey, StageActivity } from './types'

export interface ClosedLoopFlowProps {
  /** One entry per stage, keyed by `stage` (1–7). A missing stage reads as zero. */
  stages: StageActivity[]
  /** The human approval gate that sits after stage 3. */
  gate: GateActivity
  /** Highlights one stage node. `null` or omitted means no filter is on. */
  selectedStage?: number | null
  /** True when the gate node is the active filter. */
  gateSelected?: boolean
  /** Click-to-filter. Omit and the nodes render as static, non-focusable cards. */
  onStageClick?: (stage: number, key: LoopStageKey) => void
  /** Omit and the gate node renders static, like the stages. */
  onGateClick?: () => void
  /** e.g. "Last 30 days" — printed with the caption so counts carry their window. */
  windowLabel?: string
  className?: string
}

/* -- geometry, in viewBox units ------------------------------------------- */

const VB_W = 1180
const VB_H = 496
const CARD_W = 190
const CARD_H = 120
const GATE_W = 168
const GATE_H = 148
const ROW_TOP = 108
const ROW_BOTTOM = 400
/** Breathing room inside each foreignObject so focus rings are not clipped. */
const PAD = 8

/** Stage number -> node centre. Stages 1–3 run left to right, 4–7 run back. */
const CENTRES: Record<number, { x: number; y: number }> = {
  1: { x: 196, y: ROW_TOP },
  2: { x: 462, y: ROW_TOP },
  3: { x: 728, y: ROW_TOP },
  4: { x: 986, y: ROW_BOTTOM },
  5: { x: 728, y: ROW_BOTTOM },
  6: { x: 462, y: ROW_BOTTOM },
  7: { x: 196, y: ROW_BOTTOM },
}

const GATE_CENTRE = { x: 986, y: ROW_TOP }

/**
 * Edges, hand-placed to stop at the node borders. `feeds` names the stage an
 * edge delivers into — that is what decides whether it animates.
 */
const EDGES: { id: string; d: string; feeds: number | 'gate' }[] = [
  { id: '1-2', d: 'M291,108 L367,108', feeds: 2 },
  { id: '2-3', d: 'M557,108 L633,108', feeds: 3 },
  { id: '3-gate', d: 'M823,108 L902,108', feeds: 'gate' },
  { id: 'gate-4', d: 'M986,182 L986,340', feeds: 4 },
  { id: '4-5', d: 'M891,400 L823,400', feeds: 5 },
  { id: '5-6', d: 'M633,400 L557,400', feeds: 6 },
  { id: '6-7', d: 'M367,400 L291,400', feeds: 7 },
  // The closing edge. Its bow to the left is the whole point of the figure:
  // measurement re-enters intake, and you can see it do so.
  { id: '7-1', d: 'M101,400 C34,400 34,108 101,108', feeds: 1 },
]

const EMPTY_ACTIVITY: StageActivity = {
  stage: 0,
  counts: EMPTY_COUNTS,
  timing: { avgMs: null, sample: 0 },
}

/* -------------------------------------------------------------------------- */

/**
 * The interactive seven-stage loop, with the human approval gate as its own node.
 *
 * Prevents the mistake of drawing a pipeline that merely *ends*: stage 7 feeds
 * stage 1 on screen, so nobody has to be told the loop closes.
 */
export function ClosedLoopFlow({
  stages,
  gate,
  selectedStage = null,
  gateSelected = false,
  onStageClick,
  onGateClick,
  windowLabel,
  className,
}: ClosedLoopFlowProps) {
  // `useId` output carries delimiters (`:r0:`, `«r0»` depending on the React
  // build) that are not safe inside an SVG `url(#…)` reference.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const captionId = `${uid}-caption`

  const activityOf = (n: number): StageActivity =>
    stages.find((s) => s.stage === n) ?? { ...EMPTY_ACTIVITY, stage: n }

  const isProcessing = (n: number) => stageStateOf(activityOf(n).counts) === 'active'
  const description = describeFlow(stages, gate)

  return (
    <figure className={cn('m-0', className)}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="mx-auto block h-auto w-full min-w-[900px] max-w-[1180px]"
          aria-labelledby={captionId}
        >
          <defs>
            <marker
              id={`${uid}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L9,5 L0,9 Z" fill="var(--color-fg-faint)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const inFlight = edge.feeds !== 'gate' && isProcessing(edge.feeds)
            return (
              <g key={edge.id}>
                <path
                  d={edge.d}
                  fill="none"
                  stroke="var(--color-line)"
                  strokeWidth={1.5}
                  markerEnd={`url(#${uid}-arrow)`}
                />
                {inFlight && (
                  <path
                    d={edge.d}
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="flow-line"
                  />
                )}
              </g>
            )
          })}

          <text
            x={36}
            y={254}
            transform="rotate(-90 36 254)"
            textAnchor="middle"
            className="label"
            fill="var(--color-fg-faint)"
          >
            Back to intake
          </text>

          {STAGES.map((stage) => {
            const centre = CENTRES[stage.n]
            const activity = activityOf(stage.n)
            return (
              <foreignObject
                key={stage.key}
                x={centre.x - CARD_W / 2 - PAD}
                y={centre.y - CARD_H / 2 - PAD}
                width={CARD_W + PAD * 2}
                height={CARD_H + PAD * 2}
              >
                <div className="flex h-full w-full items-stretch p-2">
                  <ClosedLoopStage
                    kind="stage"
                    stage={stage}
                    state={stageStateOf(activity.counts)}
                    counts={activity.counts}
                    timing={activity.timing}
                    selected={selectedStage === stage.n}
                    onClick={onStageClick ? () => onStageClick(stage.n, stage.key) : undefined}
                  />
                </div>
              </foreignObject>
            )
          })}

          <foreignObject
            x={GATE_CENTRE.x - GATE_W / 2 - PAD}
            y={GATE_CENTRE.y - GATE_H / 2 - PAD}
            width={GATE_W + PAD * 2}
            height={GATE_H + PAD * 2}
          >
            <div className="flex h-full w-full items-stretch p-2">
              <ClosedLoopStage
                kind="gate"
                waiting={gate.waiting}
                approved={gate.approved}
                oldestWaitSeconds={gate.oldestWaitSeconds}
                selected={gateSelected}
                onClick={onGateClick}
              />
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Deliberately not aria-live. This figure repolls every few seconds, and
          announcing the whole summary on every tick would make the page
          unusable with a screen reader. It is the figure's label instead. */}
      <figcaption
        id={captionId}
        className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-fg-muted"
      >
        <span>{description}</span>
        <span className="text-xs text-fg-faint">
          {windowLabel ? `${windowLabel} · ` : ''}Gate after stage {APPROVAL_GATE_AFTER_STAGE}
        </span>
      </figcaption>
    </figure>
  )
}
