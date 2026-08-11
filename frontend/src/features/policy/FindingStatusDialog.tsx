/**
 * Moving a finding along — or closing it.
 *
 * The status list is restricted to the moves the API will accept from where the
 * finding is now. That table is duplicated from the router deliberately: the
 * server stays the authority and a refused move is still shown as the error it
 * is, but offering a transition that can only ever come back 409 is a dead end,
 * and this product does not ship dead ends.
 *
 * The note is required for every terminal status *and* for reopening out of
 * one, because a finding that changed hands without a stated reason is
 * indistinguishable from one that was quietly deleted. The control is disabled
 * until it is written rather than letting the API say no.
 */

import { useT } from '../../lib/i18n'
import { useEffect, useState } from 'react'
import { Button, Dialog, Select, Textarea, useToast } from '../../components/ui'
import type { PolicyFinding } from '../../domain/types'
import { useUpdateFinding } from '../../lib/api/mutations'
import { FINDING_STATUS_LABELS, legalMoves, requiresNote } from './vocabulary'

export interface FindingStatusDialogProps {
  finding: PolicyFinding
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preselects a destination — how "Accept the risk" and "False positive" work. */
  preset?: string
}

export function FindingStatusDialog({
  finding,
  open,
  onOpenChange,
  preset,
}: FindingStatusDialogProps) {
  const t = useT()
  const moves = legalMoves(finding.status)
  const [status, setStatus] = useState(preset ?? moves[0] ?? '')
  const [note, setNote] = useState('')
  const toast = useToast()
  const update = useUpdateFinding()

  // Reset on every open: a note written for one decision must not be carried
  // into a different one.
  useEffect(() => {
    if (!open) return
    setStatus(preset ?? moves[0] ?? '')
    setNote('')
  }, [open, preset, moves])

  const noteRequired = status ? requiresNote(finding.status, status) : false
  const blocked = !status || (noteRequired && note.trim().length === 0)

  const options = moves.map((move) => ({
    value: move,
    label: FINDING_STATUS_LABELS[move] ?? move,
  }))

  const submit = () => {
    update.mutate(
      { id: finding.id, body: { status, resolution_note: note.trim() } },
      {
        onSuccess: () => {
          toast.show({
            title: `Finding moved to ${FINDING_STATUS_LABELS[status] ?? status}`,
            description: t('p.the-change-and-its-reason-are'),
            tone: 'success',
          })
          onOpenChange(false)
        },
        onError: (error) => {
          toast.show({
            title: t('p.the-server-refused-this-change'),
            description: error.message,
            tone: 'error',
          })
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('x.change-the-status-of-this')}
      description={`Currently ${FINDING_STATUS_LABELS[finding.status] ?? finding.status}. Only the moves the API accepts from here are listed.`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={update.isPending}
            disabled={blocked}
          >
            {t('u.save-status')}
          </Button>
        </>
      }
    >
      {options.length === 0 ? (
        <p role="alert" className="text-sm text-fg-muted">{t('p.this-finding-is-in-a-state')}</p>
      ) : (
        <div className="space-y-4">
          <Select
            label={t('u.new-status')}
            options={options}
            value={status}
            onValueChange={setStatus}
          />

          <Textarea
            label={t('u.reason')}
            rows={4}
            required={noteRequired}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            hint={
              noteRequired
                ? t('p.required-resolving-accepting-or-reopening-a')
                : t('p.optional-for-this-move-and-kept')
            }
          />
        </div>
      )}
    </Dialog>
  )
}
