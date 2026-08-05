/**
 * What the affected employee is actually shown.
 *
 * An analyst classifying a risk `restricted` is deciding that the person named
 * by it will not be told what happened to them. That is a consequential thing
 * to do through a dropdown, and until it is visible it is invisible — so this
 * panel renders the employee's own view beside the analyst's, field for field.
 *
 * It is a **mirror, not a fetch**. `/api/incident-risks/my` answers for the
 * caller, and the analyst is not a subject of this risk, so there is no request
 * that would return the employee's payload. The redaction rule is therefore
 * reproduced from `vocabulary.ts`, which is a deliberate duplicate of the
 * server's `REDACTED_CONFIDENTIALITY` — the one place in this feature that can
 * drift from the backend, and labelled as such on the screen.
 */

import { useT } from '../../lib/i18n'
import { EyeOff, Eye } from 'lucide-react'
import { EvidenceList } from '../../components/data'
import { Badge, Panel, Separator } from '../../components/ui'
import { deadlineIn, formatDate } from '../../lib/format'
import type { IncidentRiskDetail } from '../../domain/types'
import { confidentialityLabel, hidesIncidentDetail } from './vocabulary'

export interface EmployeeViewPanelProps {
  risk: IncidentRiskDetail
}

export function EmployeeViewPanel({ risk }: EmployeeViewPanelProps) {
  const t = useT()
  const redacted = hidesIncidentDetail(risk.confidentiality)
  const due = deadlineIn(risk.deadline)
  const requirements = [
    risk.requires_training && 'training',
    risk.requires_quiz && 'a quiz',
    risk.requires_sandbox && 'a sandbox exercise',
  ].filter(Boolean) as string[]

  return (
    <Panel
      headingLevel={2}
      title={t('x.what-the-affected-employee-sees')}
      subtitle={`Classified ${confidentialityLabel(risk.confidentiality).toLowerCase()}`}
      actions={
        <Badge tone={redacted ? 'medium' : 'neutral'} dot>
          {redacted ? 'Detail withheld' : 'Nothing withheld'}
        </Badge>
      }
    >
      <div className="rounded-control border border-dashed border-line-strong bg-base p-4">
        <p className="flex items-center gap-2 text-xs text-fg-faint">
          {redacted ? (
            <EyeOff size={13} className="shrink-0" aria-hidden="true" />
          ) : (
            <Eye size={13} className="shrink-0" aria-hidden="true" />
          )}
          The employee&rsquo;s own view of this risk
        </p>

        <h3 className="mt-3 text-h text-fg">{risk.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-subtle">
          <Badge size="sm" status={risk.severity} />
          <Badge size="sm" status={risk.status} />
          {risk.approver_name && <span>Approved by {risk.approver_name}</span>}
        </p>

        <Separator className="my-4" fade />

        <dl className="flex flex-col gap-4">
          <div>
            <dt className="label text-fg-subtle">What happened</dt>
            <dd className="mt-1.5 text-sm">
              {redacted ? (
                <span className="text-medium">
                  Investigation detail is classified{' '}
                  {confidentialityLabel(risk.confidentiality).toLowerCase()} and is withheld from
                  this view. Contact {risk.approver_name || 'the incident approver'} if you need it.
                </span>
              ) : (
                <span className="whitespace-pre-line text-fg">
                  {risk.description || 'No description was recorded.'}
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="label text-fg-subtle">What you must do</dt>
            <dd className="mt-1.5 text-sm text-fg">
              {risk.required_action || 'No required action was recorded.'}
              {requirements.length > 0 && (
                <span className="mt-1 block text-fg-subtle">
                  This incident requires {requirements.join(', ')}
                  {risk.min_score !== null ? `, and a score of at least ${risk.min_score}%` : ''}.
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="label text-fg-subtle">By when</dt>
            <dd className="mt-1.5 text-sm">
              {risk.deadline ? (
                <span className={due.overdue ? 'text-high' : 'text-fg'}>
                  {formatDate(risk.deadline)} — {due.text}
                </span>
              ) : (
                <span className="text-fg-subtle">No deadline was set.</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="label text-fg-subtle">Evidence</dt>
            <dd className="mt-1.5 text-sm">
              {redacted ? (
                <span className="text-medium">
                  Withheld at this classification. Incident evidence routinely names other people.
                </span>
              ) : (
                <EvidenceList
                  items={risk.evidence}
                  emptyMessage={t('x.no-evidence-was-recorded-for-2')}
                />
              )}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 text-xs text-fg-faint">
        Reproduced from the redaction rule the API applies at{' '}
        <span className="tech">/api/incident-risks/my</span>: anything above{' '}
        <span className="tech">internal</span> withholds the narrative and the evidence. Lowering
        the classification un-redacts both for every subject the next time they open it.
      </p>
    </Panel>
  )
}
