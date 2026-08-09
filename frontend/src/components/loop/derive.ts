/**
 * Turning loop runs into a picture of the loop.
 *
 * Every page that draws the flow needs the same aggregate, and every page that
 * computes it separately gets it subtly differently — one counts a run with a
 * `null` completed_at as a zero-second stage, another counts an approval gate
 * wait as time spent in Conversion. Doing it once, here, is the only way the
 * number under the node means the same thing on the dashboard and on the run
 * list.
 *
 * Nothing in this file fabricates. A stage with no completed passes gets
 * `avgMs: null`, not `avgMs: 0`.
 */

import type { TFunction } from '../../lib/i18n'
import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'
import type { RunSummary, StageEntry } from '../../domain/types'
import type {
  GateActivity,
  LoopActivity,
  LoopStageState,
  StageActivity,
  StageCounts,
} from './types'

/** Where training waits, resolved from the frozen table rather than hardcoded. */
const TRAIN_STAGE = STAGES.find((s) => s.key === 'train')?.n ?? 5

export const EMPTY_COUNTS: StageCounts = { active: 0, waiting: 0, failed: 0, completed: 0 }

/**
 * Backend datetimes may arrive without a timezone suffix (SQLite stores naive
 * UTC). This normalisation matches `lib/format.ts`, whose `parse` is private —
 * duplicated rather than exported because the foundation is frozen, and getting
 * it wrong here would shift every duration by the viewer's UTC offset.
 */
function parseUtc(iso: string | null | undefined): number | null {
  if (!iso) return null
  const normalized = /[zZ]$|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`
  const ms = new Date(normalized).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Elapsed milliseconds, or `null` when either end is missing or nonsensical. */
export function msBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): number | null {
  const start = parseUtc(startIso)
  const end = parseUtc(endIso)
  if (start === null || end === null) return null
  const delta = end - start
  // A negative span means clock skew, not a stage that finished before it began.
  return delta < 0 ? null : delta
}

/** Seconds since an instant, or `null` when it cannot be parsed. */
export function secondsSince(iso: string | null | undefined): number | null {
  const at = parseUtc(iso)
  if (at === null) return null
  return Math.max(0, (Date.now() - at) / 1000)
}

/**
 * The node treatment for a set of counts.
 *
 * Failure outranks activity: a stage with three runs moving and one dead still
 * needs the analyst's eye, and the counts row shows both anyway.
 */
export function stageStateOf(counts: StageCounts): LoopStageState {
  if (counts.failed > 0) return 'failed'
  if (counts.active > 0) return 'active'
  if (counts.waiting > 0) return 'waiting'
  if (counts.completed > 0) return 'complete'
  return 'idle'
}

/** True when the stage node should be treated as holding live work. */
export function hasWork(counts: StageCounts): boolean {
  return counts.active > 0 || counts.waiting > 0 || counts.failed > 0
}

function timingOf(samples: number[]): StageActivity['timing'] {
  if (samples.length === 0) return { avgMs: null, sample: 0 }
  const total = samples.reduce((sum, ms) => sum + ms, 0)
  return { avgMs: total / samples.length, sample: samples.length }
}

/** When a run failed, the stage it died at — falling back to where it stopped. */
function failedStage(history: readonly StageEntry[], currentStage: number): number {
  return history.find((entry) => entry.status === 'failed')?.stage ?? currentStage
}

/**
 * Aggregate a set of runs into what `ClosedLoopFlow` draws.
 *
 * Occupancy (`active` / `waiting` / `failed`) counts each run exactly once, at
 * the single place it actually sits. `completed` is throughput — how many runs
 * have cleared the stage — so it is read from stage history and will exceed the
 * occupancy counts by design.
 *
 * @param runs any run list the caller already has (`active_runs`, `recent_runs`,
 *   or both concatenated). Pass runs from ONE window, because the caption prints
 *   one window label for all of them.
 */
export function summariseRuns(runs: readonly RunSummary[]): LoopActivity {
  const counts = new Map<number, StageCounts>()
  const durations = new Map<number, number[]>()
  for (const stage of STAGES) {
    counts.set(stage.n, { ...EMPTY_COUNTS })
    durations.set(stage.n, [])
  }

  const gate: GateActivity = { waiting: 0, approved: 0, oldestWaitSeconds: null }

  for (const run of runs) {
    for (const entry of run.stage_history) {
      const bucket = counts.get(entry.stage)
      // A stage number the UI does not know about is dropped rather than drawn
      // somewhere convenient — a new backend stage should look missing, not wrong.
      if (!bucket) continue
      if (entry.status === 'completed') {
        bucket.completed += 1
        const ms = msBetween(entry.started_at, entry.completed_at)
        if (ms !== null) durations.get(entry.stage)?.push(ms)
      }
    }

    // Reaching stage 4 is only possible through the gate, so it is evidence a
    // human released the run — regardless of what happened afterwards.
    if (run.current_stage > APPROVAL_GATE_AFTER_STAGE) gate.approved += 1

    if (run.status === 'failed') {
      const bucket = counts.get(failedStage(run.stage_history, run.current_stage))
      if (bucket) bucket.failed += 1
    } else if (run.status === 'awaiting_approval') {
      gate.waiting += 1
      const clearedGateStage = run.stage_history.find(
        (entry) => entry.stage === APPROVAL_GATE_AFTER_STAGE,
      )?.completed_at
      const waited = secondsSince(clearedGateStage ?? run.created_at)
      if (waited !== null && (gate.oldestWaitSeconds === null || waited > gate.oldestWaitSeconds)) {
        gate.oldestWaitSeconds = waited
      }
    } else if (run.status === 'awaiting_training') {
      const bucket = counts.get(TRAIN_STAGE)
      if (bucket) bucket.waiting += 1
    } else if (run.status === 'running') {
      const bucket = counts.get(run.current_stage)
      if (bucket) bucket.active += 1
    }
    // 'completed' runs hold no position; they show up only as throughput above.
  }

  return {
    stages: STAGES.map((stage) => ({
      stage: stage.n,
      counts: counts.get(stage.n) ?? { ...EMPTY_COUNTS },
      timing: timingOf(durations.get(stage.n) ?? []),
    })),
    gate,
  }
}

function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * The figure's text alternative: one sentence saying where work actually is.
 *
 * Rendered as a visible caption rather than hidden text, because a reader who
 * cannot parse a ring of nodes at a glance is not always a screen-reader user —
 * often they are the executive at the back of the room.
 */
export function describeFlow(
  stages: readonly StageActivity[],
  gate: GateActivity,
  t: TFunction,
): string {
  const labelOf = (n: number) => STAGES.find((s) => s.n === n)?.label ?? `stage ${n}`

  const inStage = (count: number, stage: number) =>
    t('u.flow-in-stage', { count, stage: labelOf(stage) })

  const active = stages
    .filter((s) => s.counts.active > 0)
    .map((s) => inStage(s.counts.active, s.stage))

  const waiting = [
    ...(gate.waiting > 0 ? [t('u.flow-at-the-gate', { count: gate.waiting })] : []),
    ...stages
      .filter((s) => s.counts.waiting > 0)
      .map((s) => inStage(s.counts.waiting, s.stage)),
  ]

  const failed = stages
    .filter((s) => s.counts.failed > 0)
    .map((s) => inStage(s.counts.failed, s.stage))

  const sentences: string[] = []
  if (active.length > 0) sentences.push(t('u.flow-processing', { list: joinClauses(active) }))
  if (waiting.length > 0) sentences.push(t('u.flow-waiting', { list: joinClauses(waiting) }))
  if (failed.length > 0) sentences.push(t('u.flow-failed', { list: joinClauses(failed) }))
  if (sentences.length === 0) sentences.push(t('u.flow-none'))

  const cleared = stages.find((s) => s.stage === STAGES[STAGES.length - 1].n)?.counts.completed ?? 0
  sentences.push(
    t('u.flow-closed', { count: cleared, noun: cleared === 1 ? 'run has' : 'runs have' }),
  )

  return sentences.join(' ')
}
