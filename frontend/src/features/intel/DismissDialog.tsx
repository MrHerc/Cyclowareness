/**
 * Taking an advisory out of the queue, on the record.
 *
 * The reason is required, and the confirm control stays disabled without it.
 * An unexplained dismissal is indistinguishable from nobody having looked,
 * which is the confusion this whole module exists to prevent.
 *
 * Dismissal asserts nothing about relevance. "Stop showing me this" and "this
 * does not apply to us" are different claims, and the copy says so.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { ErrorState } from '../../components/states'
import { Button, Dialog, Textarea, useToast } from '../../components/ui'
import type { IntelItem } from '../../domain/types'
import { useDismissIntel } from '../../lib/api/mutations'

export interface DismissDialogProps {
  item: IntelItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DismissDialog({ item, open, onOpenChange }: DismissDialogProps) {
  const t = useT()
  const toast = useToast()
  const dismiss = useDismissIntel()
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const missing = !reason.trim()

  function submit() {
    setTouched(true)
    if (missing) return
    dismiss.mutate(
      { id: item.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.show({
            title: 'Advisory dismissed',
            description: 'The reason is on the audit trail. Re-assess it to bring it back.',
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
      title={t('x.dismiss-this-advisory')}
      description={t('x.it-leaves-the-queue-its')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={dismiss.isPending}
            disabled={missing}
            onClick={submit}
          >
            Dismiss
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {item.external_id?.trim() || item.title}
        </p>

        <Textarea
          label="Reason"
          required
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={touched && missing ? 'A reason is required to dismiss an advisory.' : null}
          hint="Why this does not need to stay in front of an analyst."
          rows={3}
        />

        {dismiss.isError ? (
          <ErrorState compact error={dismiss.error} title={t('x.the-advisory-was-not-dismissed')} />
        ) : null}
      </div>
    </Dialog>
  )
}
