/**
 * Where this artifact came from, and what is recorded about it.
 *
 * The custody chain is built only from timestamps and ids that exist on the
 * records themselves — a report, a threat, a run. Steps the data cannot support
 * are not drawn: an invented "reviewed by" row in a chain of custody is worse
 * than a short chain, because a chain of custody is precisely the thing whose
 * value depends on nobody having filled a gap in.
 *
 * `artifact_meta` is free-form JSON written at intake. It is rendered as
 * evidence rows, verbatim, with no key assumed present.
 */

import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EvidenceList, NoMeasurement } from '../../components/data'
import { Panel, Separator } from '../../components/ui'
import type { EmployeeDetail, Report, Threat } from '../../domain/types'
import { channelLabel, formatDateTime } from '../../lib/format'
import { metaEntries, reachOf } from './filters'
import { DetailRow, SourceTag } from './IntakeAtoms'

export interface ThreatOriginPanelProps {
  threat: Threat
  /** The human-sensor report behind this artifact, when there is one. */
  report: Report | null
  /** Fallback identity when the report is outside the list the API returns. */
  reporter: EmployeeDetail | undefined
  loopRunId: number | null
}

interface CustodyStep {
  at: string | null
  label: string
  detail: string
}

export function ThreatOriginPanel({ threat, report, reporter, loopRunId }: ThreatOriginPanelProps) {
  const reach = reachOf(threat.artifact_meta)
  const meta = metaEntries(threat.artifact_meta)

  const reporterId = report?.employee_id ?? threat.reported_by_employee_id
  const reporterName = report?.employee_name ?? reporter?.name ?? null
  const reporterDepartment = report?.department_name ?? reporter?.department_name ?? null

  const custody: CustodyStep[] = []
  if (report) {
    custody.push({
      at: report.created_at,
      label: `Report #${report.id}`,
      detail: `${reporterName ?? `Employee ${report.employee_id}`} reported the artifact through the portal.`,
    })
  }
  custody.push({
    at: threat.created_at,
    label: `Threat #${threat.id}`,
    detail:
      threat.source === 'human_sensor'
        ? 'An analyst accepted the report; targeting keys from the reporter were stripped at this boundary.'
        : threat.source === 'feed'
          ? 'An analyst pushed a curated feed item into the loop.'
          : 'An analyst submitted the artifact directly.',
  })
  if (loopRunId !== null) {
    custody.push({
      at: null,
      label: `Loop run #${loopRunId}`,
      detail: 'The run this artifact started. Its stage history is the record of what happened next.',
    })
  }

  return (
    <Panel title="Provenance" subtitle="Every fact this deployment records about the artifact’s origin.">
      <dl className="divide-line">
        <DetailRow label="Source">
          <SourceTag source={threat.source} />
        </DetailRow>

        <DetailRow label="Artifact type">{channelLabel(threat.artifact_type)}</DetailRow>

        <DetailRow label="Submitted">
          <time dateTime={threat.created_at}>{formatDateTime(threat.created_at)}</time>
        </DetailRow>

        <DetailRow label="Reporter">
          {reporterId !== null && reporterId !== undefined ? (
            <>
              <Link to={`/employees/${reporterId}`} className="text-brand hover:underline">
                {reporterName ?? `Employee ${reporterId}`}
              </Link>
              {reporterDepartment ? (
                <span className="text-fg-subtle"> · {reporterDepartment}</span>
              ) : null}
            </>
          ) : (
            <span className="text-fg-subtle">
              Not reported by a person — this artifact entered through the{' '}
              {threat.source === 'feed' ? 'curated feed' : 'analyst submission form'}.
            </span>
          )}
        </DetailRow>

        {report?.note.trim() ? (
          <DetailRow label="Reporter’s note">{report.note.trim()}</DetailRow>
        ) : null}

        <DetailRow label="Reach">
          {reach ?? (
            <NoMeasurement
              label="Not recorded"
              reason="This artifact carries no recipient or department metadata, so how far it reached is unknown."
            />
          )}
        </DetailRow>
      </dl>

      <Separator className="my-4" />

      <h3 className="label text-fg-faint">Chain of custody</h3>
      <ol className="mt-3 space-y-3">
        {custody.map((step, index) => (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              {index < custody.length - 1 ? (
                <ArrowDown className="mt-1 size-3 text-fg-faint" aria-hidden="true" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="tech text-fg">{step.label}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{step.detail}</p>
              {step.at ? (
                <p className="mt-0.5 text-xs text-fg-faint">
                  <time dateTime={step.at}>{formatDateTime(step.at)}</time>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <Separator className="my-4" />

      <h3 className="label text-fg-faint">Recorded metadata</h3>
      <EvidenceList
        items={meta}
        mono
        className="mt-1"
        emptyMessage="No metadata was recorded with this artifact."
      />
    </Panel>
  )
}
