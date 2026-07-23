// The signature visual: the loop, turning live. Seven stages on a ring with
// animated flow between them and live run counts on the stages that are busy.
//
// Every colour reads from a CSS custom property so the same SVG works in both
// themes — the previous version hard-coded eight hex literals and turned
// invisible the moment the palette moved.
import { Inbox, FlaskConical, Sparkles, Crosshair, GraduationCap, Gauge, RefreshCw } from 'lucide-react'
import { STAGES, type RunSummary, type StageEntry } from '../lib/types'
import { cx } from './ui'

const ICONS = [Inbox, FlaskConical, Sparkles, Crosshair, GraduationCap, Gauge, RefreshCw]

const CX = 280
const CY = 270
const R = 186

function nodePos(index: number): { x: number; y: number } {
  const angle = (-90 + index * (360 / 7)) * (Math.PI / 180)
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
}

function arcPath(fromIndex: number, toIndex: number, trim = 13): string {
  const step = 360 / 7
  const a1 = (-90 + fromIndex * step + trim) * (Math.PI / 180)
  const a2 = (-90 + toIndex * step - trim + (toIndex < fromIndex ? 360 : 0)) * (Math.PI / 180)
  const x1 = CX + R * Math.cos(a1)
  const y1 = CY + R * Math.sin(a1)
  const x2 = CX + R * Math.cos(a2)
  const y2 = CY + R * Math.sin(a2)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

export function LoopViz({
  activeRuns,
  loopsClosed,
  onStageClick,
}: {
  activeRuns: RunSummary[]
  loopsClosed?: number
  onStageClick?: (stage: number) => void
}) {
  const countByStage = new Map<number, number>()
  for (const run of activeRuns) {
    countByStage.set(run.current_stage, (countByStage.get(run.current_stage) ?? 0) + 1)
  }

  const busy = STAGES.filter((s) => (countByStage.get(s.n) ?? 0) > 0)
  const summary =
    activeRuns.length === 0
      ? 'No loop runs are in flight.'
      : `${activeRuns.length} loop ${activeRuns.length === 1 ? 'run' : 'runs'} in flight: ` +
        busy.map((s) => `${countByStage.get(s.n)} at ${s.label}`).join(', ') + '.'

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 560 560"
        className="mx-auto w-full max-w-[520px]"
        role="img"
        aria-label={`The seven-stage loop. ${summary}${loopsClosed !== undefined ? ` ${loopsClosed} loops closed to date.` : ''}`}
      >
        <defs>
          <marker id="loop-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0.8 L 6.5 4 L 0 7.2 Z" fill="var(--color-line-strong)" />
          </marker>
        </defs>

        {/* the track */}
        {STAGES.map((s, i) => (
          <path
            key={`base-${s.n}`}
            d={arcPath(i, (i + 1) % 7)}
            fill="none"
            stroke="var(--color-hair)"
            strokeWidth={2}
            markerEnd="url(#loop-arrow)"
          />
        ))}

        {/* the flow — brighter on segments leaving a stage that holds runs */}
        {STAGES.map((s, i) => {
          const hot = (countByStage.get(s.n) ?? 0) > 0
          return (
            <path
              key={`flow-${s.n}`}
              d={arcPath(i, (i + 1) % 7)}
              fill="none"
              stroke="var(--color-brand)"
              strokeOpacity={hot ? 0.95 : 0.22}
              strokeWidth={hot ? 2.5 : 1.5}
              className="loop-flow"
            />
          )
        })}

        {/* stages */}
        {STAGES.map((s, i) => {
          const { x, y } = nodePos(i)
          const count = countByStage.get(s.n) ?? 0
          const active = count > 0
          const Icon = ICONS[i]
          // Labels sit radially outside the ring so they never collide with the
          // track or with each other.
          const outward = 1 + 46 / R
          const lx = CX + (x - CX) * outward
          const ly = CY + (y - CY) * outward
          const anchor = Math.abs(lx - CX) < 30 ? 'middle' : lx > CX ? 'start' : 'end'
          return (
            <g
              key={s.n}
              onClick={() => onStageClick?.(s.n)}
              className={onStageClick ? 'cursor-pointer' : undefined}
              style={{ color: active ? 'var(--color-brand-fg)' : 'var(--color-c3)' }}
            >
              <title>{`Stage ${s.n} — ${s.label}: ${s.hint}${count ? ` · ${count} in flight` : ''}`}</title>
              <circle
                cx={x}
                cy={y}
                r={26}
                fill={active ? 'var(--color-brand-dim)' : 'var(--color-panel)'}
                stroke={active ? 'var(--color-brand)' : 'var(--color-line)'}
                strokeWidth={active ? 2 : 1.5}
              />
              <svg x={x - 10} y={y - 10} width={20} height={20}>
                <Icon size={20} color="currentColor" strokeWidth={1.75} />
              </svg>
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fill={active ? 'var(--color-c1)' : 'var(--color-c2)'}
                fontSize={12.5}
                fontWeight={600}
                letterSpacing="0.02em"
              >
                {s.label}
              </text>
              <text x={lx} y={ly + 14} textAnchor={anchor} fill="var(--color-c3)" fontSize={10.5}>
                {s.hint}
              </text>
              {count > 0 && (
                <>
                  <circle cx={x + 20} cy={y - 20} r={10} fill="var(--color-brand)" />
                  <text x={x + 20} y={y - 16.2} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
                    {count}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* centre readout */}
        <text x={CX} y={CY - 24} textAnchor="middle" fill="var(--color-c3)" fontSize={10.5} letterSpacing="0.16em">
          IN FLIGHT
        </text>
        <text x={CX} y={CY + 20} textAnchor="middle" fill="var(--color-c1)" fontSize={46} fontWeight={650}>
          {activeRuns.length}
        </text>
        {loopsClosed !== undefined && (
          <text x={CX} y={CY + 44} textAnchor="middle" fill="var(--color-c2)" fontSize={12}>
            {loopsClosed} loops closed
          </text>
        )}
      </svg>
    </figure>
  )
}

/** Compact linear tracker for run rows and detail views. */
export function StageTracker({
  history,
  status,
  size = 'md',
}: {
  history: StageEntry[]
  status: string
  size?: 'sm' | 'md'
}) {
  const stageState = (n: number): 'done' | 'active' | 'failed' | 'pending' => {
    const entries = history.filter((h) => h.stage === n)
    const last = entries[entries.length - 1]
    if (last?.status === 'failed') return 'failed'
    if (last?.status === 'completed') return 'done'
    if (last?.status === 'in_progress') return 'active'
    return 'pending'
  }
  const done = STAGES.filter((s) => stageState(s.n) === 'done').length
  const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`Stage ${done} of ${STAGES.length} complete`}
    >
      {STAGES.map((s, i) => {
        const state = stageState(s.n)
        const waitingHere =
          (status === 'awaiting_approval' && s.n === 4) || (status === 'awaiting_training' && s.n === 6)
        return (
          <span key={s.n} className="inline-flex items-center gap-1">
            <span
              title={`${s.label}: ${state}`}
              className={cx(
                'rounded-full',
                dot,
                state === 'done' && 'bg-brand',
                state === 'active' && 'bg-warning breathe',
                state === 'failed' && 'bg-danger',
                state === 'pending' && (waitingHere ? 'bg-warning/40 ring-1 ring-warning' : 'bg-line-strong'),
              )}
            />
            {i < STAGES.length - 1 && (
              <span className={cx('h-px w-2', state === 'done' ? 'bg-brand/50' : 'bg-hair')} />
            )}
          </span>
        )
      })}
    </span>
  )
}
