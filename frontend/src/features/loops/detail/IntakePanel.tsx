/**
 * Stage 1 — the original input, before anything was concluded about it.
 *
 * The raw artifact sits behind a toggle and inside a `CodeBlock`, which never
 * linkifies anything: the value on this panel is routinely a live
 * credential-harvesting URL, and a clickable one inside an analyst tool is an
 * incident rather than a styling detail.
 */

import { useT } from '../../../lib/i18n'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { StageEntry, Threat } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { formatDateTime, humanise } from '../../../lib/format'
import { Button, CodeBlock } from '../../../components/ui'
import { StageSection } from './StageSection'
import { Facts, type Fact } from './Facts'

const STAGE = STAGES[0]

export interface IntakePanelProps {
  entry: StageEntry | undefined
  threat: Threat | null
  /** Resolved by the page from `threat.reported_by_employee_id`. */
  reporterName: string | null
  reporterId: number | null
}

/** Values in `artifact_meta` are free-form JSON; nothing here assumes a shape. */
function describeMeta(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function IntakePanel({ entry, threat, reporterName, reporterId }: IntakePanelProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rawId = useId()

  if (!threat) {
    return (
      <StageSection
        stage={STAGE}
        entry={entry}
        source="live"
        sourceDetail="Threat record"
      >
        <p className="text-body text-fg-muted">{t('p.this-run-has-no-threat-attached')}</p>
      </StageSection>
    )
  }

  const meta = threat.artifact_meta ?? {}
  const departments = meta.targeted_departments
  const metaEntries = Object.entries(meta).filter(([key]) => key !== 'targeted_departments')

  const facts: Fact[] = [
    { label: 'Source', value: humanise(threat.source) },
    { label: 'Submitted', value: formatDateTime(threat.created_at) },
    {
      label: 'Reported by',
      value: reporterName ?? (reporterId === null ? t('p.not-a-humansensor-report') : `Employee ${reporterId}`),
      to: reporterId !== null ? `/employees/${reporterId}` : undefined,
    },
    { label: 'Artifact type', value: humanise(threat.artifact_type) },
    {
      label: 'Affected department',
      value: departments === undefined ? t('p.not-stated-on-the-artifact') : describeMeta(departments),
    },
    {
      label: 'Severity at intake',
      value: 'Not recorded',
      hint: t('p.nothing-is-graded-on-arrival-the'),
    },
  ]

  return (
    <StageSection stage={STAGE} entry={entry} source="live" sourceDetail="Threat record">
      <Facts items={facts} />

      <dl className="mt-5 space-y-3 border-t border-line-subtle pt-4">
        <div>
          <dt className="label text-fg-faint">Chain of custody</dt>
          <dd className="mt-1 text-sm text-fg-muted">
            The platform records who submitted the artifact and when, and every later change to this
            run is in the audit strip at the foot of this page. No custody-transfer log beyond that
            is kept, so this is a record of handling inside Cyclowareness only.
          </dd>
        </div>
        <div>
          <dt className="label text-fg-faint">Quarantine</dt>
          <dd className="mt-1 text-sm text-fg-muted">
            Not quarantined. A loop artifact is stored as text and is never fetched, rendered or
            executed by the platform. Quarantined bytes exist only for files submitted directly to
            the{' '}
            <Link to="/sandbox" className="text-brand hover:underline">
              sandbox
            </Link>
            .
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-controls={rawId}
          onClick={() => setOpen((current) => !current)}
          icon={
            open ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )
          }
        >
          {open ? t('p.hide-the-raw-artifact') : t('p.show-the-raw-artifact')}
        </Button>

        <div id={rawId} hidden={!open} className="mt-3 space-y-3">
          <CodeBlock
            label={t('p.artifact-reference-displayed-verbatim-never-link')}
            value={threat.artifact_ref || '(empty)'}
            copyable
            wrap
          />
          {metaEntries.length > 0 ? (
            <CodeBlock
              label={t('p.artifact-metadata')}
              value={metaEntries
                .map(([key, value]) => `${key}: ${describeMeta(value)}`)
                .join('\n')}
              copyable
              wrap
            />
          ) : (
            <p className="text-sm text-fg-faint">{t('p.no-metadata-was-recorded-with-this')}</p>
          )}
        </div>
      </div>
    </StageSection>
  )
}
