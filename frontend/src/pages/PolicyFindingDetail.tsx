/**
 * One finding, with everything needed to argue with it.
 *
 * The layout follows the order a security team actually works a finding: what
 * is claimed, where the claim came from, which rule it contradicts, who it
 * touches, what to do, and then the evidence anyone can check it against. The
 * actions sit at the top because a reader who already knows this finding has
 * come back to close it, not to read it again.
 *
 * The review history is deliberately thin, and says so. This build records the
 * closing note, who wrote it and when — the full change history lives in the
 * audit trail, and the screen links there rather than implying it holds a
 * timeline it does not have.
 */

import { useT } from '../lib/i18n'
import { ArrowLeft, GraduationCap, ScrollText, ShieldCheck, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfidenceBadge, EvidenceList } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonText } from '../components/states'
import { Badge, Button, Panel, Separator } from '../components/ui'
import { AssignTrainingDialog } from '../features/policy/AssignTrainingDialog'
import type { PolicyFindingDetailResponse } from '../features/policy/data'
import { AffectedPeople, VersionComparison } from '../features/policy/FindingFacts'
import { FindingOrigin } from '../features/policy/FindingOrigin'
import { FindingStatusDialog } from '../features/policy/FindingStatusDialog'
import { PolicyHeader } from '../features/policy/PolicyHeader'
import {
  FINDING_STATUS_LABELS,
  FINDING_TYPE_LABELS,
  RULE_TYPE_LABELS,
  TERMINAL_FINDING_STATUSES,
} from '../features/policy/vocabulary'
import { usePolicyFinding } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { deadlineIn, formatDate, formatDateTime, timeAgo } from '../lib/format'

export default function PolicyFindingDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const query = usePolicyFinding(id)
  const canManage = usePermission('policy.manage')

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusPreset, setStatusPreset] = useState<string | undefined>(undefined)
  const [trainingOpen, setTrainingOpen] = useState(false)

  const finding = query.data as PolicyFindingDetailResponse | undefined

  const openStatus = (preset?: string) => {
    setStatusPreset(preset)
    setStatusOpen(true)
  }

  const due = deadlineIn(finding?.due_date)
  const closed = finding ? TERMINAL_FINDING_STATUSES.includes(finding.status) : false

  return (
    <div className="space-y-6">
      <PolicyHeader
        title={t('x.finding')}
        description={t('x.a-single-claim-about-the')}
        actions={
          <Button asChild variant="ghost" icon={<ArrowLeft className="size-4" />}>
            <Link to="/policy-intelligence/findings">Back to the queue</Link>
          </Button>
        }
      />

      <AsyncBoundary
        isLoading={query.isLoading}
        error={finding ? null : query.error}
        onRetry={() => void query.refetch()}
        loadingLabel={t('x.loading-the-finding')}
        skeleton={<SkeletonText lines={12} />}
      >
        {finding ? (
          <div className="space-y-4">
            {/* --- the claim ------------------------------------------------- */}
            <Panel tone="feature">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={finding.severity} size="sm" dot />
                  <Badge status={finding.status} size="sm">
                    {FINDING_STATUS_LABELS[finding.status] ?? finding.status}
                  </Badge>
                  <ConfidenceBadge value={finding.confidence} />
                  <span className="text-xs text-fg-subtle">
                    {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
                  </span>
                  <span className="tech text-xs text-fg-faint">#{finding.id}</span>
                </div>

                <h2 className="text-title text-fg">{finding.title}</h2>

                {finding.description ? (
                  <p className="max-w-3xl text-body text-fg-muted">{finding.description}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-fg-subtle">
                  <span>Detected {timeAgo(finding.detected_at)}</span>
                  <span className={due.overdue ? 'text-high' : undefined}>
                    {finding.due_date ? `Due ${formatDate(finding.due_date)} · ${due.text}` : 'No due date'}
                  </span>
                  <span>{finding.owner_name ? `Owner ${finding.owner_name}` : 'No owner assigned'}</span>
                </div>

                {canManage ? (
                  <>
                    <Separator className="my-1" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="primary"
                        icon={<SquarePen className="size-4" />}
                        onClick={() => openStatus(undefined)}
                      >
                        Change status
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<GraduationCap className="size-4" />}
                        onClick={() => setTrainingOpen(true)}
                        disabled={closed}
                      >
                        Assign training
                      </Button>
                      <Button
                        variant="outline"
                        icon={<ShieldCheck className="size-4" />}
                        onClick={() => openStatus('accepted_risk')}
                        disabled={finding.status === 'accepted_risk'}
                      >
                        Accept the risk
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openStatus('false_positive')}
                        disabled={finding.status === 'false_positive'}
                      >
                        Mark false positive
                      </Button>
                      {closed ? (
                        <span className="text-xs text-fg-faint">
                          This finding is closed. Reopen it before assigning training.
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-fg-faint">{t('p.changing-a-finding-requires-the-policy')}</p>
                )}
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                {/* --- where the claim came from ----------------------------- */}
                <FindingOrigin finding={finding} />

                {/* --- the rule it contradicts ------------------------------- */}
                <Panel
                  title={t('x.the-policy-and-the-rule')}
                  actions={
                    finding.policy_id !== null ? (
                      <Button asChild variant="ghost" size="sm" icon={<ScrollText className="size-4" />}>
                        <Link to={`/policy-intelligence/policies?policy=${finding.policy_id}`}>
                          Open the policy
                        </Link>
                      </Button>
                    ) : null
                  }
                >
                  {finding.policy_id === null ? (
                    <p className="text-sm text-fg-muted">{t('p.this-finding-is-not-tied-to')}</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-body text-fg">
                        {finding.policy_name ?? `Policy ${finding.policy_id}`}
                        {finding.policy_version ? (
                          <span className="ml-2 text-sm text-fg-subtle">
                            v{finding.policy_version}
                          </span>
                        ) : null}
                      </p>

                      {finding.rule ? (
                        <div className="rounded-control border border-line-subtle bg-base p-3">
                          <p className="tech break-all text-fg-subtle">{finding.rule.rule_key}</p>
                          <p className="mt-1.5 text-body text-fg">{finding.rule.statement}</p>
                          <p className="mt-2 text-xs text-fg-faint">
                            {RULE_TYPE_LABELS[finding.rule.rule_type] ?? finding.rule.rule_type}
                            {finding.rule.technology ? ` · ${finding.rule.technology}` : ''}
                            {finding.rule.version_spec ? ` · ${finding.rule.version_spec}` : ''}
                          </p>
                          {finding.rule.evidence_quote ? (
                            <blockquote className="mt-3 border-l-2 border-brand/40 pl-3">
                              <p className="text-sm italic text-fg-muted">
                                “{finding.rule.evidence_quote}”
                              </p>
                              <footer className="mt-1 text-xs text-fg-faint">
                                {finding.rule.evidence_location ||
                                  'Location in the document was not recorded'}
                              </footer>
                            </blockquote>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-fg-muted">{t('p.no-individual-rule-is-cited-the')}</p>
                      )}
                    </div>
                  )}

                  <Separator className="my-4" />
                  <VersionComparison
                    affected={finding.affected_version}
                    approved={finding.approved_version}
                    recommended={finding.recommended_version}
                    technology={finding.technology}
                  />
                </Panel>

                {/* --- evidence --------------------------------------------- */}
                <Panel
                  title={t('x.evidence')}
                  subtitle={t('x.without-these-a-finding-is')}
                >
                  <EvidenceList
                    items={finding.evidence}
                    emptyMessage={t('x.no-evidence-rows-were-recorded')}
                  />
                </Panel>
              </div>

              <div className="space-y-4">
                {/* --- what to do ------------------------------------------- */}
                <Panel title={t('x.what-to-do')}>
                  <dl className="space-y-4">
                    <div>
                      <dt className="label text-fg-faint">Suggested remediation</dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {finding.suggested_remediation || 'None was recorded.'}
                      </dd>
                    </div>
                    <div>
                      <dt className="label text-fg-faint">Required training</dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {finding.required_training ||
                          'No training was named for this finding.'}
                      </dd>
                    </div>
                    <div>
                      <dt className="label text-fg-faint">Owner</dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {finding.owner_name || 'Unassigned'}
                      </dd>
                    </div>
                  </dl>
                </Panel>

                {/* --- who it touches --------------------------------------- */}
                <Panel
                  title={t('x.who-is-affected')}
                  subtitle={t('x.ids-the-server-could-not')}
                >
                  <AffectedPeople
                    departments={finding.affected_departments ?? []}
                    employees={finding.affected_employees ?? []}
                  />
                </Panel>

                {/* --- history ---------------------------------------------- */}
                <Panel
                  title={t('x.review-history')}
                  subtitle={t('x.what-this-build-records-on')}
                >
                  {finding.resolution_note || finding.resolved_by ? (
                    <div className="space-y-2">
                      {finding.resolution_note ? (
                        <p className="text-sm text-fg">{finding.resolution_note}</p>
                      ) : null}
                      <p className="text-xs text-fg-faint">
                        {finding.resolved_by
                          ? `${finding.resolved_by} · ${formatDateTime(finding.resolved_at)}`
                          : t('p.the-note-is-not-attributed-the')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-fg-muted">{t('p.nothing-has-been-written-on-this')}</p>
                  )}

                  <Separator className="my-4" />
                  <p className="text-xs text-fg-subtle">{t('p.the-finding-record-keeps-only-the')}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-2 -ml-3">
                    <Link
                      to={`/audit-log?object_type=policy_finding&object_id=${finding.id}`}
                    >
                      See every change in the audit log
                    </Link>
                  </Button>
                </Panel>
              </div>
            </div>

            <FindingStatusDialog
              finding={finding}
              open={statusOpen}
              onOpenChange={setStatusOpen}
              preset={statusPreset}
            />
            <AssignTrainingDialog
              findingId={finding.id}
              findingTitle={finding.title}
              employees={finding.affected_employees ?? []}
              requiredTraining={finding.required_training}
              open={trainingOpen}
              onOpenChange={setTrainingOpen}
            />
          </div>
        ) : (
          <EmptyState
            headline="This finding could not be loaded"
            description={t('x.the-record-may-have-been')}
          />
        )}
      </AsyncBoundary>
    </div>
  )
}
