/**
 * Attaching real training to a finding.
 *
 * What this does NOT do is the important part. It does not generate a module:
 * writing lesson content at this point would either fabricate it or route
 * AI-written material to employees around the review gate the loop puts in
 * front of every generated module. So it attaches an existing, human-approved
 * module — and when there is no approved module to attach, it says exactly that
 * instead of offering a button that cannot work.
 *
 * Two more refusals to paper over:
 *
 * - **The API needs named people.** A finding that names none cannot be
 *   assigned from here, and the dialog says so rather than silently assigning
 *   to nobody.
 * - **A partial assignment is not a success.** The response carries a `skipped`
 *   list with a reason per person — somebody on long-term leave, somebody who
 *   already has this module open — and every one of them is shown. It also
 *   states how durable the finding→assignment link is in this build, which is
 *   the one thing a closed-loop product must not overstate.
 */

import { useT } from '../../lib/i18n'
import { GraduationCap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AsyncBoundary, SkeletonText } from '../../components/states'
import { Button, Checkbox, Dialog, Select, Textarea, useToast } from '../../components/ui'
import { useAssignFindingTraining } from '../../lib/api/mutations'
import { useTrainingModules } from '../../lib/api/queries'
import { humanise } from '../../lib/format'
import { readTrainingAssignResult, type AffectedEmployeeRef, type TrainingAssignResult } from './data'

export interface AssignTrainingDialogProps {
  findingId: number
  findingTitle: string
  /** Resolved by the detail endpoint, with employment status carried through. */
  employees: AffectedEmployeeRef[]
  /** Null when the finding names no specific training requirement. */
  requiredTraining: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignTrainingDialog({
  findingId,
  findingTitle,
  employees,
  requiredTraining,
  open,
  onOpenChange,
}: AssignTrainingDialogProps) {
  const t = useT()
  const modules = useTrainingModules('approved')
  const assign = useAssignFindingTraining()
  const toast = useToast()

  const [moduleId, setModuleId] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [result, setResult] = useState<TrainingAssignResult | null>(null)

  const assignable = employees.filter(
    (employee) => employee.resolved && employee.employment_status !== 'left',
  )

  useEffect(() => {
    if (!open) return
    setModuleId('')
    setNote('')
    setResult(null)
    setSelected(assignable.map((employee) => employee.id))
    // `employees` comes from the query cache and is stable between renders of
    // one finding; re-seeding on every render would fight the checkboxes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, findingId])

  const approved = modules.data ?? []
  const options = approved.map((module) => ({
    value: String(module.id),
    label: `${module.title} · ${module.est_minutes} min`,
  }))

  const blocked = !moduleId || selected.length === 0

  const submit = () => {
    assign.mutate(
      {
        id: findingId,
        body: {
          module_id: Number(moduleId),
          employee_ids: selected,
          note: note.trim(),
        },
      },
      {
        onSuccess: (raw) => {
          const parsed = readTrainingAssignResult(raw)
          setResult(parsed)
          if (parsed && parsed.assigned.length === 0) {
            toast.show({
              title: 'Nobody was assigned',
              description: 'Every named person was skipped. The reasons are on the dialog.',
              tone: 'warning',
            })
          } else if (parsed) {
            toast.show({
              title: `Assigned to ${parsed.assigned.length} of ${selected.length}`,
              description: parsed.module_title,
              tone: 'success',
            })
          }
        },
        onError: (error) => {
          toast.show({
            title: 'The training assignment was refused',
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
      title={t('x.assign-training-for-this-finding')}
      description={t('x.attaches-an-alreadyapproved-module-to')}
      size="md"
      footer={
        result ? (
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<GraduationCap className="size-4" />}
              onClick={submit}
              loading={assign.isPending}
              disabled={blocked || approved.length === 0 || assignable.length === 0}
            >
              Assign training
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="text-body text-fg">
            {result.assigned.length} assignment{result.assigned.length === 1 ? '' : 's'} created
            for “{result.module_title}”.
          </p>

          {result.assigned.length > 0 ? (
            <ul className="space-y-1 text-sm text-fg-muted">
              {result.assigned.map((row) => (
                <li key={row.employee_id}>
                  {row.name ?? `Employee ${row.employee_id}`}
                  <span className="tech ml-2 text-fg-faint">#{row.assignment_id}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {result.skipped.length > 0 ? (
            <div className="rounded-control border border-medium/35 bg-medium/5 p-3">
              <p className="text-sm text-fg">
                {result.skipped.length} person
                {result.skipped.length === 1 ? '' : 's'} skipped
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-fg-muted">
                {result.skipped.map((row) => (
                  <li key={row.employee_id}>
                    {row.name ?? `Employee ${row.employee_id}`} — {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.linkage_note ? (
            <p className="border-l-2 border-line-strong pl-3 text-sm text-fg-subtle">
              {result.linkage_note}
            </p>
          ) : null}
        </div>
      ) : (
        <AsyncBoundary
          isLoading={modules.isLoading}
          error={modules.error}
          onRetry={() => void modules.refetch()}
          loadingLabel={t('x.loading-approved-training-modules')}
          skeleton={<SkeletonText lines={5} />}
        >
          <div className="space-y-4">
            {requiredTraining ? (
              <p className="rounded-control border border-line-subtle bg-base p-3 text-sm text-fg-muted">
                <span className="label mr-2 text-fg-faint">Training this finding asks for</span>
                {requiredTraining}
              </p>
            ) : null}

            {approved.length === 0 ? (
              <p role="alert" className="text-sm text-fg-muted">
                No approved training module exists in this deployment, so there is nothing to
                attach. The API deliberately will not write one here — generating a lesson at
                this point would push unreviewed content past the human approval gate. Approve a
                module in the Training Studio first.
              </p>
            ) : (
              <Select
                label="Approved module"
                options={options}
                value={moduleId}
                onValueChange={setModuleId}
                placeholder="Choose a module…"
                hint="Only modules a human has approved can be assigned."
              />
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-fg-muted">People</legend>
              {employees.length === 0 ? (
                <p role="alert" className="text-sm text-fg-muted">
                  This finding names no employees, and the API requires an explicit list. There
                  is nobody to assign from this screen — record the affected people on the
                  finding first.
                </p>
              ) : (
                employees.map((employee) => {
                  const gone = employee.employment_status === 'left'
                  const unresolved = !employee.resolved
                  return (
                    <Checkbox
                      key={employee.id}
                      label={employee.name ?? `Employee ${employee.id}`}
                      checked={selected.includes(employee.id)}
                      disabled={gone || unresolved}
                      hint={
                        unresolved
                          ? 'This id no longer resolves to an employee record.'
                          : [
                              employee.department_name,
                              employee.employment_status && employee.employment_status !== 'active'
                                ? humanise(employee.employment_status)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || undefined
                      }
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, employee.id]
                            : current.filter((id) => id !== employee.id),
                        )
                      }
                    />
                  )
                })
              )}
            </fieldset>

            <Textarea
              label="Note for the assignment (optional)"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              hint={`Recorded on each assignment beside "Policy finding #${findingId}: ${findingTitle}".`}
            />
          </div>
        </AsyncBoundary>
      )}
    </Dialog>
  )
}
