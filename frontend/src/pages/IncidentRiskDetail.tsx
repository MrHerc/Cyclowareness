/**
 * One incident risk: what it says, who it names, and what has been done about it.
 *
 * The layout answers two audiences on one screen. The left column is the record
 * — the narrative, the evidence, the people, the history. The right column is
 * the two things an analyst most often gets wrong about this object: what has
 * actually been measured (and what has not), and what the person named by it is
 * allowed to read.
 *
 * The page composes. Every fetch is a hook; every action lives in the feature
 * component that owns its dialog.
 */

import { useT } from '../lib/i18n'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EvidenceList } from '../components/data'
import { AsyncBoundary, SkeletonCard } from '../components/states'
import { Button, Panel } from '../components/ui'
import { EmployeeViewPanel } from '../features/incident-risks/EmployeeViewPanel'
import { RiskAuditPanel } from '../features/incident-risks/RiskAuditPanel'
import { RiskHeader } from '../features/incident-risks/RiskHeader'
import { RiskImpactPanel } from '../features/incident-risks/RiskImpactPanel'
import { RiskTimelinePanel } from '../features/incident-risks/RiskTimelinePanel'
import { SubjectsPanel } from '../features/incident-risks/SubjectsPanel'
import { rollUpSubjects } from '../features/incident-risks/vocabulary'
import { timelineOf } from '../features/incident-risks/wire'
import { useIncidentRisk } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import type { IncidentRiskDetail as IncidentRiskDetailModel } from '../domain/types'

export default function IncidentRiskDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const canManage = usePermission('incident_risks.manage')
  const query = useIncidentRisk(id)
  const risk = query.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" icon={<ArrowLeft size={14} aria-hidden="true" />}>
          <Link to="/incident-risks">All incident risks</Link>
        </Button>
      </div>

      <AsyncBoundary
        isLoading={query.isLoading}
        error={risk ? null : query.error}
        onRetry={() => void query.refetch()}
        loadingLabel={t('x.loading-the-incident-risk')}
        skeleton={
          <div className="flex flex-col gap-6">
            <SkeletonCard metric lines={3} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <SkeletonCard lines={5} />
              <SkeletonCard lines={5} />
            </div>
          </div>
        }
      >
        {risk && <RiskBody risk={risk} canManage={canManage} />}
      </AsyncBoundary>
    </div>
  )
}

function RiskBody({
  risk,
  canManage,
}: {
  risk: IncidentRiskDetailModel
  canManage: boolean
}) {
  const t = useT()
  const subjects = risk.subjects ?? []
  const rollup = rollUpSubjects(subjects, risk.min_score)
  const timeline = timelineOf(risk)
  const evidence = risk.evidence ?? []

  return (
    <div className="flex flex-col gap-6">
      <RiskHeader risk={risk} rollup={rollup} canManage={canManage} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel headingLevel={2} title={t('x.the-record')}>
            <dl className="flex flex-col gap-5">
              <div>
                <dt className="label text-fg-subtle">What happened</dt>
                <dd className="mt-1.5 whitespace-pre-line text-body text-fg-muted">
                  {risk.description || 'No description was recorded when this risk was opened.'}
                </dd>
              </div>
              <div>
                <dt className="label text-fg-subtle">Required action</dt>
                <dd className="mt-1.5 text-body text-fg-muted">
                  {risk.required_action || 'No required action was recorded.'}
                </dd>
              </div>
              <div>
                <dt className="label text-fg-subtle">Closure criteria</dt>
                <dd className="mt-1.5 text-body text-fg-muted">
                  {risk.closure_criteria ||
                    'No closure criteria were recorded, so a closure note cannot be checked against anything.'}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel
            headingLevel={2}
            title={t('x.evidence')}
            subtitle={t('x.what-the-incident-found-a')}
            actions={
              evidence.length > 0 ? (
                <span className="text-sm text-fg-subtle">
                  {evidence.length} {evidence.length === 1 ? 'item' : 'items'}
                </span>
              ) : undefined
            }
          >
            <EvidenceList
              items={evidence}
              emptyMessage={t('x.no-evidence-was-recorded-for')}
            />
          </Panel>

          <SubjectsPanel risk={risk} canManage={canManage} />

          <RiskTimelinePanel entries={timeline} />

          <RiskAuditPanel riskId={risk.id} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <RiskImpactPanel risk={risk} rollup={rollup} />
          <EmployeeViewPanel risk={risk} />
        </div>
      </div>
    </div>
  )
}
