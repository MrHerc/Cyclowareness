/**
 * Recording what an analyst thinks of one advisory.
 *
 * `unassessed` is not offered: it is the absence of a judgement, and the API
 * refuses to have one asserted. "Not applicable" demands a reason for the same
 * reason the server demands one — "we looked and it does not touch us" is a
 * claim the organisation may one day have to defend, and it is not the same
 * claim as "nobody looked".
 */

import { useState } from 'react'
import { ErrorState } from '../../components/states'
import { Button, Dialog, RadioGroup, Textarea, useToast } from '../../components/ui'
import type { IntelItem } from '../../domain/types'
import { useAssessIntel } from '../../lib/api/mutations'
import { ASSESSABLE_RELEVANCE, RELEVANCE_LABEL } from './vocabulary'

export interface AssessDialogProps {
  item: IntelItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Mounted only while open — the caller unmounts it on close, which is what
 * keeps a second visit from inheriting the first attempt's text or its error.
 */
export function AssessDialog({ item, open, onOpenChange }: AssessDialogProps) {
  const toast = useToast()
  const assess = useAssessIntel()
  const [relevance, setRelevance] = useState<string>(
    item.relevance === 'unassessed' ? 'relevant' : item.relevance,
  )
  const [reason, setReason] = useState(item.relevance_reason ?? '')
  const [touched, setTouched] = useState(false)

  const reasonRequired = relevance === 'not_applicable'
  const missingReason = reasonRequired && !reason.trim()

  function submit() {
    setTouched(true)
    if (missingReason) return
    assess.mutate(
      { id: item.id, relevance, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.show({
            title: `Assessed as ${RELEVANCE_LABEL[relevance as keyof typeof RELEVANCE_LABEL] ?? relevance}`,
            description: 'The judgement and its reason are on the audit trail.',
            tone: 'success',
          })
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assess relevance"
      description={`How much does ${item.external_id?.trim() || 'this advisory'} matter to this organisation?`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={assess.isPending} onClick={submit}>
            Record assessment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <RadioGroup
          label="Judgement"
          value={relevance}
          onValueChange={setRelevance}
          options={ASSESSABLE_RELEVANCE.map((option) => ({
            value: option.value,
            label: option.label,
            hint: option.hint,
          }))}
        />

        <Textarea
          label="Reason"
          required={reasonRequired}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={touched && missingReason ? 'A reason is required to mark an advisory not applicable.' : null}
          hint={
            reasonRequired
              ? 'Say what you checked. This is the record of the decision.'
              : 'Optional, and worth writing: it is what the next analyst reads.'
          }
          rows={3}
        />

        {item.dismissed_by ? (
          <p className="text-sm text-fg-subtle">
            This advisory was dismissed by {item.dismissed_by}. Recording an assessment
            supersedes that dismissal and returns it to the queue.
          </p>
        ) : null}

        {assess.isError ? (
          <ErrorState compact error={assess.error} title="The assessment was not recorded" />
        ) : null}
      </div>
    </Dialog>
  )
}
