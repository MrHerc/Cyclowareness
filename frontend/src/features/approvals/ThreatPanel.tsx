/**
 * The left column: what actually arrived, and what the analysers made of it.
 *
 * Every URL here goes through `defang()` and none of them is an anchor. The
 * artifact is attacker-authored text being shown to a person for judgement; a
 * live link on this screen is a credential-harvesting page one reflex click
 * away from the analyst reviewing it.
 *
 * The artifact excerpt is rendered by `CodeBlock` as plain text. That is a
 * property of this client and not a sanitisation guarantee — the safety panel
 * says so, because saying it here as well would read as a check somebody ran.
 */

import { useT } from '../../lib/i18n'
import { ExternalLink, FileWarning, FlaskConical, Radar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfidenceBadge, EvidenceList, type EvidenceItem } from '../../components/data'
import { Badge, Card, CodeBlock, Panel, Separator, Tooltip } from '../../components/ui'
import type { SandboxJobDetail, Threat } from '../../domain/types'
import { bytes, defang, formatDateTime, humanise, num, pct } from '../../lib/format'
import type { AnalysisView, ReviewDetail } from './contract'

/** Keys inside `artifact_meta` that carry MITRE technique ids, when any do. */
const MITRE_KEYS = ['mitre_techniques', 'mitre', 'techniques']

function mitreTechniques(meta: Record<string, unknown> | undefined): string[] {
  if (!meta) return []
  for (const key of MITRE_KEYS) {
    const value = meta[key]
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  }
  return []
}

/** Everything else in `artifact_meta` — headers, attachment names, sizes. */
function metaEvidence(meta: Record<string, unknown> | undefined): EvidenceItem[] {
  if (!meta) return []
  return Object.entries(meta)
    .filter(([key]) => !MITRE_KEYS.includes(key))
    .map(([key, value]) => ({
      label: humanise(key),
      value:
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value),
    }))
}

function SectionHeading({ children }: { children: string }) {
  return <h3 className="label text-fg-faint">{children}</h3>
}

function Origin({ threat }: { threat: Threat }) {
  const t = useT()
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-fg-subtle">Source</dt>
      <dd className="text-fg">{humanise(threat.source)}</dd>
      <dt className="text-fg-subtle">Artifact</dt>
      <dd className="tech text-fg">{threat.artifact_type}</dd>
      <dt className="text-fg-subtle">Arrived</dt>
      <dd className="text-fg">{formatDateTime(threat.created_at)}</dd>
      {threat.reported_by_employee_id !== null && (
        <>
          <dt className="text-fg-subtle">{t('u.reported-by')}</dt>
          <dd className="text-fg">
            <Link
              to={`/employees/${threat.reported_by_employee_id}`}
              className="text-brand hover:text-brand-fg"
            >
              Employee {threat.reported_by_employee_id}
            </Link>
          </dd>
        </>
      )}
    </dl>
  )
}

function Indicators({ iocs }: { iocs: Record<string, string[]> }) {
  const t = useT()
  const groups = Object.entries(iocs)
  if (groups.length === 0) {
    return (
      <p className="text-sm text-fg-subtle">{t('p.the-analyser-recorded-no-indicators-for')}</p>
    )
  }
  return (
    <div className="space-y-3">
      {groups.map(([kind, values]) => (
        <div key={kind}>
          <div className="text-xs text-fg-subtle">
            {humanise(kind)} · {values.length}
          </div>
          <ul className="mt-1 space-y-1">
            {values.map((value) => (
              <li key={value} className="tech break-all text-fg-muted">
                {defang(value)}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-fg-faint">{t('p.defanged-for-display-and-deliberately-not')}</p>
    </div>
  )
}

function SandboxResult({ job }: { job: SandboxJobDetail }) {
  const t = useT()
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-brand" aria-hidden="true" />
            <span className="text-body text-fg">{t('u.sandbox-verdict')}</span>
          </div>
          <p className="mt-1 truncate text-xs text-fg-subtle">{job.original_name}</p>
        </div>
        <Badge status={job.risk_level} dot />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-fg-subtle">Score</dt>
        <dd className="text-fg">{num(job.final_score)}</dd>
        <dt className="text-fg-subtle">Status</dt>
        <dd className="text-fg">{humanise(job.status)}</dd>
        <dt className="text-fg-subtle">SHA-256</dt>
        <dd className="tech break-all text-fg-muted">{job.sha256}</dd>
        <dt className="text-fg-subtle">Size</dt>
        <dd className="text-fg">{bytes(job.size_bytes)}</dd>
      </dl>

      <Link
        to={`/sandbox/${job.public_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-fg"
      >
        {t('u.open-the-full-sandbox-report')}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
    </Card>
  )
}

function AnalysisBlock({ analysis, note }: { analysis: AnalysisView | null; note: string | null }) {
  const t = useT()
  if (!analysis) {
    return (
      <p className="text-sm text-medium" role="note">
        {note ??
          t('p.the-analysis-stage-recorded-no-verdict')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {analysis.verdict && <Badge status={analysis.verdict} dot />}
        <ConfidenceBadge value={analysis.confidence} />
        {analysis.threatType && (
          <span className="text-sm text-fg-muted">{humanise(analysis.threatType)}</span>
        )}
      </div>

      {analysis.explanation && <p className="text-body text-fg-muted">{analysis.explanation}</p>}

      {analysis.behaviorSummary && (
        <div>
          <SectionHeading>{t('u.observed-behaviour')}</SectionHeading>
          <p className="mt-1 text-body text-fg-muted">{analysis.behaviorSummary}</p>
        </div>
      )}

      {note && (
        <p className="text-xs text-fg-faint" role="note">
          {note}
        </p>
      )}
    </div>
  )
}

export interface ThreatPanelProps {
  detail: ReviewDetail
}

export function ThreatPanel({ detail }: ThreatPanelProps) {
  const t = useT()
  const { threat, analysis, sandboxJob } = detail
  const techniques = mitreTechniques(threat?.artifact_meta)
  const evidence = metaEvidence(threat?.artifact_meta)

  if (!threat) {
    return (
      <Panel title={t('x.the-original-threat')} headingLevel={2}>
        <p className="text-body text-medium" role="note">{t('p.this-run-has-no-threat-attached')}</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={t('x.the-original-threat')}
      subtitle={threat.title}
      headingLevel={2}
      actions={
        <Link
          to={`/threats/${threat.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand"
        >
          <Radar className="size-3.5" aria-hidden="true" />
          {t('u.threat-record')}
        </Link>
      }
      bodyClassName="space-y-5"
    >
      <Origin threat={threat} />

      <Separator fade />

      <div className="space-y-2">
        <SectionHeading>{t('u.analyser-conclusion')}</SectionHeading>
        <AnalysisBlock analysis={analysis} note={detail.analysisNote} />
        {detail.severity && detail.severityBasis && (
          <Tooltip content={detail.severityBasis}>
            <span className="inline-flex items-center gap-2 text-xs text-fg-faint underline decoration-dotted underline-offset-4">
              Severity {detail.severity} — how this was derived
            </span>
          </Tooltip>
        )}
      </div>

      {sandboxJob ? (
        <SandboxResult job={sandboxJob} />
      ) : (
        <p className="text-xs text-fg-faint" role="note">{t('p.no-sandbox-job-is-linked-to')}</p>
      )}

      <Separator fade />

      <div className="space-y-2">
        <SectionHeading>{t('u.artifact-as-received')}</SectionHeading>
        {detail.artifactExcerpt ? (
          <>
            <CodeBlock
              value={detail.artifactExcerpt}
              label={t('p.sanitised-for-display-shown-as-plain')}
              wrap
              maxHeight="18rem"
            />
            {detail.artifactExcerptTruncated && (
              <p className="text-xs text-fg-faint">{t('p.truncated-by-the-server-the-excerpt')}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-fg-subtle">{t('p.no-artifact-body-was-stored-for')}</p>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>{t('u.headers-and-attachment-metadata')}</SectionHeading>
          <EvidenceList items={evidence} mono />
        </div>
      )}

      <div className="space-y-2">
        <SectionHeading>Indicators</SectionHeading>
        <Indicators iocs={analysis?.iocs ?? {}} />
      </div>

      <div className="space-y-2">
        <SectionHeading>MITRE ATT&amp;CK</SectionHeading>
        {techniques.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {techniques.map((technique) => (
              <li key={technique} className="tech rounded-chip border border-line px-2 py-0.5 text-fg-muted">
                {technique}
              </li>
            ))}
          </ul>
        ) : (
          <p className="inline-flex items-start gap-2 text-sm text-fg-subtle">
            <FileWarning className="mt-0.5 size-3.5 shrink-0 text-fg-faint" aria-hidden="true" />
            No ATT&amp;CK technique was recorded against this artifact. The analysers in this
            deployment do not map to the matrix.
          </p>
        )}
      </div>

      {analysis?.confidence !== null && analysis?.confidence !== undefined && (
        <p className="text-xs text-fg-faint">
          Analyser confidence {pct(analysis.confidence)} — the engine's own certainty, not a
          probability that the artifact is malicious.
        </p>
      )}
    </Panel>
  )
}
