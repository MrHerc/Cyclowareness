/**
 * One artifact, and everything the platform actually knows about it.
 *
 * The layout follows the order an analyst reads in: what was concluded, what was
 * extracted, then the artifact itself last and behind a click. Provenance and
 * the loop run sit in the rail, because "where did this come from" and "what did
 * it cause" are asked while reading the verdict rather than after it.
 *
 * Composition only. Every panel owns its own honesty rules; this file's job is to
 * resolve the record, resolve its origin, and lay the pieces out.
 */

import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AsyncBoundary, SkeletonCard } from '../components/states'
import { ConfidenceBadge } from '../components/data'
import { Badge } from '../components/ui'
import { IndicatorPanel } from '../features/threats/IndicatorPanel'
import { RawArtifactPanel } from '../features/threats/RawArtifactPanel'
import { ThreatLoopPanel } from '../features/threats/ThreatLoopPanel'
import { ThreatOriginPanel } from '../features/threats/ThreatOriginPanel'
import { ThreatVerdictPanel } from '../features/threats/ThreatVerdictPanel'
import { useReportForThreat } from '../features/threats/hooks'
import { ArtifactTypeTag, SourceTag } from '../features/threats/IntakeAtoms'
import { useEmployee, useThreat } from '../lib/api/queries'
import { formatDateTime, timeAgo } from '../lib/format'

export default function ThreatDetail() {
  const { id } = useParams<{ id: string }>()
  const threat = useThreat(id)
  const origin = useReportForThreat(threat.data?.id)

  // The report carries the reporter's name already. This second lookup runs only
  // when it did not — an older artifact whose report has fallen off the capped
  // list the API returns — so the person is named rather than shown as a bare id.
  const reporterId = origin.report ? undefined : threat.data?.reported_by_employee_id ?? undefined
  const reporter = useEmployee(reporterId ?? undefined)

  return (
    <div className="space-y-6">
      <Link
        to="/threats"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Threat intake
      </Link>

      <AsyncBoundary
        isLoading={threat.isLoading}
        error={threat.data ? null : threat.error}
        onRetry={() => void threat.refetch()}
        loadingLabel="Loading the artifact"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={5} />
            </div>
            <div className="space-y-5">
              <SkeletonCard lines={6} />
            </div>
          </div>
        }
      >
        {threat.data ? (
          <div className="space-y-6">
            <header>
              <h1 className="text-display text-fg">
                {threat.data.title || `Artifact ${threat.data.id}`}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="tech text-fg-faint">threat #{threat.data.id}</span>
                <SourceTag source={threat.data.source} />
                <ArtifactTypeTag type={threat.data.artifact_type} />
                {threat.data.verdict ? (
                  <>
                    <Badge status={threat.data.verdict} dot size="sm" />
                    <ConfidenceBadge value={threat.data.confidence} />
                  </>
                ) : null}
                <time
                  dateTime={threat.data.created_at}
                  title={formatDateTime(threat.data.created_at)}
                  className="text-sm text-fg-subtle"
                >
                  {timeAgo(threat.data.created_at)}
                </time>
              </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <ThreatVerdictPanel threat={threat.data} />
                <IndicatorPanel iocs={threat.data.iocs} />
                <RawArtifactPanel
                  value={threat.data.artifact_ref}
                  artifactType={threat.data.artifact_type}
                />
              </div>

              <div className="space-y-5">
                <ThreatOriginPanel
                  threat={threat.data}
                  report={origin.report}
                  reporter={reporter.data}
                  loopRunId={origin.loopRunId}
                />
                <ThreatLoopPanel loopRunId={origin.loopRunId} resolving={origin.isLoading} />
              </div>
            </div>
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  )
}
