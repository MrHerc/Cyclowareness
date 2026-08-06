/**
 * The analyst's disagreement, recorded.
 *
 * A verdict nobody can dispute is a number, not an assessment. Marking a job a
 * false positive does not change its score — it is a note against the record
 * that the rule that fired was wrong here, which is what a future rule change
 * has to be argued from. The copy says that plainly so nobody clicks it
 * expecting the report to rewrite itself.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { SandboxJobDetail } from '../../domain/types'
import { useSandboxFeedback } from '../../lib/api/mutations'
import { Badge, Button, Panel, Textarea, useToast } from '../../components/ui'
import { humanise } from '../../lib/format'

export interface FeedbackPanelProps {
  job: SandboxJobDetail
}

export function FeedbackPanel({ job }: FeedbackPanelProps) {
  const t = useT()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)

  const feedback = useSandboxFeedback({
    onSuccess: () => {
      setNote('')
      setSubmitting(null)
      toast.show({
        title: 'Feedback recorded',
        description: t('p.it-is-attached-to-this-job'),
        tone: 'success',
      })
    },
    onError: (error) => {
      setSubmitting(null)
      toast.show({ title: t('p.could-not-record-the-feedback'), description: error.message, tone: 'error' })
    },
  })

  function send(verdict: 'false_positive' | 'true_positive') {
    setSubmitting(verdict)
    feedback.mutate({ publicId: job.public_id, verdict, note: note.trim() || undefined })
  }

  return (
    <Panel
      title={t('x.analyst-feedback')}
      subtitle={t('x.was-this-verdict-right-the')}
      actions={
        job.feedback ? (
          <Badge status={job.feedback} size="sm">
            {`Marked ${humanise(job.feedback).toLowerCase()}`}
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Textarea
          label={t('p.note-optional')}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint={t('p.what-the-engine-got-right-or')}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            icon={<ThumbsDown className="size-4" aria-hidden="true" strokeWidth={1.75} />}
            loading={submitting === 'false_positive'}
            disabled={feedback.isPending}
            onClick={() => send('false_positive')}
          >
            False positive
          </Button>
          <Button
            variant="outline"
            icon={<ThumbsUp className="size-4" aria-hidden="true" strokeWidth={1.75} />}
            loading={submitting === 'true_positive'}
            disabled={feedback.isPending}
            onClick={() => send('true_positive')}
          >
            True positive
          </Button>
        </div>
      </div>
    </Panel>
  )
}
