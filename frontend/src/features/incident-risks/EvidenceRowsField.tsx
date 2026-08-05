/**
 * The evidence rows on the create form.
 *
 * A risk charged against a named person without evidence is an accusation, and
 * an accusation is the thing this record exists not to be. So the rows are part
 * of the form rather than an afterthought on the detail screen, and each one
 * carries the optional `ref` — the log line, the message id, the ticket — which
 * is what turns a claim into something a third party can check.
 *
 * Rows are not validated: a half-filled row is dropped at submit rather than
 * blocking it, because an analyst who started typing a fourth piece of evidence
 * and changed their mind should not have to find the empty box.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { Button, IconButton, Input } from '../../components/ui'
import type { CreateRiskValues } from './createRiskSchema'

export interface EvidenceRowsFieldProps {
  control: Control<CreateRiskValues>
  register: UseFormRegister<CreateRiskValues>
  disabled?: boolean
}

export function EvidenceRowsField({ control, register, disabled }: EvidenceRowsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'evidence' })

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabled}>
      <legend className="text-sm font-medium text-fg-muted">Evidence</legend>
      <p className="-mt-1 text-xs text-fg-faint">
        What the incident actually found. Empty rows are discarded when the risk is opened.
      </p>

      {fields.length === 0 && (
        <p className="text-sm text-fg-subtle">
          No evidence rows yet. A risk with no evidence can still be opened, but nobody reviewing it
          later will be able to check it.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="grid grid-cols-1 gap-2 rounded-control border border-line-subtle bg-base p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <Input
              label="Label"
              placeholder="Mail gateway verdict"
              {...register(`evidence.${index}.label` as const)}
            />
            <Input
              label="Value"
              placeholder="Delivered to inbox, no quarantine"
              {...register(`evidence.${index}.value` as const)}
            />
            <Input
              label="Reference"
              placeholder="Optional — URL, log id, ticket"
              inputClassName="tech"
              {...register(`evidence.${index}.ref` as const)}
            />
            <IconButton
              label={`Remove evidence row ${index + 1}`}
              variant="ghost"
              onClick={() => remove(index)}
              className="justify-self-start sm:justify-self-auto"
            >
              <Trash2 size={15} aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>

      <div>
        <Button
          size="sm"
          variant="outline"
          icon={<Plus size={14} aria-hidden="true" />}
          onClick={() => append({ label: '', value: '', ref: '' })}
        >
          Add evidence row
        </Button>
      </div>
    </fieldset>
  )
}
