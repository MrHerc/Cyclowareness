/**
 * What is still open, counted from the rows rather than from a summary.
 *
 * Three honesty problems live here, and each one has a different answer.
 *
 * The findings list is served as a capped page, so when the response comes back
 * at the cap these counts are a floor and the caption says so — a governance
 * surface may not present a shortened list as a total.
 *
 * Incident-risk records are analyst-scoped. Read by an executive account they
 * are withheld, which is not "there are none", so the tile says restricted.
 *
 * And a findings request that failed produces no rows, which would otherwise
 * count as zero open findings — the most flattering possible reading of a
 * network error. `openFindings` is nullable for exactly that case.
 */

import { useT } from '../../lib/i18n'
import { SeverityBarChart } from '../../components/charts'
import { HonestMetric } from '../../components/data'
import { Panel } from '../../components/ui'
import type { IncidentRisk, PolicyFinding } from '../../domain/types'
import { highSeverityCount, policyExposure, remediationProgress, severityCounts } from './derive'
import { WithheldMetric } from './ExecutiveSection'

export interface UnresolvedRisksProps {
  /** Open findings only, or `null` when the list could not be read. */
  openFindings: PolicyFinding[] | null
  /** True when the response came back at the server's page cap. */
  truncated: boolean
  /** All incident risks, or `null` when this role may not read them. */
  incidentRisks: IncidentRisk[] | null
  /** The platform's minimum sample, so a derived rate is withheld on the same rule. */
  minSample: number
  updatedAt: string | null
  loading?: boolean
  error?: string | null
}

const UNREADABLE = 'The policy findings list did not load, so nothing can be counted from it.'

export function UnresolvedRisks({
  openFindings,
  truncated,
  incidentRisks,
  minSample,
  updatedAt,
  loading = false,
  error = null,
}: UnresolvedRisksProps) {
  const t = useT()
  const remediation = incidentRisks ? remediationProgress(incidentRisks, minSample) : null
  const atLeast = truncated ? t('p.the-server-returned-a-full-page') : ''
  const noun = t(truncated ? 'p.open-findings-scanned' : 'p.open-findings')

  const severe = openFindings ? highSeverityCount(openFindings) : null
  const exposure = openFindings ? policyExposure(openFindings) : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel>
          {openFindings && severe !== null ? (
            <HonestMetric
              label={t('p.open-highrisk-findings')}
              value={severe}
              format="number"
              sample={openFindings.length}
              sampleNoun={noun}
              source="live"
              sourceDetail="Policy intelligence"
              lastUpdated={updatedAt}
              tone={severe > 0 ? 'critical' : 'safe'}
              hint={`${atLeast}Findings at critical or high severity that have not been resolved, accepted or ruled out.`}
              unmeasuredReason="the findings list could not be read"
              definition={{
                calculation: t('p.open-findings-whose-severity-is-critical'),
                includes: ['Statuses open, in review, remediation planned and training assigned'],
                excludes: ['Resolved, accepted risk and false positive'],
                caveat: t('p.counted-from-the-returned-rows-not'),
              }}
            />
          ) : (
            <WithheldMetric label="Open high-risk findings" cause="unavailable" reason={UNREADABLE} />
          )}
        </Panel>

        <Panel>
          {openFindings && exposure ? (
            <HonestMetric
              label={t('p.policy-exposure')}
              value={exposure.people}
              format="number"
              sample={openFindings.length}
              sampleNoun={noun}
              source="live"
              sourceDetail="Policy intelligence"
              lastUpdated={updatedAt}
              tone={exposure.people > 0 ? 'high' : 'safe'}
              hint={`People named by at least one open finding, across ${exposure.departments} department${exposure.departments === 1 ? '' : 's'}.`}
              unmeasuredReason="the findings list could not be read"
              definition={{
                calculation: t('p.distinct-employees-named-individually-by-any'),
                includes: ['Employees a finding lists by name'],
                excludes: [
                  'People covered only because their department was named',
                  `${exposure.unscoped} open finding${exposure.unscoped === 1 ? '' : 's'} naming neither a person nor a department`,
                ],
                caveat:
                  t('p.a-floor-not-a-total-a'),
              }}
            />
          ) : (
            <WithheldMetric label="Policy exposure" cause="unavailable" reason={UNREADABLE} />
          )}
        </Panel>

        <Panel>
          {remediation ? (
            <HonestMetric
              label={t('p.incident-remediation-completion')}
              value={remediation.rate}
              format="percent"
              sample={remediation.total}
              sampleNoun="incident risks on record"
              source="live"
              sourceDetail="Incident risks"
              lastUpdated={updatedAt}
              tone={remediation.rate !== null && remediation.rate >= 0.8 ? 'safe' : 'neutral'}
              hint={`${remediation.closed} of ${remediation.total} incident-response risks have been closed.`}
              unmeasuredReason={`fewer than ${minSample} incident risks exist, which is too few to state as a rate`}
              unmeasuredRemedy="The closed and open counts are still shown above. A rate appears once there are enough records for one to mean anything."
              definition={{
                calculation: t('p.incident-risks-in-the-closed-state'),
                includes: ['Every incident risk the platform holds, whatever its age'],
                excludes: ['Any trailing window — this is the whole register'],
                caveat: `Withheld below ${minSample} records, matching the rule the server applies to its own rates.`,
              }}
            />
          ) : (
            <WithheldMetric
              label="Incident remediation completion"
              cause="restricted"
              reason={t('p.incidentresponse-records-name-individuals-and-ar')}
            />
          )}
        </Panel>
      </div>

      <SeverityBarChart
        data={openFindings ? severityCounts(openFindings) : []}
        title={t('x.open-policy-findings-by-severity')}
        caption={
          openFindings
            ? `${atLeast}Counted from the open findings this view can read.`
            : t('p.no-findings-could-be-read')
        }
        loading={loading}
        error={error}
      />
    </div>
  )
}
