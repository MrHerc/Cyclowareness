/**
 * Stage 2 — what the analyzer concluded, and what it did not.
 *
 * Two capability statements live here rather than in a footnote, because both
 * are things a viewer would otherwise assume in the product's favour: the loop's
 * ANALYZE stage runs the platform analyzer and does not create a ZORBOX sandbox
 * job, and no MITRE mapping is carried on the threat record the UI is given.
 */

import { Link } from 'react-router-dom'
import type { StageEntry, Threat } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { defang, humanise } from '../../../lib/format'
import { AIProvenanceBadge, ConfidenceBadge } from '../../../components/data'
import { Badge } from '../../../components/ui'
import { StageSection } from './StageSection'
import { Facts, type Fact } from './Facts'

const STAGE = STAGES[1]

export interface AnalysisPanelProps {
  entry: StageEntry | undefined
  threat: Threat | null
}

/** Hashes are read character by character; URLs and domains are defanged. */
const IOC_GROUPS: { key: 'urls' | 'domains' | 'hashes' | 'sender_patterns'; label: string; defanged: boolean }[] = [
  { key: 'urls', label: 'URLs', defanged: true },
  { key: 'domains', label: 'Domains', defanged: true },
  { key: 'sender_patterns', label: 'Sender patterns', defanged: true },
  { key: 'hashes', label: 'Hashes', defanged: false },
]

export function AnalysisPanel({ entry, threat }: AnalysisPanelProps) {
  const iocs = threat?.iocs ?? null
  const groups = IOC_GROUPS.map((group) => ({
    ...group,
    values: iocs?.[group.key] ?? [],
  })).filter((group) => group.values.length > 0)

  const facts: Fact[] = [
    {
      label: 'Verdict',
      value: threat?.verdict ? (
        <Badge status={threat.verdict} />
      ) : (
        'Not concluded'
      ),
      hint: threat?.verdict
        ? undefined
        : 'No verdict was recorded. That is not a clean result — nothing has been concluded about this artifact.',
    },
    { label: 'Confidence', value: <ConfidenceBadge value={threat?.confidence ?? null} /> },
    {
      label: 'Threat type',
      value: threat?.threat_type ? humanise(threat.threat_type) : 'Not classified',
    },
  ]

  return (
    <StageSection
      stage={STAGE}
      entry={entry}
      source="live"
      sourceDetail="Platform analyzer output on the threat record"
    >
      <Facts items={facts} />

      <div className="mt-5 space-y-4 border-t border-line-subtle pt-4">
        <div>
          <h3 className="text-h text-fg">Behaviour summary</h3>
          <p className="mt-1.5 text-body text-fg-muted">
            {threat?.behavior_summary?.trim() ||
              'The analyzer recorded no behaviour summary for this artifact.'}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h text-fg">Plain-language explanation</h3>
            <AIProvenanceBadge provenance="unknown" />
          </div>
          <p className="mt-1.5 text-body text-fg-muted">
            {threat?.explanation?.trim() ||
              'No plain-language explanation was written for this artifact.'}
          </p>
          <p className="mt-1.5 text-xs text-fg-subtle">
            The threat record does not carry the engine that wrote this sentence, so nothing is
            claimed about how it was produced.
          </p>
        </div>

        <div>
          <h3 className="text-h text-fg">Indicators of compromise</h3>
          {groups.length === 0 ? (
            <p className="mt-1.5 text-sm text-fg-faint">
              No indicators were extracted. On a social-engineering artifact with no payload and no
              link, that is the expected result rather than a gap.
            </p>
          ) : (
            <dl className="mt-2 space-y-3">
              {groups.map((group) => (
                <div key={group.key}>
                  <dt className="label text-fg-faint">
                    {group.label}
                    {group.defanged ? ' · defanged' : ''}
                  </dt>
                  <dd className="mt-1 space-y-1">
                    {group.values.map((value) => (
                      <p key={value} className="tech break-all text-fg-muted">
                        {group.defanged ? defang(value) : value}
                      </p>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div>
          <h3 className="text-h text-fg">MITRE ATT&amp;CK mapping</h3>
          <p className="mt-1.5 text-sm text-fg-muted">
            Not available. The threat record served to this screen carries a verdict, a threat type,
            a behaviour summary and indicators — it carries no technique mapping, so none is shown.
          </p>
        </div>

        <div>
          <h3 className="text-h text-fg">Sandbox report</h3>
          <p className="mt-1.5 text-sm text-fg-muted">
            No sandbox job is linked to this run. The loop&apos;s analysis stage runs the platform
            analyzer against the artifact reference; it does not create a ZORBOX job, and the
            platform records no link between the two. For a full static report, submit the artifact
            to the{' '}
            <Link to="/sandbox" className="text-brand hover:underline">
              sandbox
            </Link>{' '}
            directly.
          </p>
        </div>
      </div>
    </StageSection>
  )
}
