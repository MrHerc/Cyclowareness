/**
 * The Command Center's parts.
 *
 * The page itself is composition: it owns every query and every mutation, and
 * hands plain data down. Nothing in this folder fetches.
 */

export { HeroStrip } from './HeroStrip'
export { IncidentTimeline } from './IncidentTimeline'
export type { IncidentTimelineProps } from './IncidentTimeline'
export type { HeroStripProps } from './HeroStrip'

export { SystemWarnings } from './SystemWarnings'
export type { SystemWarningsProps } from './SystemWarnings'

export { LoopSection } from './LoopSection'
export type { LoopSectionProps } from './LoopSection'

export { ApprovalQueuePanel } from './ApprovalQueuePanel'
export type { ApprovalQueuePanelProps, QueueScope } from './ApprovalQueuePanel'

export { ThreatIntakePanel } from './ThreatIntakePanel'
export type { ThreatIntakePanelProps } from './ThreatIntakePanel'

export { SimulationsPanel } from './SimulationsPanel'
export type { SimulationsPanelProps } from './SimulationsPanel'

export { PolicyExposurePanel } from './PolicyExposurePanel'
export type { PolicyExposurePanelProps } from './PolicyExposurePanel'

export { IncidentRiskPanel } from './IncidentRiskPanel'
export type { IncidentRiskPanelProps } from './IncidentRiskPanel'

export { IntegrationHealthPanel } from './IntegrationHealthPanel'
export type { IntegrationHealthPanelProps } from './IntegrationHealthPanel'

export { AnalystActivityPanel } from './AnalystActivityPanel'
export { AreaGroup } from './AreaGroup'
export type { AreaGroupProps } from './AreaGroup'
export type { AnalystActivityPanelProps } from './AnalystActivityPanel'

export { MeasuredOutcomes } from './MeasuredOutcomes'
export type { MeasuredOutcomesProps } from './MeasuredOutcomes'

export {
  assignedTo,
  combineRuns,
  highRiskCount,
  parsePosition,
  positionOf,
  runsAt,
  severityCounts,
  sortByWait,
  systemWarnings,
} from './derive'
export type { RunPosition, SystemWarning, SystemWarningInput, WarningTone } from './derive'
