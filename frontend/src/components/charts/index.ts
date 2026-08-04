/**
 * The chart layer.
 *
 * Everything here obeys the same three rules: a gap in the data is drawn as a
 * gap (`connectNulls` is never set), a series with fewer than two measured
 * points renders "Trend unavailable" instead of a slope, and colour comes from
 * `design/tokens.css` — series hues for data, risk hues for risk, and never the
 * brand hue for either.
 */

export { ChartFrame } from './ChartFrame'
export type { ChartFrameProps } from './ChartFrame'

export { ChartLegend } from './ChartLegend'
export type { ChartLegendProps, LegendItem } from './ChartLegend'

export { ChartTooltip } from './ChartTooltip'
export type { ChartTooltipProps, ChartTooltipRow } from './ChartTooltip'

export { BehaviourTrendChart } from './BehaviourTrendChart'
export type { BehaviourTrendChartProps } from './BehaviourTrendChart'

export { RiskTrendChart } from './RiskTrendChart'
export type { RiskTrendChartProps } from './RiskTrendChart'

export { CompletionTrendChart } from './CompletionTrendChart'
export type { CompletionTrendChartProps } from './CompletionTrendChart'

export { DepartmentRiskHeatmap } from './DepartmentRiskHeatmap'
export type { DepartmentRiskHeatmapProps } from './DepartmentRiskHeatmap'

export { SeverityBarChart } from './SeverityBarChart'
export type { SeverityBarChartProps, SeverityCount } from './SeverityBarChart'
export { SeverityRadial } from './SeverityRadial'
export type { SeverityRadialProps } from './SeverityRadial'

export { LoopOutcomeChart } from './LoopOutcomeChart'
export type { LoopOutcomeChartProps } from './LoopOutcomeChart'

export { RiskMovementChart } from './RiskMovementChart'
export type { RiskMovementChartProps, RiskMovement } from './RiskMovementChart'

export { Sparkline } from './Sparkline'
export type { SparklineProps } from './Sparkline'

export {
  BAND_COLOR,
  DIVERGING,
  SERIES,
  SEVERITY_COLOR,
  SEVERITY_ORDER,
  countMeasured,
  formatDayFull,
  formatDayShort,
  hasEnoughPoints,
} from './chartTheme'
