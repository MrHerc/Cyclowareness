/**
 * The people this risk names, and where each of them stands.
 *
 * The score column is the one that has to be careful. `null` there means no
 * score was recorded — usually because the required action carries no quiz —
 * and rendering it as `0%` would say the person failed. It is a `NoMeasurement`
 * for that reason, and where the incident set a pass mark the score is shown
 * against it rather than on its own.
 *
 * The review control is disabled with its reason for anybody who has not
 * started, because the server refuses that with a 409 and a button whose only
 * outcome is an error is not a button.
 */

import { useT } from '../../lib/i18n'
import { UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../components/data'
import { EmptyState } from '../../components/states'
import {
  Badge,
  Button,
  Panel,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import { formatDateTime, num, timeAgo } from '../../lib/format'
import type { IncidentRiskDetail, IncidentRiskSubject } from '../../domain/types'
import { AttachSubjectsDialog } from './AttachSubjectsDialog'
import { GuardedAction } from './GuardedAction'
import { ReviewSubjectDialog } from './ReviewSubjectDialog'
import { whyCannotReview } from './vocabulary'

export interface SubjectsPanelProps {
  risk: IncidentRiskDetail
  canManage: boolean
}

export function SubjectsPanel({ risk, canManage }: SubjectsPanelProps) {
  const t = useT()
  const [attaching, setAttaching] = useState(false)
  const [reviewing, setReviewing] = useState<IncidentRiskSubject | null>(null)

  const closed = risk.status === 'closed'

  return (
    <Panel
      flush
      headingLevel={2}
      title={t('x.subjects')}
      subtitle={`${risk.subjects.length} ${risk.subjects.length === 1 ? 'person is' : 'people are'} named by this risk`}
      actions={
        canManage ? (
          <GuardedAction
            size="sm"
            variant="secondary"
            icon={<UserPlus size={14} aria-hidden="true" />}
            reason={closed ? t('p.this-risk-is-closed-reopen-it') : null}
            onClick={() => setAttaching(true)}
          >
            Attach people
          </GuardedAction>
        ) : undefined
      }
    >
      {risk.subjects.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={Users}
            headline="Nobody is attached yet"
            description={t('x.a-risk-with-no-subjects')}
            action={
              canManage && !closed ? (
                <Button size="sm" onClick={() => setAttaching(true)}>
                  Attach people
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric>Score</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Reviewer decision</TableHead>
              {canManage && <TableHead>Review</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {risk.subjects.map((subject) => {
              const belowBar =
                risk.min_score !== null && subject.score !== null && subject.score < risk.min_score

              return (
                <TableRow key={subject.id}>
                  <TableCell>
                    <Link
                      to={`/employees/${subject.employee_id}`}
                      className="text-body text-fg hover:text-brand"
                    >
                      {subject.employee_name ?? `Employee ${subject.employee_id}`}
                    </Link>
                  </TableCell>

                  <TableCell>
                    {subject.assignment_id !== null ? (
                      <Tooltip content="The training assignment created for this person by this incident.">
                        <span className="tech text-fg-muted">#{subject.assignment_id}</span>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-fg-faint">Nothing assigned</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusDot status={subject.status} />
                  </TableCell>

                  <TableCell numeric>
                    {subject.score !== null ? (
                      <span className={belowBar ? 'text-high' : 'text-fg'}>
                        {num(subject.score)}%
                        {risk.min_score !== null && (
                          <span className="ml-1 text-xs text-fg-faint">/ {risk.min_score}</span>
                        )}
                      </span>
                    ) : (
                      <NoMeasurement
                        label="No score"
                        reason={t('p.no-score-was-recorded-for-this')}
                        className="justify-end text-xs"
                      />
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {subject.completed_at ? (
                      <Tooltip content={formatDateTime(subject.completed_at)}>
                        <span className="text-fg-muted">{timeAgo(subject.completed_at)}</span>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-fg-faint">Not completed</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="flex flex-col gap-1">
                      <Badge size="sm" status={subject.reviewer_decision} />
                      {subject.reviewer_note && (
                        <span className="max-w-56 text-xs text-fg-subtle">
                          {subject.reviewer_note}
                        </span>
                      )}
                      {subject.reviewed_by && (
                        <span className="text-xs text-fg-faint">
                          {subject.reviewed_by} · {timeAgo(subject.reviewed_at)}
                        </span>
                      )}
                    </span>
                  </TableCell>

                  {canManage && (
                    <TableCell>
                      <GuardedAction
                        size="sm"
                        variant="outline"
                        reason={
                          closed
                            ? 'This risk is closed.'
                            : whyCannotReview(subject)
                        }
                        onClick={() => setReviewing(subject)}
                      >
                        {subject.reviewer_decision === 'pending' ? 'Review' : 'Review again'}
                      </GuardedAction>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {canManage && (
        <>
          <AttachSubjectsDialog risk={risk} open={attaching} onOpenChange={setAttaching} />
          <ReviewSubjectDialog
            riskId={risk.id}
            subject={reviewing}
            minScore={risk.min_score}
            onOpenChange={(open) => {
              if (!open) setReviewing(null)
            }}
          />
        </>
      )}
    </Panel>
  )
}
