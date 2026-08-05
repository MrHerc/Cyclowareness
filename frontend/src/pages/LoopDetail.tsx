/**
 * One loop run, end to end — the page that has to prove the invention.
 *
 * The left column is the spine: all seven stages, always, including the ones
 * this run never reached. The right column tells the story of this one artifact
 * in loop order, and every panel there states its own timestamps and its own
 * data source, because "where did this come from" is a question asked of a
 * single stage rather than of a page.
 *
 * The approval gate is hoisted above both columns while the run is waiting on a
 * person. That is the product's whole claim, and it must not be something a
 * viewer has to scroll to find.
 */

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type {
  AuditPage, StageEntry } from '../domain/types'
import { AsyncBoundary, SkeletonCard, SkeletonTable } from '../components/states'
import { LoopTimeline } from '../components/loop'
import { Panel } from '../components/ui'
import {
  POLL_QUEUE,
  useAuditLog,
  useCapabilities,
  useDepartments,
  useEmployee,
  useLoop,
} from '../lib/api/queries'
import { useLoopStream } from '../lib/hooks/useLoopStream'
import { usePermission } from '../lib/auth/useAuth'
import { RunHeader } from '../features/loops/detail/RunHeader'
import { ApprovalGatePanel } from '../features/loops/detail/ApprovalGatePanel'
import { IntakePanel } from '../features/loops/detail/IntakePanel'
import { AnalysisPanel } from '../features/loops/detail/AnalysisPanel'
import { ConversionPanel } from '../features/loops/detail/ConversionPanel'
import { TargetingPanel } from '../features/loops/detail/TargetingPanel'
import { TrainingPanel } from '../features/loops/detail/TrainingPanel'
import { MeasurementPanel } from '../features/loops/detail/MeasurementPanel'
import { RunAuditStrip } from '../features/loops/detail/RunAuditStrip'
import { GATE_ANCHOR, stageAnchor } from '../features/loops/detail/anchors'
import { stageEvidence } from '../features/loops/detail/stageEvidence'
import { auditEvents, gateFrom } from '../features/loops/detail/gate'
import { nextActionFor } from '../features/loops/detail/nextAction'

export default function LoopDetail() {
  const { id } = useParams()
  const numericId = Number(id)
  const hasId = id !== undefined && Number.isFinite(numericId)

  // Belt and braces: the run polls on its own cadence, and the socket makes a
  // decision taken on another screen land here without waiting for the tick.
  useLoopStream()

  const runQuery = useLoop(id)
  const run = runQuery.data

  const capabilities = useCapabilities()
  const departments = useDepartments()
  const canDecide = usePermission('approvals.decide')

  const reporterId = run?.threat?.reported_by_employee_id ?? null
  const reporter = useEmployee(reporterId ?? undefined)

  const auditQuery = useAuditLog(
    { object_type: 'loop_run', object_id: hasId ? numericId : undefined },
    { enabled: hasId, refetchInterval: POLL_QUEUE },
  )
  const events = useMemo(() => auditEvents(auditQuery.data), [auditQuery.data])
  const gate = useMemo(() => gateFrom(events), [events])
  // /api/audit answers with either a bare list or the {events,truncated,total}
  // envelope depending on the caller. Narrow once, here, so the strip can say
  // "showing the first N" when the server actually capped the result.
  const auditData = auditQuery.data
  const auditPage: AuditPage | undefined =
    auditData && !Array.isArray(auditData) ? auditData : undefined

  const entryFor = (stage: number): StageEntry | undefined =>
    run?.stage_history.find((entry) => entry.stage === stage)

  const module = run?.training_module ?? null
  const modelConnected =
    capabilities.data === undefined ? undefined : capabilities.data.ai_provider === 'anthropic'

  const gatePanel = run ? (
    <div id={GATE_ANCHOR} className="scroll-mt-20">
      <ApprovalGatePanel
        runId={run.id}
        status={run.status}
        currentStage={run.current_stage}
        gate={gate}
        gateUnknown={auditQuery.isLoading}
        moduleTitle={module?.title ?? null}
        proposedTargets={run.targeting.length}
        canDecide={canDecide}
      />
    </div>
  ) : null

  const waiting = run?.status === 'awaiting_approval'

  return (
    <AsyncBoundary
      isLoading={runQuery.isLoading}
      error={run ? null : runQuery.error}
      onRetry={() => void runQuery.refetch()}
      loadingLabel="Loading the loop run"
      skeleton={
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonTable rows={7} cols={3} />
        </div>
      }
    >
      {run ? (
        <div className="space-y-6">
          <RunHeader run={run} updatedAt={runQuery.dataUpdatedAt} />

          {waiting ? gatePanel : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            {/* Pinned beside the story on a wide screen, and scrollable inside
                itself so a seven-stage spine never outgrows the viewport. */}
            <Panel
              title="Stage timeline"
              subtitle="All seven stages, including the ones this run never reached."
              className="xl:sticky xl:top-20 xl:self-start"
              bodyClassName="xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto"
            >
              <LoopTimeline
                history={run.stage_history}
                currentStage={run.current_stage}
                status={run.status}
                // Undefined while the trail is still loading, so the gate row says
                // "not loaded" rather than briefly claiming no decision exists.
                gate={auditQuery.isLoading ? undefined : gate}
                actorFor={(stage) => {
                  if (stage === 1) return reporter.data?.name ?? null
                  if (stage === 3) return module?.approved_by ?? null
                  return null
                }}
                renderEvidence={(stage) => stageEvidence(stage, run)}
                renderActions={(stage) => (
                  <a href={`#${stageAnchor(stage)}`} className="text-sm text-brand hover:underline">
                    Read the full stage
                  </a>
                )}
                gateActions={
                  <a href={`#${GATE_ANCHOR}`} className="text-sm text-brand hover:underline">
                    Go to the gate
                  </a>
                }
              />
            </Panel>

            <div className="space-y-6">
              <IntakePanel
                entry={entryFor(1)}
                threat={run.threat}
                reporterName={reporter.data?.name ?? null}
                reporterId={reporterId}
              />
              <AnalysisPanel entry={entryFor(2)} threat={run.threat} />
              <ConversionPanel entry={entryFor(3)} module={module} modelConnected={modelConnected} />

              {waiting ? null : gatePanel}

              <TargetingPanel
                entry={entryFor(4)}
                targets={run.targeting}
                departments={departments.data}
              />
              <TrainingPanel
                entry={entryFor(5)}
                runId={run.id}
                status={run.status}
                assignments={run.assignments}
                canForce={canDecide}
              />
              <MeasurementPanel
                measureEntry={entryFor(6)}
                feedbackEntry={entryFor(7)}
                summary={run.measure_summary}
                targets={run.targeting}
                departments={departments.data}
                nextAction={nextActionFor(run)}
              />
            </div>
          </div>

          <RunAuditStrip
            runId={run.id}
            events={events}
            isLoading={auditQuery.isLoading}
            error={auditQuery.error}
            onRetry={() => void auditQuery.refetch()}
            truncated={auditPage?.truncated ?? false}
            total={auditPage?.total}
          />
        </div>
      ) : null}
    </AsyncBoundary>
  )
}
