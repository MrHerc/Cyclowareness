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
import { SeverityRadial } from '../../components/charts'
import { useT, type MessageKey } from '../../lib/i18n'
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
  const t = useT()
  const counts = severityCounts(findings)
  const pressing = highRiskCount(findings)

  return (
    <AsyncBoundary
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      loadingLabel={t('x.loading-policy-exposure')}
      skeleton={
        <div className="rounded-panel border border-line-subtle bg-surface p-4 shadow-panel">
          <SkeletonChart height={200} />
        </div>
      }
    >
      <div className="space-y-2">
        {/* The radial carries the whole and the shape at a glance; the bars carry
            the exact counts. Two encodings of one dataset, never disagreeing,
            because both read the same `counts` filtered the same way. */}
        <div className="rounded-panel border border-line-subtle bg-surface p-4 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-h text-fg">{t('y.policy-exposure-by-severity')}</h4>
            <span className="text-xs text-fg-faint">
              {pressing} at critical or high
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <SeverityRadial data={counts} size={168} className="shrink-0" />
            <ul className="min-w-[9rem] flex-1 space-y-1.5">
              {counts.length === 0 ? (
                <li className="text-sm text-fg-faint">{t('u.no-open-findings')}</li>
              ) : (
                counts.map((row) => (
                  <li
                    key={row.severity}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2 text-fg-muted">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ background: `var(--color-${row.severity === 'info' ? 'fg-faint' : row.severity})` }}
                      />
                      {t(`severity.${row.severity}` as MessageKey)}
                    </span>
                    <span className="tabular-nums text-fg">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <p className="text-xs text-fg-subtle">
          <Link
            to="/policy-intelligence/findings"
            className="text-brand-fg underline-offset-4 hover:underline"
          >
            {t('u.open-the-findings-register')}
          </Link>{' '}
          to assign remediation or training.
        </p>
      </div>
    </AsyncBoundary>
  )
}
