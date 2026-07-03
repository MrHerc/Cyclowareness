// The signature UI: the loop, turning live. Seven stages on a ring, animated
// flow between them, live run counts pulsing on the active stages.
import { Inbox, FlaskConical, Sparkles, Crosshair, GraduationCap, Gauge, RefreshCw } from 'lucide-react'
import { STAGES, type RunSummary, type StageEntry } from '../lib/types'
import { cx } from './ui'

const ICONS = [Inbox, FlaskConical, Sparkles, Crosshair, GraduationCap, Gauge, RefreshCw]

const CX = 260
const CY = 240
const R = 168

function nodePos(index: number): { x: number; y: number; angle: number } {
  const angle = (-90 + index * (360 / 7)) * (Math.PI / 180)
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), angle }
}

function arcPath(fromIndex: number, toIndex: number, trim = 12): string {
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

  return (
    <svg viewBox="0 0 520 500" className="mx-auto w-full max-w-[560px]">
      {/* base ring segments with direction arrows */}
      <defs>
        <marker id="loop-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0.8 L 6.5 4 L 0 7.2 Z" fill="#2a3a5c" />
        </marker>
      </defs>
      {STAGES.map((s, i) => (
        <path
          key={`base-${s.n}`}
          d={arcPath(i, (i + 1) % 7)}
          fill="none"
          stroke="#1d2a45"
          strokeWidth={2}
          markerEnd="url(#loop-arrow)"
        />
      ))}
      {/* animated flow overlay — the loop is alive */}
      {STAGES.map((s, i) => {
        const hot = (countByStage.get(s.n) ?? 0) > 0
        return (
          <path
            key={`flow-${s.n}`}
            d={arcPath(i, (i + 1) % 7)}
            fill="none"
            stroke={hot ? '#2dd4bf' : '#2dd4bf33'}
            strokeWidth={hot ? 2.5 : 1.5}
            className="loop-flow"
          />
        )
      })}

      {/* stage nodes */}
      {STAGES.map((s, i) => {
        const { x, y } = nodePos(i)
        const count = countByStage.get(s.n) ?? 0
        const active = count > 0
        const Icon = ICONS[i]
        const labelY = y < CY - 40 ? y - 44 : y > CY + 40 ? y + 52 : y + (x < CX ? -44 : -44)
        return (
          <g
            key={s.n}
            onClick={() => onStageClick?.(s.n)}
            className={onStageClick ? 'cursor-pointer' : undefined}
          >
            <title>{`${s.label} — ${s.hint}`}</title>
            {active && (
              <circle cx={x} cy={y} r={36} fill="#2dd4bf" opacity={0.12} className="pulse-glow" />
            )}
            <circle
              cx={x}
              cy={y}
              r={27}
              fill={active ? '#0e2a2c' : '#121c31'}
              stroke={active ? '#2dd4bf' : '#2a3a5c'}
              strokeWidth={active ? 2 : 1.5}
            />
            <svg x={x - 11} y={y - 11} width={22} height={22}>
              <Icon size={22} color={active ? '#2dd4bf' : '#7e90b3'} strokeWidth={1.8} />
            </svg>
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              className="fill-current"
              fill={active ? '#e8eef9' : '#7e90b3'}
              fontSize={12}
              fontWeight={600}
              letterSpacing="0.08em"
            >
              {s.label.toUpperCase()}
            </text>
            <text x={x} y={labelY + 14} textAnchor="middle" fill="#55658a" fontSize={9.5}>
              {s.hint}
            </text>
            {count > 0 && (
              <g>
                <circle cx={x + 22} cy={y - 22} r={10} fill="#2dd4bf" />
                <text x={x + 22} y={y - 18.2} textAnchor="middle" fill="#06231f" fontSize={11} fontWeight={700}>
                  {count}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* center */}
      <text x={CX} y={CY - 26} textAnchor="middle" fill="#55658a" fontSize={10} letterSpacing="0.2em">
        LIVE LOOP RUNS
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" fill="#2dd4bf" fontSize={44} fontWeight={700}>
        {activeRuns.length}
      </text>
      {loopsClosed !== undefined && (
        <text x={CX} y={CY + 42} textAnchor="middle" fill="#7e90b3" fontSize={11}>
          {loopsClosed} loops closed
        </text>
      )}
    </svg>
  )
}

// Compact linear tracker for run cards & detail views.
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
  const dot = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => {
        const state = stageState(s.n)
        const isWaitingHere =
          (status === 'awaiting_approval' && s.n === 4) ||
          (status === 'awaiting_training' && s.n === 6)
        return (
          <div key={s.n} className="flex items-center gap-1" title={`${s.label}: ${state}`}>
            <div
              className={cx(
                'rounded-full',
                dot,
                state === 'done' && 'bg-accent',
                state === 'active' && 'bg-warn pulse-glow',
                state === 'failed' && 'bg-bad',
                state === 'pending' && (isWaitingHere ? 'border border-warn bg-warn/20' : 'border border-border-2 bg-transparent'),
              )}
            />
            {i < 6 && (
              <div className={cx('h-px w-2.5', state === 'done' ? 'bg-accent/50' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
