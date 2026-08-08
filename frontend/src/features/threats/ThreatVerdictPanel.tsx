/**
 * What the analysis concluded, and how much weight it carries.
 *
 * Three honesty rules are enforced here.
 *
 * - **No verdict is not a clean verdict.** An artifact whose ANALYZE stage has
 *   not written a verdict gets a stated absence, not a blank and not "benign".
 * - **Confidence is a band, never a decimal.** `ConfidenceBadge` owns that.
 * - **The explanation's author is not guessed.** A `Threat` records the
 *   explanation text but not which engine wrote it, so the badge says
 *   "provenance unknown" rather than inferring from whichever model happens to
 *   be configured now — the paragraph may predate the current configuration.
 */

import { useT } from '../../lib/i18n'
import { AIProvenanceBadge, ConfidenceBadge, InsufficientDataState } from '../../components/data'
import { Badge, Panel } from '../../components/ui'
import type { Threat } from '../../domain/types'
import { humanise } from '../../lib/format'

export interface ThreatVerdictPanelProps {
  threat: Threat
}

export function ThreatVerdictPanel({ threat }: ThreatVerdictPanelProps) {
  const t = useT()
  if (!threat.verdict) {
    return (
      <Panel title={t('x.analysis')}>
        <InsufficientDataState
          title={t('x.no-verdict-has-been-recorded')}
          reason={t('p.the-loops-analyze-stage-has-not')}
          remedy="A verdict appears once stage 2 completes for the run this artifact started."
        />
      </Panel>
    )
  }

  return (
    <Panel
      title={t('x.analysis')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={threat.verdict} dot />
          <ConfidenceBadge value={threat.confidence} />
        </div>
      }
    >
      <dl className="space-y-4">
        <div>
          <dt className="label text-fg-faint">{t('u.threat-type')}</dt>
          <dd className="mt-1 text-lead text-fg">
            {threat.threat_type ? humanise(threat.threat_type) : 'Not classified'}
          </dd>
        </div>

        <div>
          <dt className="label text-fg-faint">{t('u.behaviour-observed')}</dt>
          <dd className="mt-1 text-body text-fg-muted">
            {threat.behavior_summary ?? t('p.the-analyzer-returned-no-behaviour-summary')}
          </dd>
        </div>

        <div>
          {/* The badge sits beside the label, never inside it: `.label`
              uppercases everything under it, and a shouted badge is a
              different claim from a quiet one. */}
          <dt className="flex flex-wrap items-center gap-2">
            <span className="label text-fg-faint">{t('u.plain-language-explanation')}</span>
            <AIProvenanceBadge provenance="unknown" />
          </dt>
          <dd className="mt-1 text-body text-fg-muted">
            {threat.explanation ?? t('p.no-plainlanguage-explanation-was-written-for')}
          </dd>
          <dd className="mt-2 text-xs text-fg-faint">
            The threat record stores this paragraph but not which engine produced it, so this screen
            does not claim one.
          </dd>
        </div>
      </dl>
    </Panel>
  )
}
