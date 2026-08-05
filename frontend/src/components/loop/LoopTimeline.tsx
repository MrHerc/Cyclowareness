/**
 * One run, top to bottom — the page an analyst reads to find out what happened.
 *
 * All seven stages are always listed, including the ones the run never reached,
 * because "stage 5 is missing from this list" and "stage 5 never ran" look
 * identical if you only render what the server sent.
 *
 * The approval gate gets its own row between stages 3 and 4. When no approval
 * record was supplied, the row says the decision was not loaded rather than
 * quietly implying someone approved it.
 */

import { useT } from '../../lib/i18n'
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'
import type { ApprovalDecision, LoopStatus, StageEntry } from '../../domain/types'
import { cn, formatDateTime, timeAgo } from '../../lib/format'
import { StageDetailPanel } from './StageDetailPanel'
import type { TimelineStageStatus } from './StageDetailPanel'

/** What is known about the human decision at the gate. */
export interface LoopGateRecord {
  decision: ApprovalDecision | null
  actor: string | null
  at: string | null
  comment?: string | null
}

export interface LoopTimelineProps {
  history: StageEntry[]
  /** `LoopRun.current_stage`. */
  currentStage: number
  status: LoopStatus
  /**
   * The approval decision. Omit (or pass `null`) when it was not loaded — the
   * gate row will say so instead of inventing an approver.
   */
  gate?: LoopGateRecord | null
  /** The individual who acted on a stage, when one was recorded. */
  actorFor?: (stage: number) => string | null | undefined
  /** What a stage produced: sandbox verdict, target list, quiz results. */
  renderEvidence?: (stage: number) => ReactNode
  /** Stage-specific controls. */
  renderActions?: (stage: number) => ReactNode
  /** Controls for the gate row, e.g. "Open the approval". */
  gateActions?: ReactNode
  className?: string
}

const DECISION_LABEL: Record<ApprovalDecision, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  request_revision: 'Revision requested',
}

type GateState = 'pending' | 'waiting' | 'decided' | 'released'

function Rail({ children, tone, connected }: { children: ReactNode; tone: string; connected: boolean }) {
  return (
    <div className="relative flex w-8 shrink-0 justify-center">
      {connected && (
        <span
          aria-hidden="true"
          className="absolute top-8 -bottom-6 left-1/2 w-px -translate-x-1/2 bg-line-subtle"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 flex size-8 items-center justify-center rounded-full border bg-base',
          tone,
        )}
      >
        {children}
      </span>
    </div>
  )
}

/** The vertical run timeline: seven stages plus the human gate. */
export function LoopTimeline({
  history,
  currentStage,
  status,
  gate,
  actorFor,
  renderEvidence,
  renderActions,
  gateActions,
  className,
}: LoopTimelineProps) {
  const t = useT()
  const entryFor = (n: number) => history.find((e) => e.stage === n)

  const gateState: GateState = gate?.decision
    ? 'decided'
    : status === 'awaiting_approval'
      ? 'waiting'
      : currentStage > APPROVAL_GATE_AFTER_STAGE
        ? 'released'
        : 'pending'

  const waitingSince = entryFor(APPROVAL_GATE_AFTER_STAGE)?.completed_at ?? null

  const gateBody: Record<GateState, { detail: string; meta: string | null }> = {
    pending: {
      detail: 'Not reached. Nothing has been proposed for review on this run yet.',
      meta: null,
    },
    waiting: {
      detail: 'Waiting for a human decision. No targeting or training happens until it is given.',
      meta: waitingSince ? `Waiting since ${formatDateTime(waitingSince)} (${timeAgo(waitingSince)})` : null,
    },
    decided: {
      detail: gate?.comment?.trim()
        ? gate.comment.trim()
        : 'The decision was recorded without a comment.',
      meta:
        gate && gate.decision
          ? `${DECISION_LABEL[gate.decision]}${gate.actor ? ` by ${gate.actor}` : ''} · ${formatDateTime(gate.at)}`
          : null,
    },
    released: {
      // Capability honesty: we know it passed, we do not know who let it through.
      detail:
        'Released by a human — the run could not have reached targeting otherwise. The approval record was not loaded, so the reviewer and comment are not shown here.',
      meta: null,
    },
  }

  const gateTone =
    gateState === 'waiting'
      ? 'border-medium/50 text-medium'
      : gateState === 'pending'
        ? 'border-line-subtle text-fg-faint'
        : 'border-brand/50 text-brand'

  const lastStage = STAGES[STAGES.length - 1].n

  return (
    <ol className={cn('m-0 list-none p-0', className)}>
      {STAGES.map((stage) => {
        const n = stage.n
        const entry = entryFor(n)
        const stageStatus: TimelineStageStatus = entry?.status ?? 'pending'
        const tone =
          stageStatus === 'failed'
            ? 'border-critical/50 text-critical'
            : stageStatus === 'in_progress'
              ? 'border-brand/50 text-brand'
              : stageStatus === 'completed'
                ? 'border-line text-fg-muted'
                : 'border-line-subtle text-fg-faint'

        return (
          <li key={stage.key}>
            <div className={cn('flex gap-4', n === lastStage ? 'pb-0' : 'pb-6')}>
              <Rail tone={tone} connected={n !== lastStage}>
                <span className="tech">{n}</span>
              </Rail>
              <div className="min-w-0 flex-1">
                <StageDetailPanel
                  stage={stage}
                  status={stageStatus}
                  startedAt={entry?.started_at ?? null}
                  completedAt={entry?.completed_at ?? null}
                  detail={entry?.detail ?? ''}
                  error={entry?.error ?? null}
                  actor={actorFor?.(n) ?? null}
                  evidence={renderEvidence?.(n)}
                  actions={renderActions?.(n)}
                />
              </div>
            </div>

            {n === APPROVAL_GATE_AFTER_STAGE && (
              <div className="flex gap-4 pb-6">
                <Rail tone={gateTone} connected>
                  <ShieldCheck className="size-4" />
                </Rail>
                <div className="min-w-0 flex-1">
                  <section
                    className="rounded-panel border border-brand/40 bg-brand/5 p-4"
                    aria-label="Approval gate"
                  >
                    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="text-h text-fg">{t('y.approval-gate')}</h3>
                      <span
                        className={cn(
                          'rounded-chip border px-2 py-0.5 text-xs',
                          gateState === 'waiting'
                            ? 'border-medium/40 text-medium'
                            : gateState === 'pending'
                              ? 'border-line-subtle text-fg-faint'
                              : 'border-brand/40 text-brand',
                        )}
                      >
                        {gateState === 'decided' && gate?.decision
                          ? DECISION_LABEL[gate.decision]
                          : gateState === 'waiting'
                            ? 'Awaiting decision'
                            : gateState === 'released'
                              ? 'Released'
                              : 'Not reached'}
                      </span>
                      <span className="label ml-auto text-fg-faint">Analyst</span>
                    </header>

                    {gateBody[gateState].meta && (
                      <p className="mt-2 text-xs text-fg-subtle">{gateBody[gateState].meta}</p>
                    )}
                    <p className="mt-2 text-body text-fg-muted">{gateBody[gateState].detail}</p>

                    {gateActions && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">{gateActions}</div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
