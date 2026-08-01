/**
 * Where the incident's own pass mark is actually applied.
 *
 * The quiz grader does not know about `min_score` — it passes at its own fixed
 * threshold, so somebody can be marked complete below the bar this incident
 * set. This dialog is the only place that bar is enforced, which is why it
 * shows the score against it rather than leaving the reviewer to remember the
 * number.
 *
 * A rejection requires a note, and the server enforces that too. Telling
 * somebody their work was not accepted without saying why is how an awareness
 * programme turns into resentment.
 */

import { useState } from 'react'
import { Button, Dialog, RadioGroup, Textarea } from '../../components/ui'
import { NoMeasurement } from '../../components/data'
import { ApiError } from '../../lib/api/client'
import { useReviewSubject } from '../../lib/api/mutations'
import { formatDateTime, num } from '../../lib/format'
import type { IncidentRiskSubject } from '../../domain/types'

export interface ReviewSubjectDialogProps {
  riskId: number
  subject: IncidentRiskSubject | null
  minScore: number | null
  onOpenChange: (open: boolean) => void
}

export function ReviewSubjectDialog({
  riskId,
  subject,
  minScore,
  onOpenChange,
}: ReviewSubjectDialogProps) {
  const review = useReviewSubject()
  const [decision, setDecision] = useState('accepted')
  const [note, setNote] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  const dismiss = (next: boolean) => {
    if (review.isPending) return
    if (!next) {
      setDecision('accepted')
      setNote('')
      setFailure(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!subject) return
    setFailure(null)
    try {
      await review.mutateAsync({
        id: riskId,
        subjectId: subject.id,
        decision,
        note: note.trim(),
      })
      dismiss(false)
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : 'The decision was not recorded. Nothing changed.',
      )
    }
  }

  const belowBar =
    subject !== null &&
    minScore !== null &&
    subject.score !== null &&
    subject.score < minScore

  const rejecting = decision === 'rejected'
  const canSubmit = !rejecting || note.trim().length > 0

  return (
    <Dialog
      open={subject !== null}
      onOpenChange={dismiss}
      title={`Review ${subject?.employee_name ?? 'this subject'}`}
      description="Accepting discharges this person's obligation. Rejecting sends them back to it."
      footer={
        <>
          <Button variant="ghost" onClick={() => dismiss(false)} disabled={review.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={review.isPending}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            Record decision
          </Button>
        </>
      }
    >
      {subject && (
        <div className="flex flex-col gap-4">
          {failure && (
            <p
              role="alert"
              className="rounded-control border border-critical/35 bg-critical/12 px-3 py-2 text-sm text-critical"
            >
              {failure}
            </p>
          )}

          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="label text-fg-subtle">Score</dt>
              <dd className="mt-1 text-lead text-fg">
                {subject.score !== null ? (
                  <span className={belowBar ? 'text-high' : undefined}>
                    {num(subject.score)}%
                    {minScore !== null && (
                      <span className="ml-2 text-sm text-fg-subtle">
                        bar is {minScore}%{belowBar ? ' — below it' : ''}
                      </span>
                    )}
                  </span>
                ) : (
                  <NoMeasurement
                    className="text-lead"
                    reason="This person has no recorded score. The required action may not carry a quiz."
                  />
                )}
              </dd>
            </div>
            <div>
              <dt className="label text-fg-subtle">Completed</dt>
              <dd className="mt-1 text-lead text-fg">
                {subject.completed_at ? formatDateTime(subject.completed_at) : 'Not yet completed'}
              </dd>
            </div>
          </dl>

          <RadioGroup
            label="Decision"
            value={decision}
            onValueChange={setDecision}
            options={[
              {
                value: 'accepted',
                label: 'Accept',
                hint: 'The required action was met to this incident’s standard.',
              },
              {
                value: 'rejected',
                label: 'Reject',
                hint: 'It fell short. A note saying what was short of the bar is required.',
              },
            ]}
          />

          <Textarea
            label="Note"
            required={rejecting}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            hint={
              rejecting
                ? 'Required. This is what the person is told about why their work was not accepted.'
                : 'Optional. Recorded on the audit entry.'
            }
          />
        </div>
      )}
    </Dialog>
  )
}
