/**
 * Turning an advisory into a finding somebody owns.
 *
 * The match selector is the important control. A finding raised *from a match*
 * inherits that match's argument — the sentence, the policy, the departments
 * and the people it named — and inherits its confidence. A finding raised with
 * no match behind it is the analyst's own claim and carries no confidence at
 * all, because there is no comparison behind it to be confident about. The
 * dialog says which of the two is about to happen rather than leaving it to be
 * discovered on the finding afterwards.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/states'
import { Button, Dialog, Input, Select, Textarea, useToast } from '../../components/ui'
import type { IntelItemDetail } from '../../domain/types'
import { useCreateFindingFromIntel } from '../../lib/api/mutations'
import { truncate } from '../../lib/format'
import { FINDING_SEVERITY_OPTIONS, FINDING_TYPE_OPTIONS, MATCH_TYPE_LABEL } from './vocabulary'

const NO_MATCH = 'none'

export interface CreateFindingDialogProps {
  item: IntelItemDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFindingDialog({ item, open, onOpenChange }: CreateFindingDialogProps) {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const create = useCreateFindingFromIntel()

  const matches = item.matches ?? []
  const firstOpenMatch = matches.find((match) => match.created_finding_id === null)

  const [matchId, setMatchId] = useState<string>(
    firstOpenMatch ? String(firstOpenMatch.id) : NO_MATCH,
  )
  const [title, setTitle] = useState(item.title)
  const [findingType, setFindingType] = useState('external_advisory_match')
  // `info` is not a severity a finding can be worked at; the closest real one is low.
  const [severity, setSeverity] = useState<string>(
    item.severity === 'info' ? 'low' : item.severity,
  )
  const [owner, setOwner] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [remediation, setRemediation] = useState('')
  const [training, setTraining] = useState('')

  const selectedMatch = matches.find((match) => String(match.id) === matchId) ?? null

  const matchOptions = [
    { value: NO_MATCH, label: t('p.no-match-my-own-claim') },
    ...matches.map((match) => ({
      value: String(match.id),
      label: `${MATCH_TYPE_LABEL[match.match_type] ?? match.match_type} — ${truncate(match.explanation, 60)}`,
      disabled: match.created_finding_id !== null,
    })),
  ]

  function submit() {
    create.mutate(
      {
        id: item.id,
        body: {
          match_id: selectedMatch ? selectedMatch.id : null,
          title: title.trim() || item.title,
          finding_type: findingType,
          severity,
          owner_name: owner.trim(),
          due_date: dueDate ? dueDate : null,
          suggested_remediation: remediation.trim(),
          required_training: training.trim(),
        },
      },
      {
        onSuccess: (finding) => {
          toast.show({
            title: `Finding #${finding.id} raised`,
            description: t('p.opening-it-now-training-is-assigned'),
            tone: 'success',
          })
          onOpenChange(false)
          navigate(`/policy-intelligence/findings/${finding.id}`)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('x.raise-a-policy-finding')}
      description={t('x.a-finding-is-owned-dated')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Raise finding
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label={t('p.argument-this-finding-rests-on')}
          options={matchOptions}
          value={matchId}
          onValueChange={setMatchId}
          hint={
            selectedMatch
              ? t('p.the-match-supplies-the-policy-the')
              : t('p.with-no-match-behind-it-the')
          }
        />

        {selectedMatch ? (
          <p className="rounded-control border border-ai/30 bg-base p-3 text-sm leading-relaxed text-fg-muted">
            {selectedMatch.explanation}
          </p>
        ) : null}

        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          hint={t('p.defaults-to-the-advisorys-own-title')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t('p.finding-type')}
            options={FINDING_TYPE_OPTIONS}
            value={findingType}
            onValueChange={setFindingType}
          />
          <Select
            label="Severity"
            options={FINDING_SEVERITY_OPTIONS}
            value={severity}
            onValueChange={setSeverity}
            hint={t('p.defaults-to-the-advisorys-published-severity')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Owner"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            hint={t('p.who-is-accountable-for-closing-it')}
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            hint="Optional."
          />
        </div>

        <Textarea
          label={t('p.suggested-remediation')}
          value={remediation}
          onChange={(event) => setRemediation(event.target.value)}
          rows={2}
          hint={t('p.optional-what-would-resolve-it')}
        />

        <Input
          label={t('p.required-training')}
          value={training}
          onChange={(event) => setTraining(event.target.value)}
          hint={t('p.names-the-behaviour-to-train-training')}
        />

        {create.isError ? (
          <ErrorState compact error={create.error} title={t('x.the-finding-was-not-raised')} />
        ) : null}
      </div>
    </Dialog>
  )
}
