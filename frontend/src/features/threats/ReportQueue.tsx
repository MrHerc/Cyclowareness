/**
 * The human-sensor queue: reports that are waiting for a person to decide.
 *
 * This is the one region on the intake screen that demands an action, so it is
 * the page's single `feature` panel and it is never behind a tab. A queue an
 * analyst has to go looking for is a queue that grows.
 *
 * Both decisions are real writes with no optimistic update. Pushing a report
 * creates a `Threat` and a `LoopRun` server-side and then navigates to the run —
 * showing the analyst the thing they just caused, rather than a list that looks
 * exactly as it did a moment ago.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { Inbox, ListFilter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AsyncBoundary, ConfirmationDialog, EmptyState, SkeletonCard } from '../../components/states'
import { Panel, Select, useToast } from '../../components/ui'
import { useCapabilities, useReports } from '../../lib/api/queries'
import { useDismissReport, usePushReportToLoop } from '../../lib/api/mutations'
import { usePermission } from '../../lib/auth/useAuth'
import type { Report } from '../../domain/types'
import { ALL, matchesQuery, matchesValue, REPORT_STATUS_OPTIONS, SUSPICION_OPTIONS, useUrlParam } from './filters'
import { ReportCard } from './ReportCard'

export interface ReportQueueProps {
  /** The page-level search term. */
  query: string
  /** The page-level artifact-type filter. */
  artifactType: string
}

export function ReportQueue({ query, artifactType }: ReportQueueProps) {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const canAct = usePermission('threats.submit')

  const [status, setStatus] = useUrlParam('rstatus', 'new')
  const [suspicion, setSuspicion] = useUrlParam('susp', ALL)
  const [dismissTarget, setDismissTarget] = useState<Report | null>(null)

  const reports = useReports()
  const capabilities = useCapabilities()
  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  const push = usePushReportToLoop({
    onSuccess: (data) => {
      toast.show({
        title: `Loop run ${data.loop_run_id} started`,
        description: t('p.the-report-is-now-a-threat'),
        tone: 'success',
      })
      navigate(`/loops/${data.loop_run_id}`)
    },
    onError: (error) => {
      toast.show({ title: t('p.the-report-was-not-pushed'), description: error.message, tone: 'error' })
    },
  })

  const dismiss = useDismissReport({
    onSuccess: () => {
      setDismissTarget(null)
      toast.show({ title: 'Report dismissed', tone: 'info' })
    },
    onError: (error) => {
      toast.show({ title: t('p.the-report-was-not-dismissed'), description: error.message, tone: 'error' })
    },
  })

  const all = reports.data ?? []
  const newCount = all.filter((report) => report.status === 'new').length

  const visible = all.filter(
    (report) =>
      matchesValue(status, report.status) &&
      matchesValue(artifactType, report.artifact_type) &&
      matchesValue(suspicion, report.triage_summary?.suspicion_level) &&
      matchesQuery(query, [
        report.note,
        report.artifact_ref,
        report.employee_name,
        report.department_name,
        report.triage_summary?.summary,
      ]),
  )

  /** Which card, if any, is showing the failure of its own action. */
  function errorFor(report: Report): unknown {
    if (push.isError && push.variables === report.id) return push.error
    if (dismiss.isError && dismiss.variables === report.id) return dismiss.error
    return null
  }

  return (
    <Panel
      tone="feature"
      title={t('x.awaiting-triage')}
      subtitle={
        newCount === 0
          ? t('p.nothing-in-the-humansensor-queue-is')
          : `${newCount} report${newCount === 1 ? '' : 's'} from employees waiting for a decision.`
      }
    >
      {/* Filters sit in the body rather than the panel header: the header keeps
          its actions at intrinsic width, and two selects there push a narrow
          viewport into horizontal scroll. */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Select
          label={t('p.report-status')}
          labelHidden
          options={REPORT_STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
          className="w-full sm:w-48"
        />
        <Select
          label={t('p.suspicion-level')}
          labelHidden
          options={SUSPICION_OPTIONS}
          value={suspicion}
          onValueChange={setSuspicion}
          className="w-full sm:w-48"
        />
      </div>

      <AsyncBoundary
        isLoading={reports.isLoading}
        error={reports.data ? null : reports.error}
        onRetry={() => void reports.refetch()}
        loadingLabel={t('x.loading-the-humansensor-queue')}
        skeleton={
          <div className="space-y-3">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        }
        isEmpty={visible.length === 0}
        empty={
          all.length === 0 ? (
            <EmptyState
              compact
              icon={Inbox}
              headline="No employee has reported anything yet"
              description={t('x.reports-arrive-here-the-moment')}
            />
          ) : (
            <EmptyState
              compact
              icon={ListFilter}
              headline="No report matches these filters"
              description={`${all.length} report${all.length === 1 ? ' exists' : 's exist'} in the queue. Widen the status, the suspicion level or the search to see them.`}
            />
          )
        }
      >
        <div className="space-y-3">
          {visible.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              modelConnected={modelConnected}
              canAct={canAct}
              pushing={push.isPending && push.variables === report.id}
              dismissing={dismiss.isPending && dismiss.variables === report.id}
              error={errorFor(report)}
              onPush={() => push.mutate(report.id)}
              onDismiss={() => setDismissTarget(report)}
            />
          ))}
        </div>
      </AsyncBoundary>

      <ConfirmationDialog
        open={dismissTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDismissTarget(null)
        }}
        title={t('x.dismiss-this-report')}
        description={t('x.the-report-is-closed-without')}
        confirmLabel={t('p.dismiss-report')}
        busy={dismiss.isPending}
        onConfirm={() => {
          if (dismissTarget) dismiss.mutate(dismissTarget.id)
        }}
      />
    </Panel>
  )
}
