/**
 * Stages 6 and 7 — what changed, and what the model does with it.
 *
 * Three honesty rules bite hardest on this panel:
 *
 * - A completion rate over zero assignments is not 0%, it is not measured. The
 *   backend serialises `0` in that case; it is folded back to `null` here.
 * - The average time is real, but its denominator is not sent — only completed
 *   assignments that recorded a duration are averaged, and that count does not
 *   reach the client. The sample is therefore declared unknown rather than
 *   guessed at from the completion count.
 * - Department figures are today's roll-ups. They are shown as context for the
 *   people this run touched, never as a measurement of this run's effect.
 */

import type { DepartmentRisk, MeasureSummary, StageEntry, Target } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { cn, num, signed } from '../../../lib/format'
import { HonestMetric, NoMeasurement } from '../../../components/data'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui'
import { StageSection } from './StageSection'

const MEASURE_STAGE = STAGES[5]
const FEEDBACK_STAGE = STAGES[6]

export interface MeasurementPanelProps {
  measureEntry: StageEntry | undefined
  feedbackEntry: StageEntry | undefined
  summary: MeasureSummary | null
  targets: Target[]
  departments: DepartmentRisk[] | undefined
  /** One sentence derived from this run's own record. Never a model output. */
  nextAction: string
}

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-critical'
  if (delta < 0) return 'text-safe'
  return 'text-fg-muted'
}

export function MeasurementPanel({
  measureEntry,
  feedbackEntry,
  summary,
  targets,
  departments,
  nextAction,
}: MeasurementPanelProps) {
  const assigned = summary?.assigned ?? 0
  const completed = summary?.completed ?? 0
  const scored = summary?.per_employee.filter((row) => row.score !== null).length ?? 0

  const touchedDepartments = departments
    ? [...new Set(targets.map((target) => target.department_id))]
        .map((id) => departments.find((department) => department.id === id))
        .filter((department): department is DepartmentRisk => department !== undefined)
    : []

  return (
    <>
      <StageSection
        stage={MEASURE_STAGE}
        entry={measureEntry}
        source="live"
        sourceDetail="Measurement summary stored on the run"
      >
        {!summary ? (
          <p className="text-body text-fg-muted">
            This run has not been measured. Nothing is shown here rather than zeroes: no completion
            rate, no score and no risk movement have been computed for it.
          </p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <HonestMetric
                label="Completion"
                value={assigned > 0 ? summary.completion_rate : null}
                format="percent"
                sample={assigned}
                sampleNoun="assignments"
                source="live"
                tone="neutral"
                unmeasuredReason="Nothing was assigned on this run, so there is no rate to compute."
                hint="Measured for this run only, not over a rolling window."
              />
              <HonestMetric
                label="Average quiz score"
                value={summary.avg_score}
                format="score"
                sample={scored}
                sampleNoun="scored assignments"
                source="live"
                unmeasuredReason="No assignment on this run has been completed with a score."
                unmeasuredRemedy="A score appears once someone finishes the quiz."
              />
              <HonestMetric
                label="Average time spent"
                value={summary.avg_time_seconds}
                format="duration"
                // The denominator is not sent — only completions that recorded a
                // duration are averaged, and that count never reaches the client.
                sample={Number.NaN}
                sampleNoun="completions that recorded a duration"
                source="live"
                unmeasuredReason="No completion on this run recorded how long it took."
              />
            </div>

            <div className="mt-6 border-t border-line-subtle pt-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-h text-fg">Net risk movement</h3>
                <span className={cn('text-display', deltaClass(summary.risk_delta_total))}>
                  {signed(summary.risk_delta_total, 1)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-fg-subtle">
                The sum of every risk event this run wrote, across {summary.per_employee.length}{' '}
                {summary.per_employee.length === 1 ? 'person' : 'people'}. A negative number means
                risk fell.
              </p>
            </div>

            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead numeric>Score</TableHead>
                  <TableHead numeric>Risk change</TableHead>
                  <TableHead numeric>Risk now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.per_employee.map((row) => (
                  <TableRow key={row.employee_id}>
                    <TableCell className="text-fg">{row.name}</TableCell>
                    <TableCell>
                      <Badge status={row.status} size="sm" />
                    </TableCell>
                    <TableCell numeric>
                      {row.score === null ? (
                        <NoMeasurement reason="Not completed, so no score was recorded." />
                      ) : (
                        `${num(row.score, 0)}%`
                      )}
                    </TableCell>
                    <TableCell numeric>
                      <span className={deltaClass(row.risk_delta)}>
                        {signed(row.risk_delta, 1)}
                      </span>
                    </TableCell>
                    <TableCell numeric>
                      {row.risk_score_now === null ? (
                        <NoMeasurement reason="This person's current score could not be read." />
                      ) : (
                        num(row.risk_score_now, 0)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="mt-3 text-xs text-fg-subtle">
              {completed} of {assigned} assignment{assigned === 1 ? '' : 's'} completed. A person
              who ignored the training still appears, because ignoring it is itself a measured
              behaviour.
            </p>
          </>
        )}
      </StageSection>

      <StageSection
        stage={FEEDBACK_STAGE}
        entry={feedbackEntry}
        source="live"
        sourceDetail="Risk engine roll-ups and the daily metric snapshot"
      >
        <h3 className="text-h text-fg">Departments this run touched</h3>
        {touchedDepartments.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-faint">
            {targets.length === 0
              ? 'No one was targeted, so no department was touched.'
              : 'Department names could not be loaded, so the roll-ups are not shown.'}
          </p>
        ) : (
          <>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead numeric>Average risk today</TableHead>
                  <TableHead numeric>People</TableHead>
                  <TableHead numeric>High risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {touchedDepartments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="text-fg">{department.name}</TableCell>
                    <TableCell numeric>{num(department.avg_risk, 0)}</TableCell>
                    <TableCell numeric>{department.employee_count}</TableCell>
                    <TableCell numeric>{department.high_risk_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-fg-subtle">
              These are the current roll-ups for the departments this run selected from. They are
              context, not this run&apos;s effect — no before-and-after department measurement is
              recorded per run.
            </p>
          </>
        )}

        <div className="mt-5 border-t border-line-subtle pt-4">
          <h3 className="text-h text-fg">What this run leaves open</h3>
          <p className="mt-1.5 text-body text-fg-muted">{nextAction}</p>
          <p className="mt-1.5 text-xs text-fg-subtle">
            Derived from this run&apos;s own status and assignment records. It is not a
            recommendation produced by a model.
          </p>
        </div>
      </StageSection>
    </>
  )
}
