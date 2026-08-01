/**
 * Turning a connection off, on the record.
 *
 * The reason is required by the API and required here, for the same reason:
 * disabling an integration silently stops course imports and completion sync,
 * and "who turned it off and why" is the first question asked weeks later when
 * the training records stopped moving. The stored `last_sync_*` is deliberately
 * preserved by the server — how the connection was last behaving is the context
 * somebody needs when deciding whether to turn it back on.
 */

import { useEffect, useState } from 'react'
import { Button, Dialog, Textarea, useToast } from '../../components/ui'
import type { Integration } from '../../domain/types'
import { useIntegrationAction } from '../../lib/api/mutations'

export interface DisableDialogProps {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisableDialog({ integration, open, onOpenChange }: DisableDialogProps) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setReason('')
    setFailure(null)
  }, [open])

  const disable = useIntegrationAction('disable', {
    onSuccess: () => {
      toast.show({
        title: `${integration.display_name} disabled`,
        description: 'The reason was written to the audit trail. The last sync record is unchanged.',
        tone: 'success',
      })
      onOpenChange(false)
    },
    onError: (error) => setFailure(error.message),
  })

  const trimmed = reason.trim()

  return (
    <Dialog
      title={`Disable ${integration.display_name}`}
      description="Course imports and completion sync stop. The connection settings and the last sync result are kept."
      open={open}
      onOpenChange={disable.isPending ? undefined : onOpenChange}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={disable.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!trimmed}
            loading={disable.isPending}
            onClick={() => {
              setFailure(null)
              disable.mutate({ id: integration.id, body: { reason: trimmed } })
            }}
          >
            Disable connection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="Why is this being disabled"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          rows={3}
          hint="Recorded against your account in the audit trail. Required by the API."
          placeholder="Tenant migration — the old Moodle instance is being retired."
        />
        {failure ? (
          <p role="alert" className="text-sm text-critical">
            {failure}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
