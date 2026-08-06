/**
 * "Where does this number come from?"
 *
 * The page exists to answer that question for a stranger, using this
 * deployment's own data rather than a diagram. So every section is either the
 * definition itself or arithmetic on values the API returned: the split between
 * role baselines and recorded behaviour, the distribution across the roster, and
 * the signals the engine has actually fired.
 *
 * The one thing here that is not measured is the weight column, which is a set
 * of model constants copied from the engine. It is labelled as such everywhere
 * it appears, because a page arguing for transparency cannot open by blurring
 * the line between a decision and a measurement.
 */

import { GaugeCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useT } from '../lib/i18n'
import { HonestMetric } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonTable } from '../components/states'
import { Panel } from '../components/ui'
import { PeopleHeader } from '../features/people/PeopleHeader'
import { RiskFormula } from '../features/people/RiskFormula'
import { ScoreDistribution } from '../features/people/ScoreDistribution'
import { SignalWeightsTable, type ObservedSignal } from '../features/people/SignalWeightsTable'
import { TopRiskTable } from '../features/people/TopRiskTable'
import { baselineFor, behaviourOf, mean } from '../features/people/riskModel'
import { useAnalystDashboard, useDepartments, useEmployees } from '../lib/api/queries'
import { num, signed } from '../lib/format'

export default function RiskProfiles() {
  const t = useT()
  const employees = useEmployees()
  const departments = useDepartments()
  const dashboard = useAnalystDashboard()

  const roster = employees.data ?? []

  const departmentNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const department of departments.data ?? []) map.set(department.id, department.name)
    return map
  }, [departments.data])

  const observed = useMemo(() => {
    const map = new Map<string, ObservedSignal>()
    for (const event of dashboard.data?.recent_events ?? []) {
      const current = map.get(event.type) ?? { count: 0, total: 0 }
      current.count += 1
      current.total = Math.round((current.total + event.delta) * 10) / 10
      map.set(event.type, current)
    }
    return map
  }, [dashboard.data])

  const scores = roster.map((person) => person.current_risk_score)
  const averageScore = mean(scores)
  const averageBaseline = mean(roster.map((person) => baselineFor(person.role_sensitivity)))
  const totalBehaviour =
    roster.length === 0
      ? null
      : Math.round(roster.reduce((sum, person) => sum + behaviourOf(person), 0) * 10) / 10
  // The per-person figure the sentence below needs. `totalBehaviour` is a sum
  // across the roster; putting it between two means made the arithmetic fail for
  // anyone who checked it, which this product invites people to do.
  const behaviourPerPerson =
    roster.length > 0 && totalBehaviour !== null ? totalBehaviour / roster.length : 0

  return (
    <div className="space-y-6">
      <PeopleHeader
        title={t('page.risk-profiles.title')}
        lead="How every score on the people screens is computed, checked against this deployment's own numbers. Nothing on this page is an estimate: it is the definition, and then the roster arithmetic that follows from it."
        surfaceId="employees"
      />

      <Panel tone="feature" title={t('x.the-model')} subtitle={t('x.two-lines-and-the-four')}>
        <RiskFormula />
      </Panel>

      <AsyncBoundary
        isLoading={employees.isLoading}
        error={employees.data ? null : employees.error}
        onRetry={() => void employees.refetch()}
        loadingLabel={t('x.loading-the-roster')}
        skeleton={
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
            </div>
            <SkeletonTable rows={6} cols={5} />
          </div>
        }
        isEmpty={roster.length === 0}
        empty={
          <EmptyState
            icon={GaugeCircle}
            headline="No one is scored yet"
            description={t('x.the-model-above-is-still')}
          />
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel>
              <HonestMetric
                label={t('p.average-score')}
                value={averageScore}
                format="score"
                digits={1}
                sample={roster.length}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="the roster is empty"
                definition={{
                  calculation: t('p.the-mean-of-every-current-risk'),
                  includes: ['Everyone the employees endpoint returns'],
                  excludes: ['Nothing — there is no trailing window on this figure'],
                  caveat: t('p.a-current-position-not-a-trend'),
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label={t('p.average-role-baseline')}
                value={averageBaseline}
                format="score"
                digits={1}
                sample={roster.length}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="the roster is empty"
                hint={t('p.where-the-organisation-would-sit-if')}
                definition={{
                  calculation: t('p.the-mean-of-20-role-sensitivity'),
                  includes: ['Every person’s recorded role sensitivity'],
                  excludes: ['Every recorded event — this is the starting point only'],
                  caveat:
                    t('p.role-sensitivity-is-set-when-a'),
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label={t('p.total-moved-by-behaviour')}
                value={totalBehaviour}
                format="number"
                digits={1}
                sample={roster.length}
                sampleNoun="scored people"
                source="live"
                tone={
                  totalBehaviour === null || totalBehaviour === 0
                    ? 'neutral'
                    : totalBehaviour > 0
                      ? 'critical'
                      : 'safe'
                }
                unmeasuredReason="the roster is empty"
                hint={t('p.score-points-added-or-removed-by')}
                definition={{
                  calculation: 'Σ(current score − role baseline), over every person on the roster.',
                  includes: ['Every non-revoked event the engine has applied'],
                  excludes: ['The role baselines themselves'],
                  caveat:
                    t('p.negative-is-the-good-direction-here'),
                }}
              />
            </Panel>
          </div>

          <Panel
            title={t('x.baseline-or-behaviour')}
            subtitle={t('x.which-half-of-the-model')}
          >
            {/* All three figures are PER PERSON. They were not: the middle one
                was a roster-wide sum sitting between two means, so the sentence
                read "an average of 34.6 … moved by +150 … lands the average at
                40.4" and presented that as a derivation. The sum is still worth
                stating — it is the size of the effect across the organisation —
                but it is named as a total, separately, on its own denominator. */}
            <p className="text-body text-fg-muted">
              Across {roster.length} {roster.length === 1 ? 'person' : 'people'}, role baselines put
              the organisation at an average of {num(averageBaseline, 1)}. Recorded behaviour moves
              that by {signed(behaviourPerPerson, 1)} per person — {signed(totalBehaviour, 1)} points
              in total across the roster — which lands the average at {num(averageScore, 1)}.{' '}
              {totalBehaviour === null || totalBehaviour === 0
                ? t('p.recorded-behaviour-has-cancelled-out-exactly')
                : totalBehaviour > 0
                  ? t('p.more-risk-is-coming-from-what')
                  : t('p.what-people-have-done-is-currently')}
            </p>
            <p className="mt-3 text-sm text-fg-subtle">{t('p.a-persignal-rollup-across-the-whole')}</p>
          </Panel>

          <Panel
            title={t('x.distribution-across-the-organisation')}
            subtitle={t('x.every-current-score-on-the')}
          >
            <ScoreDistribution scores={scores} />
          </Panel>

          <Panel
            title={t('x.the-signals')}
            subtitle={t('x.what-each-one-means-what')}
            flush
          >
            <SignalWeightsTable
              observed={observed}
              sample={dashboard.data?.recent_events.length ?? 0}
            />
          </Panel>

          <Panel
            title={t('x.highest-current-scores')}
            subtitle={t('x.and-whether-the-score-comes')}
            flush
          >
            <TopRiskTable employees={roster} departmentNames={departmentNames} />
          </Panel>
        </div>
      </AsyncBoundary>
    </div>
  )
}
