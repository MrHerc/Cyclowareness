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

  return (
    <div className="space-y-6">
      <PeopleHeader
        title="Risk profiles"
        lead="How every score on the people screens is computed, checked against this deployment's own numbers. Nothing on this page is an estimate: it is the definition, and then the roster arithmetic that follows from it."
        surfaceId="employees"
      />

      <Panel tone="feature" title="The model" subtitle="Two lines, and the four rules that keep them honest.">
        <RiskFormula />
      </Panel>

      <AsyncBoundary
        isLoading={employees.isLoading}
        error={employees.data ? null : employees.error}
        onRetry={() => void employees.refetch()}
        loadingLabel="Loading the roster"
        skeleton={
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
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
            description="The model above is still exactly what this deployment runs — there is simply nobody for it to run on. Import an organisation, or seed the demonstration one, and every figure on this page fills in."
          />
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel>
              <HonestMetric
                label="Average score"
                value={averageScore}
                format="score"
                digits={1}
                sample={roster.length}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="the roster is empty"
                definition={{
                  calculation: 'The mean of every current risk score on the roster.',
                  includes: ['Everyone the employees endpoint returns'],
                  excludes: ['Nothing — there is no trailing window on this figure'],
                  caveat: 'A current position, not a trend. The trend lives on the department screen.',
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label="Average role baseline"
                value={averageBaseline}
                format="score"
                digits={1}
                sample={roster.length}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="the roster is empty"
                hint="Where the organisation would sit if nobody had done anything at all."
                definition={{
                  calculation: 'The mean of 20 + role sensitivity × 20 across the roster.',
                  includes: ['Every person’s recorded role sensitivity'],
                  excludes: ['Every recorded event — this is the starting point only'],
                  caveat:
                    'Role sensitivity is set when a person is imported. It is a judgement about the seat, not a measurement of the person.',
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label="Total moved by behaviour"
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
                hint="Score points added or removed by recorded events across the whole roster."
                definition={{
                  calculation: 'Σ(current score − role baseline), over every person on the roster.',
                  includes: ['Every non-revoked event the engine has applied'],
                  excludes: ['The role baselines themselves'],
                  caveat:
                    'Negative is the good direction here: it means the organisation has earned more credit from reporting and training than it has lost to clicks and expiries.',
                }}
              />
            </Panel>
          </div>

          <Panel
            title="Baseline or behaviour"
            subtitle="Which half of the model the organisation's risk is actually coming from."
          >
            <p className="text-body text-fg-muted">
              Across {roster.length} {roster.length === 1 ? 'person' : 'people'}, role baselines put
              the organisation at an average of {num(averageBaseline, 1)}. Recorded behaviour has
              moved the total by {signed(totalBehaviour, 1)} points, which lands the average at{' '}
              {num(averageScore, 1)}.{' '}
              {totalBehaviour === null || totalBehaviour === 0
                ? 'Recorded behaviour has cancelled out exactly, so the organisation currently sits on its role baselines.'
                : totalBehaviour > 0
                  ? 'More risk is coming from what people have done than the roles alone would explain.'
                  : 'What people have done is currently pulling the organisation below where its roles alone would place it.'}
            </p>
            <p className="mt-3 text-sm text-fg-subtle">
              A per-signal roll-up across the whole organisation is not exposed by the API — the
              breakdown endpoint answers for one person at a time. The table below therefore counts
              real events from the recent tail rather than claiming an all-time total.
            </p>
          </Panel>

          <Panel
            title="Distribution across the organisation"
            subtitle="Every current score, on the scale the model actually uses."
          >
            <ScoreDistribution scores={scores} />
          </Panel>

          <Panel
            title="The signals"
            subtitle="What each one means, what it is worth, and what the engine has recorded lately."
            flush
          >
            <SignalWeightsTable
              observed={observed}
              sample={dashboard.data?.recent_events.length ?? 0}
            />
          </Panel>

          <Panel
            title="Highest current scores"
            subtitle="And whether the score comes from the seat or from the behaviour."
            flush
          >
            <TopRiskTable employees={roster} departmentNames={departmentNames} />
          </Panel>
        </div>
      </AsyncBoundary>
    </div>
  )
}
