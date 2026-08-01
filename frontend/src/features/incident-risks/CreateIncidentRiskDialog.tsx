/**
 * Opening a risk against named people.
 *
 * The form is long on purpose. Every field here is something an auditor or the
 * named employee will ask about later, and a shorter form would simply move the
 * question to a conversation nobody recorded.
 *
 * Two behaviours worth knowing about.
 *
 * **Confidentiality states its consequence, not its name.** "Restricted" tells
 * an analyst nothing; "the affected employee will not be shown what happened"
 * tells them exactly what they are choosing. The sentence updates as the
 * selection changes and sits directly under the control.
 *
 * **Creating and attaching are two calls, and the second can fail on its own.**
 * The API opens a risk without an employee list, then takes subjects on a
 * separate endpoint. If the attach fails the risk still exists, so the dialog
 * says so and sends the analyst to the record rather than reporting a failure
 * that would leave them looking for a risk they think was never created.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  Select,
  Separator,
  Textarea,
  useToast,
} from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { useCreateIncidentRisk } from '../../lib/api/mutations'
import { useDepartments } from '../../lib/api/queries'
import { deadlineIn } from '../../lib/format'
import { EmployeePicker } from './EmployeePicker'
import { EvidenceRowsField } from './EvidenceRowsField'
import { useAttachSubjects } from './useAttachSubjects'
import {
  CREATE_RISK_DEFAULTS,
  createRiskSchema,
  toCreatePayload,
  type CreateRiskValues,
} from './createRiskSchema'
import {
  CONFIDENTIALITY_CONSEQUENCE,
  CONFIDENTIALITY_OPTIONS,
  RISK_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  hidesIncidentDetail,
} from './vocabulary'

const FORM_ID = 'create-incident-risk'

export interface CreateIncidentRiskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateIncidentRiskDialog({ open, onOpenChange }: CreateIncidentRiskDialogProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const departments = useDepartments()
  const createRisk = useCreateIncidentRisk()
  const attachSubjects = useAttachSubjects()

  const [employeeIds, setEmployeeIds] = useState<number[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const form = useForm<CreateRiskValues>({
    resolver: zodResolver(createRiskSchema),
    defaultValues: CREATE_RISK_DEFAULTS,
    mode: 'onBlur',
  })

  const busy = createRisk.isPending || attachSubjects.isPending
  const confidentiality = form.watch('confidentiality')
  const deadline = form.watch('deadline')
  const deadlineReadout = deadline ? deadlineIn(`${deadline}T23:59:59Z`) : null

  const departmentOptions = [
    { value: 'none', label: 'No single department' },
    ...(departments.data ?? []).map((department) => ({
      value: String(department.id),
      label: department.name,
    })),
  ]

  const close = (next: boolean) => {
    if (busy) return
    if (!next) {
      form.reset(CREATE_RISK_DEFAULTS)
      setEmployeeIds([])
      setFailure(null)
    }
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null)
    let createdId: number
    try {
      const created = await createRisk.mutateAsync(toCreatePayload(values))
      createdId = created.id
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : 'The risk could not be opened. Nothing was saved.',
      )
      return
    }

    if (employeeIds.length > 0) {
      try {
        await attachSubjects.mutateAsync({ id: createdId, employee_ids: employeeIds })
      } catch (error) {
        const detail = error instanceof ApiError ? error.message : 'The employees could not be attached.'
        toast.show({
          tone: 'warning',
          title: 'Risk opened, but nobody was attached',
          description: `${detail} Attach the affected people from the risk itself.`,
        })
        close(false)
        void navigate(`/incident-risks/${createdId}`)
        return
      }
    }

    toast.show({
      tone: 'success',
      title: 'Risk opened as a draft',
      description:
        employeeIds.length > 0
          ? `${employeeIds.length} ${employeeIds.length === 1 ? 'person is' : 'people are'} attached. Nobody is on the hook until the required work is assigned.`
          : 'Nobody is attached yet, so nobody is on the hook.',
    })
    close(false)
    void navigate(`/incident-risks/${createdId}`)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      size="lg"
      title="Open an incident risk"
      description="A risk charged to named people. It starts as a draft — nobody is asked for anything until the required work is assigned."
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={busy}>
            Open risk
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {failure && (
          <p
            role="alert"
            className="rounded-control border border-critical/35 bg-critical/12 px-3 py-2 text-sm text-critical"
          >
            {failure}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            required
            className="sm:col-span-2"
            error={form.formState.errors.title?.message}
            placeholder="Credential entered on a spoofed supplier portal"
            {...form.register('title')}
          />
          <Input
            label="Related incident reference"
            hint="The ticket or case this came from. It is what the audit trail labels every entry with."
            inputClassName="tech"
            placeholder="INC-2026-0184"
            {...form.register('incident_ref')}
          />
          <Controller
            control={form.control}
            name="risk_type"
            render={({ field }) => (
              <Select
                label="Risk type"
                required
                options={RISK_TYPE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="severity"
            render={({ field }) => (
              <Select
                label="Severity"
                required
                options={SEVERITY_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="affected_department_id"
            render={({ field }) => (
              <Select
                label="Affected department"
                hint="Optional. Use it when the exposure is a team's, not one person's."
                options={departmentOptions}
                value={field.value}
                onValueChange={field.onChange}
                disabled={departments.isLoading}
              />
            )}
          />
        </div>

        <Textarea
          label="What happened"
          required
          rows={4}
          error={form.formState.errors.description?.message}
          hint="Written for the record. Depending on the confidentiality below, the affected employee may read this."
          placeholder="Describe the incident, how it was found, and what the exposure was."
          {...form.register('description')}
        />

        <EvidenceRowsField control={form.control} register={form.register} disabled={busy} />

        <Separator fade />

        <EmployeePicker
          value={employeeIds}
          onChange={setEmployeeIds}
          hint="Who the incident named. They are attached to the risk; the required work is assigned separately, from the risk itself."
        />

        <Separator fade />

        <div className="flex flex-col gap-2">
          <Controller
            control={form.control}
            name="confidentiality"
            render={({ field }) => (
              <Select
                label="Confidentiality"
                required
                options={CONFIDENTIALITY_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <p
            aria-live="polite"
            className={
              hidesIncidentDetail(confidentiality)
                ? 'flex items-start gap-2 rounded-control border border-medium/35 bg-medium/12 px-3 py-2 text-sm text-medium'
                : 'text-sm text-fg-subtle'
            }
          >
            {hidesIncidentDetail(confidentiality) && (
              <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{CONFIDENTIALITY_CONSEQUENCE[confidentiality]}</span>
          </p>
        </div>

        <Textarea
          label="Required action"
          required
          rows={3}
          error={form.formState.errors.required_action?.message}
          hint="Shown to the affected employee at every confidentiality level."
          placeholder="Complete the supplier-impersonation module and change the exposed credential."
          {...form.register('required_action')}
        />

        <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0" disabled={busy}>
          <legend className="text-sm font-medium text-fg-muted">What discharges this risk</legend>
          <Controller
            control={form.control}
            name="requires_training"
            render={({ field }) => (
              <Checkbox
                label="Requires training"
                hint="Carried by a real training assignment against an approved module."
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="requires_quiz"
            render={({ field }) => (
              <Checkbox
                label="Requires a quiz"
                hint="Only satisfied if the module you assign actually carries questions."
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="requires_sandbox"
            render={({ field }) => (
              <Checkbox
                label="Requires a sandbox exercise"
                hint="Nothing in this deployment can assign one — sandbox submission is analyst-only. Recording it is a manual step."
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Minimum score"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            hint="The reviewer applies this bar when accepting a completion. The quiz grader does not know about it."
            error={form.formState.errors.min_score?.message}
            {...form.register('min_score')}
          />
          <Input
            label="Deadline"
            type="date"
            hint={
              deadlineReadout
                ? `Due end of day UTC — ${deadlineReadout.text}${deadlineReadout.overdue ? ', already past' : ''}.`
                : 'Optional. Interpreted as the end of that day, UTC.'
            }
            {...form.register('deadline')}
          />
          <Input
            label="Approver"
            required
            error={form.formState.errors.approver_name?.message}
            hint="Shown to the affected employee as who to contact."
            placeholder="Head of Security Operations"
            {...form.register('approver_name')}
          />
        </div>

        <Textarea
          label="Closure criteria"
          required
          rows={2}
          error={form.formState.errors.closure_criteria?.message}
          hint="Quoted back when somebody closes this, so the closure note can be checked against it."
          placeholder="All named subjects accepted at or above the pass mark, and the credential rotated."
          {...form.register('closure_criteria')}
        />
      </form>
    </Dialog>
  )
}
