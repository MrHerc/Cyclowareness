/**
 * One report from the human sensor, and the decision it is waiting for.
 *
 * The triage block is the part worth being careful about. `triage_summary` may
 * have been produced by a keyword and IOC extractor rather than by a model —
 * the backend records which under `source`, and this renders that through
 * `provenanceOf`, so a heuristic note is labelled "Template" and never "AI
 * generated". Calling an extractor's output a model's judgement is the fastest
 * way to lose an analyst's trust in every other machine claim on the screen.
 *
 * Indicators are defanged and rendered as text. Nothing here is a link.
 */

import { useT } from '../../lib/i18n'
import { ArrowRight, Ban, CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge, ConfidenceBadge } from '../../components/data'
import { Badge, Button, StatusDot } from '../../components/ui'
import { provenanceOf, type Report } from '../../domain/types'
import { defang, formatDateTime, humanise, timeAgo, truncate } from '../../lib/format'
import { metaText } from './filters'
import { ActionError, ArtifactTypeTag } from './IntakeAtoms'

export interface ReportCardProps {
  report: Report
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined before it answers. */
  modelConnected?: boolean
  canAct: boolean
  onPush: () => void
  onDismiss: () => void
  pushing: boolean
  dismissing: boolean
  error: unknown
}

const SUSPICION_LABEL: Record<string, string> = {
  high: 'High suspicion',
  medium: 'Medium suspicion',
  low: 'Low suspicion',
}

function headlineOf(report: Report): string {
  return (
    metaText(report.artifact_meta, 'subject') ||
    report.note.trim() ||
    truncate(report.artifact_ref, 90) ||
    'Untitled artifact'
  )
}

export function ReportCard({
  report,
  modelConnected,
  canAct,
  onPush,
  onDismiss,
  pushing,
  dismissing,
  error,
}: ReportCardProps) {
  const t = useT()
  const triage = report.triage_summary
  const sender = metaText(report.artifact_meta, 'sender')
  const iocs = triage?.likely_iocs ?? {}
  const indicatorGroups: { label: string; values: string[] }[] = [
    { label: 'URLs', values: iocs.urls ?? [] },
    { label: 'Domains', values: iocs.domains ?? [] },
    { label: 'Sender patterns', values: iocs.sender_patterns ?? [] },
  ].filter((group) => group.values.length > 0)

  return (
    <article className="rounded-panel border border-line bg-surface p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h text-fg">{headlineOf(report)}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-fg-muted">
            <span>{report.employee_name || `Employee ${report.employee_id}`}</span>
            {report.department_name ? (
              <>
                <span aria-hidden="true" className="text-fg-faint">
                  ·
                </span>
                <span>{report.department_name}</span>
              </>
            ) : null}
            <span aria-hidden="true" className="text-fg-faint">
              ·
            </span>
            <time dateTime={report.created_at} title={formatDateTime(report.created_at)}>
              {timeAgo(report.created_at)}
            </time>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusDot status={report.status}>
            {report.status === 'new' ? 'Awaiting triage' : humanise(report.status)}
          </StatusDot>
          <ArtifactTypeTag type={report.artifact_type} />
        </div>
      </div>

      {sender ? (
        <p className="tech mt-3 truncate text-fg-subtle" title={sender}>
          from {defang(sender)}
        </p>
      ) : null}

      {report.note.trim() && report.note.trim() !== headlineOf(report) ? (
        <p className="mt-3 text-body text-fg-muted">
          <span className="text-fg-subtle">Reporter’s note: </span>
          {report.note.trim()}
        </p>
      ) : null}

      {/* --- the triage block ------------------------------------------- */}
      <div className="mt-4 rounded-control border border-line-subtle bg-elevated p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label text-fg-faint">Automated triage</span>
          {triage ? (
            <AIProvenanceBadge
              provenance={provenanceOf(triage.source)}
              generationSource={triage.source}
              modelConnected={modelConnected}
            />
          ) : null}
        </div>

        {triage ? (
          <>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge status={triage.suspicion_level} size="sm">
                {SUSPICION_LABEL[triage.suspicion_level] ?? humanise(triage.suspicion_level)}
              </Badge>
              <ConfidenceBadge value={null} />
            </div>

            <p className="mt-2.5 text-body text-fg-muted">{triage.summary}</p>

            {triage.indicators.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {triage.indicators.map((indicator) => (
                  <li
                    key={indicator}
                    className="rounded-chip border border-line-subtle px-2 py-0.5 text-xs text-fg-subtle"
                  >
                    {indicator}
                  </li>
                ))}
              </ul>
            ) : null}

            {indicatorGroups.length > 0 ? (
              <dl className="mt-3 space-y-1.5">
                {indicatorGroups.map((group) => (
                  <div key={group.label} className="flex flex-wrap gap-x-2 gap-y-1">
                    <dt className="text-xs text-fg-faint">{group.label}</dt>
                    <dd className="tech min-w-0 break-all text-fg-muted">
                      {group.values.map((value) => defang(value)).join('  ')}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {triage.recommended_action ? (
              <p className="mt-3 text-sm text-fg-subtle">
                <span className="text-fg-faint">Recommended: </span>
                {triage.recommended_action}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 flex items-start gap-2 text-sm text-fg-faint">
            <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No triage note was recorded for this report. That is not a clean result — nothing has
            been concluded about the artifact.
          </p>
        )}
      </div>

      {/* --- chain of custody -------------------------------------------- */}
      <p className="tech mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-faint">
        <span>report #{report.id}</span>
        {report.linked_threat_id !== null ? (
          <>
            <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
            <span>threat #{report.linked_threat_id}</span>
          </>
        ) : null}
        {report.linked_loop_run_id !== null ? (
          <>
            <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
            <span>run #{report.linked_loop_run_id}</span>
          </>
        ) : null}
      </p>

      {/* --- the decision ------------------------------------------------ */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {report.status === 'new' && canAct ? (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={pushing}
              disabled={dismissing}
              onClick={onPush}
              icon={<ArrowRight className="size-4" aria-hidden="true" />}
            >
              Push into the loop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={dismissing}
              disabled={pushing}
              onClick={onDismiss}
              icon={<Ban className="size-4" aria-hidden="true" />}
            >
              Dismiss
            </Button>
          </>
        ) : null}

        {report.status === 'new' && !canAct ? (
          <p className="text-sm text-fg-faint">{t('p.triaging-a-report-requires-the-analyst')}</p>
        ) : null}

        {report.linked_loop_run_id !== null ? (
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/loops/${report.linked_loop_run_id}`}>
              Open loop run {report.linked_loop_run_id}
            </Link>
          </Button>
        ) : null}

        {report.status === 'dismissed' ? (
          <p className="text-sm text-fg-faint">{t('p.dismissed-by-an-analyst-no-loop')}</p>
        ) : null}
      </div>

      <ActionError error={error} className="mt-2" />
    </article>
  )
}
