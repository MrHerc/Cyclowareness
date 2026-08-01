/**
 * The data-honesty set.
 *
 * Every component here exists to stop a screen claiming something the data does
 * not support: a missing measurement rendered as zero, a rate without its
 * denominator, an arrow drawn from one period, template output labelled AI, or
 * demonstration data that looks live. Import from this barrel, not from the
 * files — the internal `Tip` is deliberately not exported.
 */

export { HonestMetric } from './HonestMetric'
export type { HonestMetricProps, MetricComparison, MetricFormat, MetricTone } from './HonestMetric'

export { InsufficientDataState } from './InsufficientDataState'
export type { InsufficientDataStateProps } from './InsufficientDataState'

export { NoMeasurement } from './NoMeasurement'
export type { NoMeasurementProps } from './NoMeasurement'

export { SampleSizeLabel } from './SampleSizeLabel'
export type { SampleSizeLabelProps } from './SampleSizeLabel'

export { DataSourceLabel } from './DataSourceLabel'
export type { DataSource, DataSourceLabelProps } from './DataSourceLabel'

export { LastUpdated } from './LastUpdated'
export type { LastUpdatedProps } from './LastUpdated'

export { ConfidenceBadge, confidenceBand } from './ConfidenceBadge'
export type { ConfidenceBadgeProps, ConfidenceBand } from './ConfidenceBadge'

export { AIProvenanceBadge } from './AIProvenanceBadge'
export type { AIProvenanceBadgeProps } from './AIProvenanceBadge'

export { DemoDataBadge } from './DemoDataBadge'
export type { DemoDataBadgeProps } from './DemoDataBadge'

export { DateRangeSelector } from './DateRangeSelector'
export type { DateRangeSelectorProps } from './DateRangeSelector'

export {
  DATE_RANGE_LABELS,
  DATE_RANGE_PRESETS,
  defaultDateRange,
  formatRangeLabel,
  fromISODate,
  rangeDays,
  resolveRange,
  toISODate,
} from './dateRange'
export type { DateRangePreset, DateRangeValue } from './dateRange'

export { MetricDefinition } from './MetricDefinition'
export type { MetricDefinitionProps } from './MetricDefinition'

export { EvidenceList } from './EvidenceList'
export type { EvidenceItem, EvidenceListProps } from './EvidenceList'
