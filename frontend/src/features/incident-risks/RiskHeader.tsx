/**
 * The head of a risk: what it is, and what can legally be done to it next.
 *
 * Every action here is either available or disabled with the reason written
 * beside it — the transitions the server refuses are the same ones `vocabulary`
 * names, so the analyst learns why rather than collecting 409s. The server is
 * still the authority: anything that slips past these guards comes back as a
 * conflict and the dialog shows that message verbatim.
 */

import { useT } from '../../lib/i18n'
import { CheckCircle2, Lock, RotateCcw, Send } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge, Panel, Tooltip } from '../../components/ui'
import { deadlineIn, formatDate, formatDateTime, timeAgo } from '../../lib/format'
import type { IncidentRiskDetail } from '../../domain/types'
import { AssignWorkDialog } from './AssignWorkDialog'
import { CloseRiskDialog, ReopenRiskDialog } from './ClosureDialogs'
import { GuardedAction } from './GuardedAction'
import {
  confidentialityLabel,
  hidesIncidentDetail,
  riskTypeLabel,
  whyCannotAssign,
  whyCannotClose,
  whyCannotReopen,
  type SubjectRollup,
} from './vocabulary'

export interface RiskHeaderProps {
  risk: IncidentRiskDetail
  rollup: SubjectRollup
  canManage: boolean
}

export function RiskHeader({ risk, rollup, canManage }: RiskHeaderProps) {
  const t = useT()
  const [assigning, setAssigning] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)

  const due = deadlineIn(risk.deadline)
  const redacted = hidesIncidentDetail(risk.confidentiality)

  return (
    <Panel tone="feature">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            {risk.incident_ref ? (
              <span className="tech text-fg-subtle">{risk.incident_ref}</span>
            ) : (
              <span className="text-xs text-fg-faint">{t('u.no-incident-reference')}</span>
            )}
            <Badge size="sm" status={risk.status} dot />
            <Badge size="sm" status={risk.severity} />
            {risk.reopened_count > 0 && (
              <Tooltip content="Every reopen is recorded. A risk closed and reopened twice is a different story from one closed once.">
                <span>
                  <Badge size="sm" status="reopened">
                    Reopened ×{risk.reopened_count}
                  </Badge>
                </span>
              </Tooltip>
            )}
          </p>

          <h1 className="mt-2 text-title text-fg">{risk.title}</h1>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Meta label={t('u.risk-type')} value={riskTypeLabel(risk.risk_type)} />
            <Meta
              label={t('p.confidentiality')}
              value={
                <span className={redacted ? 'inline-flex items-center gap-1.5 text-medium' : undefined}>
                  {redacted && <Lock size={13} className="shrink-0" aria-hidden="true" />}
                  {confidentialityLabel(risk.confidentiality)}
                </span>
              }
              hint={
                redacted
                  ? t('p.the-affected-employees-are-not-shown')
                  : t('p.the-affected-employees-see-the-full')
              }
            />
            <Meta
              label={t('u.deadline')}
              value={
                risk.deadline ? (
                  <span className={due.overdue ? 'text-high' : undefined}>
                    {due.text} · {formatDate(risk.deadline)}
                  </span>
                ) : (
                  'No deadline'
                )
              }
            />
            <Meta label={t('u.subjects')} value={`${rollup.total}`} hint={`${rollup.accepted} accepted`} />
            <Meta label={t('u.approver')} value={risk.approver_name || 'Not recorded'} />
            <Meta
              label={t('u.opened')}
              value={timeAgo(risk.created_at)}
              hint={`${formatDateTime(risk.created_at)}${risk.created_by ? ` by ${risk.created_by}` : ''}`}
            />
          </dl>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-start gap-3">
            <GuardedAction
              variant="primary"
              icon={<Send size={15} aria-hidden="true" />}
              reason={whyCannotAssign(risk, rollup.total)}
              onClick={() => setAssigning(true)}
            >
              {t('u.assign-required-work')}
            </GuardedAction>
            <GuardedAction
              variant="secondary"
              icon={<CheckCircle2 size={15} aria-hidden="true" />}
              reason={whyCannotClose(risk)}
              onClick={() => setClosing(true)}
            >
              Close
            </GuardedAction>
            <GuardedAction
              variant="outline"
              icon={<RotateCcw size={15} aria-hidden="true" />}
              reason={whyCannotReopen(risk)}
              onClick={() => setReopening(true)}
            >
              Reopen
            </GuardedAction>
          </div>
        )}
      </div>

      {risk.status === 'closed' && risk.closure_note && (
        <section className="mt-5 rounded-control border border-safe/35 bg-safe/12 px-3 py-2.5">
          <h2 className="label text-safe">
            Closed {risk.closed_at ? timeAgo(risk.closed_at) : ''}
          </h2>
          <p className="mt-1 text-sm text-fg">{risk.closure_note}</p>
        </section>
      )}

      {canManage && (
        <>
          <AssignWorkDialog risk={risk} open={assigning} onOpenChange={setAssigning} />
          <CloseRiskDialog
            risk={risk}
            rollup={rollup}
            open={closing}
            onOpenChange={setClosing}
          />
          <ReopenRiskDialog risk={risk} open={reopening} onOpenChange={setReopening} />
        </>
      )}
    </Panel>
  )
}

function Meta({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="label text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-body text-fg">{value}</dd>
      {hint && <dd className="text-xs text-fg-faint">{hint}</dd>}
    </div>
  )
}
