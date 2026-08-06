/**
 * Attaching more people to a risk that is already open.
 *
 * Additive only, and the server enforces that: somebody already attached is
 * left exactly as they are, because re-posting a list must never reset a person
 * who has already completed the work. The picker shows those people as attached
 * and refuses to unselect them, so the dialog cannot promise something the
 * endpoint will not do.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { Button, Dialog, Textarea } from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import type { IncidentRiskDetail } from '../../domain/types'
import { EmployeePicker } from './EmployeePicker'
import { useAttachSubjects } from './useAttachSubjects'

export interface AttachSubjectsDialogProps {
  risk: IncidentRiskDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttachSubjectsDialog({ risk, open, onOpenChange }: AttachSubjectsDialogProps) {
  const t = useT()
  const attach = useAttachSubjects()
  const [employeeIds, setEmployeeIds] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  const alreadyAttached = risk.subjects.map((subject) => subject.employee_id)

  const dismiss = (next: boolean) => {
    if (attach.isPending) return
    if (!next) {
      setEmployeeIds([])
      setNote('')
      setFailure(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    setFailure(null)
    try {
      await attach.mutateAsync({ id: risk.id, employee_ids: employeeIds, note: note.trim() })
      dismiss(false)
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : t('p.nobody-was-attached-the-risk-is'),
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={dismiss}
      size="lg"
      title={t('x.attach-people-to-this-risk')}
      description={t('x.attaching-names-somebody-in-the')}
      footer={
        <>
          <Button variant="ghost" onClick={() => dismiss(false)} disabled={attach.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={attach.isPending}
            disabled={employeeIds.length === 0}
            onClick={() => void submit()}
          >
            Attach {employeeIds.length || ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {failure && (
          <p
            role="alert"
            className="rounded-control border border-critical/35 bg-critical/12 px-3 py-2 text-sm text-critical"
          >
            {failure}
          </p>
        )}

        <EmployeePicker
          value={employeeIds}
          onChange={setEmployeeIds}
          alreadyAttached={alreadyAttached}
          label={t('p.people-to-attach')}
          hint={t('p.anyone-already-attached-is-shown-as')}
        />

        <Textarea
          label="Note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint={t('p.recorded-on-the-audit-entry-why')}
        />
      </div>
    </Dialog>
  )
}
