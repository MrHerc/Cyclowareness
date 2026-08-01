/**
 * The executive view's parts.
 *
 * The page owns every query and hands plain data down; nothing in here fetches.
 * `derive.ts` holds the arithmetic so the claims this surface makes can be read
 * and argued with in one file rather than traced through six components.
 */

export { BehaviourCharts } from './BehaviourCharts'
export type { BehaviourChartsProps } from './BehaviourCharts'

export { DepartmentStandingPanels } from './DepartmentStandingPanels'
export type { DepartmentStandingPanelsProps } from './DepartmentStandingPanels'

export { ExecutiveSection, RestrictedNote, WithheldMetric } from './ExecutiveSection'
export type {
  ExecutiveSectionProps,
  RestrictedNoteProps,
  WithheldMetricProps,
} from './ExecutiveSection'

export { PostureMetrics } from './PostureMetrics'
export type { PostureMetricsProps } from './PostureMetrics'

export { RecommendationList } from './RecommendationList'
export type { RecommendationListProps } from './RecommendationList'

export { SituationBriefing } from './SituationBriefing'
export type { SituationBriefingProps } from './SituationBriefing'

export { ThreatsToTraining } from './ThreatsToTraining'
export type { ThreatsToTrainingProps } from './ThreatsToTraining'

export { UnresolvedRisks } from './UnresolvedRisks'
export type { UnresolvedRisksProps } from './UnresolvedRisks'

export {
  clipTrend,
  departmentStanding,
  highSeverityCount,
  loopOutcomes,
  measuredDays,
  openFindingsOf,
  openIncidentCount,
  overdueCount,
  policyExposure,
  previousPeriod,
  recommendations,
  remediationProgress,
  scoredHeadcount,
  severityCounts,
  trainingDrivers,
} from './derive'
export type {
  DepartmentStanding,
  LoopOutcomes,
  PolicyExposure,
  Recommendation,
  RecommendationInput,
  RemediationProgress,
  TrendKey,
} from './derive'
