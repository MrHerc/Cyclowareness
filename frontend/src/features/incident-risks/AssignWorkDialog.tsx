/**
 * Turning an incident's requirements into work somebody actually holds.
 *
 * The dialog stays open after a successful assign, which is deliberate. The
 * server's answer is the interesting part: it names every subject it skipped
 * and why, and it reports every requirement the incident declared that nothing
 * in this deployment can carry — a sandbox exercise, a per-incident pass mark,
 * a quiz on a module with no questions. Closing on success would throw that
 * away and leave an analyst believing five people were assigned when two were.
 *
 * Only approved modules are offered. The human approval gate exists so that
 * unreviewed content never reaches an employee, and an incident is not a way
 * around it — the server refuses anything else with a 409, and offering the
 * choice would only produce that error.
 */

import { useT } from '../../lib/i18n'
import { CircleAlert, CircleCheck, GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import { EmptyState } from '../../components/states'
import { Button, Checkbox, Dialog, Select, Separator, Textarea } from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { useIncidentRiskAction } from '../../lib/api/mutations'
import { useCapabilities, useTrainingModules } from '../../lib/api/queries'
import { cn } from '../../lib/format'
import { provenanceOf, type IncidentRiskDetail } from '../../domain/types'
import { assignResultOf, type AssignResult } from './wire'

export interface AssignWorkDialogProps {
  risk: IncidentRiskDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignWorkDialog({ risk, open, onOpenChange }: AssignWorkDialogProps) {
  const t = useT()
  const modules = useTrainingModules('approved')
  const capabilities = useCapabilities()
  const assign = useIncidentRiskAction('assign')

  // Undefined rather than '' — Radix reads an empty string as "no item", and a
  // controlled select handed one never shows its placeholder again.
  const [moduleId, setModuleId] = useState<string | undefined>(undefined)
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<number[] | null>(null)
  const [result, setResult] = useState<AssignResult | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const assignable = useMemo(
    () => risk.subjects.filter((subject) => subject.assignment_id === null),
    [risk.subjects],
  )
  const chosen = selected ?? assignable.map((subject) => subject.id)

  const moduleOptions = (modules.data ?? []).map((module) => ({
    value: String(module.id),
    label: `${module.title} · ${module.quiz.length} question${module.quiz.length === 1 ? '' : 's'}`,
  }))

  const chosenModule = (modules.data ?? []).find((module) => String(module.id) === moduleId) ?? null

  const close = (next: boolean) => {
    if (assign.isPending) return
    if (!next) {
      setModuleId(undefined)
      setNote('')
      setSelected(null)
      setResult(null)
      setFailure(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    setFailure(null)
    setResult(null)
    try {
      const answer = await assign.mutateAsync({
        id: risk.id,
        body: {
          module_id: moduleId === undefined ? null : Number(moduleId),
          subject_ids: chosen,
          note: note.trim(),
        },
      })
      const parsed = assignResultOf(answer)
      setResult(parsed)
      if (!parsed) {
        setFailure(
          'The assignment was accepted but the server answered in a shape this screen does not recognise. Reload the risk to see where it stands.',
        )
      }
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : t('p.the-assignment-did-not-go-through'),
      )
    }
  }

  const noApprovedModule = !modules.isLoading && moduleOptions.length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={t('x.assign-the-required-work')}
      description={t('x.creates-real-training-assignments-against')}
      footer={
        result ? (
          <Button variant="primary" onClick={() => close(false)}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => close(false)} disabled={assign.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={assign.isPending}
              disabled={chosen.length === 0 || noApprovedModule}
              onClick={() => void submit()}
            >
              Assign to {chosen.length} {chosen.length === 1 ? 'person' : 'people'}
            </Button>
          </>
        )
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

        {result ? (
          <AssignOutcome result={result} />
        ) : noApprovedModule ? (
          <EmptyState
            compact
            icon={GraduationCap}
            headline={t('u.no-approved-module-to-assign')}
            description={t('x.only-a-module-that-has')}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link to="/training">{t('u.go-to-training')}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Select
              label={t('p.module-to-assign')}
              required
              placeholder={modules.isLoading ? t('p.loading-approved-modules') : t('p.choose-an-approved-module')}
              options={moduleOptions}
              value={moduleId}
              onValueChange={setModuleId}
              disabled={modules.isLoading}
              hint={t('p.only-approved-modules-appear-here-choosing')}
            />

            {chosenModule && (
              <div className="flex flex-wrap items-center gap-2 rounded-control border border-line-subtle bg-base px-3 py-2">
                <AIProvenanceBadge
                  provenance={provenanceOf(chosenModule.generation_source, { approved: true })}
                  generationSource={chosenModule.generation_source}
                  modelConnected={
                    capabilities.data ? capabilities.data.ai_provider === 'anthropic' : undefined
                  }
                />
                <span className="text-xs text-fg-subtle">
                  {chosenModule.quiz.length === 0
                    ? t('p.this-module-carries-no-questions-so')
                    : `${chosenModule.quiz.length} question${chosenModule.quiz.length === 1 ? '' : 's'} · about ${chosenModule.est_minutes} minutes`}
                </span>
              </div>
            )}

            <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="text-sm font-medium text-fg-muted">{t('u.who-to-assign')}</legend>
              {assignable.length === 0 ? (
                <p className="text-sm text-fg-subtle">{t('p.everyone-attached-to-this-risk-already')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {assignable.map((subject) => (
                    <li key={subject.id}>
                      <Checkbox
                        label={subject.employee_name ?? `Employee ${subject.employee_id}`}
                        checked={chosen.includes(subject.id)}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked
                              ? [...new Set([...chosen, subject.id])]
                              : chosen.filter((id) => id !== subject.id),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <Separator fade />

            <Textarea
              label="Note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              hint={t('p.recorded-on-the-audit-entry-not')}
            />
          </>
        )}
      </div>
    </Dialog>
  )
}

/** The server's answer, in full — including the parts that did not happen. */
function AssignOutcome({ result }: { result: AssignResult }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-fg" role="status" aria-live="polite">
        {result.detail}
      </p>

      {result.assigned.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="label text-fg-subtle">{t('y.assigned')}</h3>
          <ul className="flex flex-col gap-1.5">
            {result.assigned.map((row) => (
              <li key={row.subject_id} className="flex items-start gap-2 text-sm text-fg-muted">
                <CircleCheck size={14} className="mt-0.5 shrink-0 text-safe" aria-hidden="true" />
                <span>
                  <span className="text-fg">{row.employee_name}</span>
                  {' — training assignment '}
                  <span className="tech">{row.assignment_id}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.skipped.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="label text-fg-subtle">{t('y.skipped-and-why')}</h3>
          <ul className="flex flex-col gap-2">
            {result.skipped.map((row) => (
              <li
                key={row.subject_id}
                className="rounded-control border border-line-subtle bg-base px-3 py-2"
              >
                <p className="text-sm text-fg">{row.employee_name}</p>
                <p className="mt-0.5 text-sm text-fg-subtle">{row.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.requirements.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="label text-fg-subtle">{t('y.what-carries-each-requirement')}</h3>
          <ul className="flex flex-col gap-2">
            {result.requirements.map((requirement) => (
              <li
                key={requirement.requirement}
                className={cn(
                  'rounded-control border px-3 py-2',
                  requirement.fulfilled
                    ? 'border-line-subtle bg-base'
                    : 'border-medium/35 bg-medium/12',
                )}
              >
                <p className="flex items-center gap-2 text-sm">
                  {requirement.fulfilled ? (
                    <CircleCheck size={14} className="shrink-0 text-safe" aria-hidden="true" />
                  ) : (
                    <CircleAlert size={14} className="shrink-0 text-medium" aria-hidden="true" />
                  )}
                  <span className="text-fg">{requirement.requirement.replace(/_/g, ' ')}</span>
                  <span className="text-fg-faint">
                    {requirement.mechanism || 'nothing in this deployment'}
                  </span>
                </p>
                <p className="mt-1 text-sm text-fg-subtle">{requirement.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
