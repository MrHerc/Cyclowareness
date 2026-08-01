/**
 * Open policy findings, by severity.
 *
 * The chart draws only the severities that actually have findings, so an empty
 * band is absent rather than drawn as a zero-length bar an eye reads as "we
 * checked and found none". The count under it names what a person is expected
 * to act on this week, because a bar chart alone does not tell anyone what to
 * do next.
 */

import { Link } from 'react-router-dom'
import { SeverityBarChart } from '../../components/charts'
import { AsyncBoundary, SkeletonChart } from '../../components/states'
import type { PolicyFinding } from '../../domain/types'
import { highRiskCount, severityCounts } from './derive'

export interface PolicyExposurePanelProps {
  findings: PolicyFinding[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function PolicyExposurePanel({
  findings,
  isLoading,
  error,
  onRetry,
}: PolicyExposurePanelProps) {
  const counts = severityCounts(findings)
  const pressing = highRiskCount(findings)

  return (
    <AsyncBoundary
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      loadingLabel="Loading policy exposure"
      skeleton={
        <div className="rounded-panel border border-line-subtle bg-surface p-4 shadow-panel">
          <SkeletonChart height={200} />
        </div>
      }
    >
      <div className="space-y-2">
        <SeverityBarChart
          data={counts}
          title="Policy exposure by severity"
          caption={`${findings.length} open ${findings.length === 1 ? 'finding' : 'findings'} · ${pressing} at critical or high`}
          height={200}
        />
        <p className="text-xs text-fg-subtle">
          <Link
            to="/policy-intelligence/findings"
            className="text-brand-fg underline-offset-4 hover:underline"
          >
            Open the findings register
          </Link>{' '}
          to assign remediation or training.
        </p>
      </div>
    </AsyncBoundary>
  )
}
