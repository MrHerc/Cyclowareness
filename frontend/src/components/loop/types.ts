/**
 * The vocabulary the loop visuals speak.
 *
 * Deliberately separate from `domain/types.ts`: those types mirror the server,
 * these describe what a *picture of the loop* needs. The server does not send an
 * aggregate "3 active in Analysis" — that is derived (see `derive.ts`), and
 * inventing it as a server field would be a lie about the contract.
 *
 * Two shapes here exist purely to make dishonesty awkward:
 *   - `StageTiming` pairs a mean with its sample. You cannot render an average
 *     without stating how many measurements it came from.
 *   - `avgMs: null` means "not measured", never "took no time".
 */

import type { STAGES } from '../../domain/types'

/** One row of the frozen `STAGES` table. */
export type LoopStageDef = (typeof STAGES)[number]

/** 'ingest' | 'analyze' | 'convert' | 'target' | 'train' | 'measure' | 'feedback' */
export type LoopStageKey = LoopStageDef['key']

/**
 * What a stage node looks like right now.
 *
 * `complete` means "this stage has cleared work in the window but holds none",
 * which is a different picture from `idle` ("nothing has ever come through").
 */
export type LoopStageState = 'idle' | 'active' | 'waiting' | 'failed' | 'complete'

/** Loop runs occupying a stage. Counts of runs, not of events. */
export interface StageCounts {
  /** Being processed here right now. */
  active: number
  /** Parked here waiting on something outside the machine (a person, a deadline). */
  waiting: number
  /** Runs that died at this stage. */
  failed: number
  /** Runs that have cleared this stage — throughput, not current occupancy. */
  completed: number
}

/** A mean and the number of measurements behind it. Never one without the other. */
export interface StageTiming {
  /** Mean wall-clock milliseconds from stage start to completion. `null` = not measured. */
  avgMs: number | null
  /** How many completed stage passes the mean was taken over. */
  sample: number
}

/** Everything one stage node draws. */
export interface StageActivity {
  /** 1–7, matching `STAGES[].n`. */
  stage: number
  counts: StageCounts
  timing: StageTiming
}

/**
 * The human approval gate, which sits after stage 3 and is not a stage.
 * It has no `active` count on purpose: a gate does not process, it holds.
 */
export interface GateActivity {
  /** Runs parked at the gate right now, waiting on a person. */
  waiting: number
  /** Runs the gate has released in the window. */
  approved: number
  /** Longest current wait, in seconds. `null` when nothing is waiting. */
  oldestWaitSeconds: number | null
}

/** The aggregate a single flow figure needs. */
export interface LoopActivity {
  stages: StageActivity[]
  gate: GateActivity
}
