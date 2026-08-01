/**
 * The loop visuals.
 *
 * `ClosedLoopFlow` is the signature figure; everything else is a smaller view of
 * the same seven stages, so they all read from `STAGES` in `domain/types.ts` and
 * none of them keeps its own list.
 */

export { ClosedLoopFlow } from './ClosedLoopFlow'
export type { ClosedLoopFlowProps } from './ClosedLoopFlow'

export { ClosedLoopStage } from './ClosedLoopStage'
export type {
  ClosedLoopStageProps,
  ClosedLoopStageNodeProps,
  ClosedLoopGateNodeProps,
} from './ClosedLoopStage'

export { LoopStageTracker } from './LoopStageTracker'
export type { LoopStageTrackerProps } from './LoopStageTracker'

export { LoopStatusBadge } from './LoopStatusBadge'
export type { LoopStatusBadgeProps } from './LoopStatusBadge'

export { LoopTimeline } from './LoopTimeline'
export type { LoopTimelineProps, LoopGateRecord } from './LoopTimeline'

export { StageDetailPanel } from './StageDetailPanel'
export type { StageDetailPanelProps, TimelineStageStatus } from './StageDetailPanel'

export { STAGE_ICONS } from './icons'

/** Derivation: run lists in, one honest picture of the loop out. */
export {
  describeFlow,
  EMPTY_COUNTS,
  hasWork,
  msBetween,
  secondsSince,
  stageStateOf,
  summariseRuns,
} from './derive'

export type {
  GateActivity,
  LoopActivity,
  LoopStageDef,
  LoopStageKey,
  LoopStageState,
  StageActivity,
  StageCounts,
  StageTiming,
} from './types'
