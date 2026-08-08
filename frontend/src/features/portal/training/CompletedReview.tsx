/**
 * An assignment that can no longer be taken, reopened.
 *
 * TWO STATES REACH THIS SCREEN AND THEY ARE NOT THE SAME. `completed` means the
 * person finished it. `expired` means the window closed and they did not — and
 * this screen used to greet them both with "You have already completed this",
 * telling someone they had finished training they never took, above a score
 * panel that then said no measurement was recorded. It is the one claim on the
 * learner portal that the audit trail can flatly contradict.
 *
 * The lesson is still worth reading in both states, so it is all here either
 * way. The per-question breakdown is not: the platform returns it once, when it
 * grades, and does not store the answers that were given. Saying so plainly is
 * the only honest option — a review screen that silently omits the questions
 * reads as though they were never asked.
 */

import { useT } from '../../../lib/i18n'
import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../../components/data'
import { Badge, Button, Panel } from '../../../components/ui'
import type { AssignmentDetail } from '../../../domain/types'
import { duration, formatDateTime, num } from '../../../lib/format'

export interface CompletedReviewProps {
  assignment: AssignmentDetail
}

export function CompletedReview({ assignment }: CompletedReviewProps) {
  const t = useT()
  const { module } = assignment
  const expired = assignment.status === 'expired'

  return (
    <div className="space-y-6">
      <Panel
        title={expired ? t('p.this-expired-before-it-was-finished') : t('p.you-have-already-completed-this')}
        subtitle={
          expired
            ? t('p.the-window-for-taking-it-closed')
            : assignment.completed_at
              ? `Finished ${formatDateTime(assignment.completed_at)}`
              : t('p.the-completion-time-was-not-recorded')
        }
        actions={<Badge status={assignment.status} dot />}
        headingLevel={2}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <span className="label text-fg-subtle">{t('u.score-recorded')}</span>
            <p className="mt-1.5 text-title text-fg tabular-nums">
              {assignment.score === null ? (
                <NoMeasurement
                  reason={
                    expired
                      ? t('p.this-assignment-expired-before-the-quiz')
                      : t('p.no-quiz-score-was-recorded-against')
                  }
                />
              ) : (
                `${num(assignment.score, 0)}%`
              )}
            </p>
          </div>
          <div>
            <span className="label text-fg-subtle">{t('u.time-spent')}</span>
            <p className="mt-1.5 text-title text-fg tabular-nums">
              {assignment.time_spent_seconds === null ? (
                <NoMeasurement reason={t('p.time-spent-was-not-recorded-for')} />
              ) : (
                duration(assignment.time_spent_seconds * 1000)
              )}
            </p>
          </div>
          <div>
            <span className="label text-fg-subtle">{t('u.delivered-as')}</span>
            <p className="mt-1.5 text-title text-fg">{module.est_minutes} min module</p>
          </div>
        </div>

        {/* Only true of an assignment that was actually graded. Telling someone
            their answers were discarded when they never gave any invents a
            history for them. */}
        {expired ? null : (
          <p className="mt-5 border-t border-line-subtle pt-4 text-sm text-fg-subtle">{t('p.your-individual-answers-were-graded-and')}</p>
        )}
      </Panel>

      <Panel title={module.title} subtitle={module.description} headingLevel={2}>
        {module.content.length === 0 ? (
          <p className="text-body text-fg-subtle">{t('p.this-module-has-no-lesson-sections')}</p>
        ) : (
          <div className="space-y-6">
            {module.content.map((section) => (
              <section key={section.heading}>
                <h3 className="text-h text-fg">{section.heading}</h3>
                <p className="mt-2 whitespace-pre-line text-body text-fg-muted">{section.body}</p>
              </section>
            ))}
          </div>
        )}
      </Panel>

      {module.takeaway ? (
        <Panel tone="quiet" title={t('x.the-one-thing-to-remember')} headingLevel={2}>
          <p className="text-lead text-fg">{module.takeaway}</p>
        </Panel>
      ) : null}

      <div className="flex justify-end">
        <Button asChild variant="secondary">
          <Link to="/portal">{t('u.back-to-my-security')}</Link>
        </Button>
      </div>
    </div>
  )
}
