/**
 * An assignment that is already done, reopened.
 *
 * The lesson is still worth reading, so it is all here. The per-question
 * breakdown is not: the platform returns it once, when it grades, and does not
 * store the answers that were given. Saying so plainly is the only honest
 * option — a review screen that silently omits the questions reads as though
 * they were never asked.
 */

import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../../components/data'
import { Badge, Button, Panel } from '../../../components/ui'
import type { AssignmentDetail } from '../../../domain/types'
import { duration, formatDateTime, num } from '../../../lib/format'

export interface CompletedReviewProps {
  assignment: AssignmentDetail
}

export function CompletedReview({ assignment }: CompletedReviewProps) {
  const { module } = assignment

  return (
    <div className="space-y-6">
      <Panel
        title="You have already completed this"
        subtitle={
          assignment.completed_at
            ? `Finished ${formatDateTime(assignment.completed_at)}`
            : 'The completion time was not recorded.'
        }
        actions={<Badge status={assignment.status} dot />}
        headingLevel={2}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <span className="label text-fg-subtle">Score recorded</span>
            <p className="mt-1.5 text-title text-fg tabular-nums">
              {assignment.score === null ? (
                <NoMeasurement reason="No quiz score was recorded against this assignment." />
              ) : (
                `${num(assignment.score, 0)}%`
              )}
            </p>
          </div>
          <div>
            <span className="label text-fg-subtle">Time spent</span>
            <p className="mt-1.5 text-title text-fg tabular-nums">
              {assignment.time_spent_seconds === null ? (
                <NoMeasurement reason="Time spent was not recorded for this assignment." />
              ) : (
                duration(assignment.time_spent_seconds * 1000)
              )}
            </p>
          </div>
          <div>
            <span className="label text-fg-subtle">Delivered as</span>
            <p className="mt-1.5 text-title text-fg">{module.est_minutes} min module</p>
          </div>
        </div>

        <p className="mt-5 border-t border-line-subtle pt-4 text-sm text-fg-subtle">
          Your individual answers were graded and then discarded — only the score was kept, so this
          screen cannot show you which questions you got wrong.
        </p>
      </Panel>

      <Panel title={module.title} subtitle={module.description} headingLevel={2}>
        {module.content.length === 0 ? (
          <p className="text-body text-fg-subtle">This module has no lesson sections recorded.</p>
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
        <Panel tone="quiet" title="The one thing to remember" headingLevel={2}>
          <p className="text-lead text-fg">{module.takeaway}</p>
        </Panel>
      ) : null}

      <div className="flex justify-end">
        <Button asChild variant="secondary">
          <Link to="/portal">Back to my security</Link>
        </Button>
      </div>
    </div>
  )
}
