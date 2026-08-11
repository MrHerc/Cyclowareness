/**
 * What the engine decided this sample IS, and how it voted.
 *
 * Two things this panel refuses to do.
 *
 * It does not present the detection ratio as a multi-vendor score. "3 / 6" here
 * counts THIS engine's own detectors — a reader who has seen a public
 * multi-scanner service will read it as six vendors unless told otherwise, so
 * the panel says whose detectors they are in the same breath as the number.
 *
 * It does not show a threat name the engine did not produce. A clean sample has
 * no name, and inventing "Clean" as a label would put a classification where
 * there is none.
 */

import { useT, type MessageKey } from '../../lib/i18n'
import type { SandboxVerdict } from '../../domain/types'
import { Panel } from '../../components/ui'
import { cn, humanise } from '../../lib/format'

export interface ClassificationPanelProps {
  verdict: SandboxVerdict | Record<string, never>
}

const VERDICT_TONE: Record<string, string> = {
  malicious: 'text-critical',
  suspicious: 'text-high',
  clean: 'text-safe',
}

const VERDICT_SENTENCE: Record<string, MessageKey> = {
  malicious: 'p.the-evidence-is-sufficient-to-call',
  suspicious: 'p.findings-that-matter-but-not-enough',
  clean: 'p.nothing-found-reached-the-threshold-to',
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-body text-fg">{value}</dd>
    </div>
  )
}

export function ClassificationPanel({ verdict }: ClassificationPanelProps) {
  const t = useT()
  const answer = 'verdict' in verdict ? (verdict as SandboxVerdict) : null
  // A job that has not been classified has no panel to draw. Rendering an empty
  // one would imply the engine looked and had nothing to say.
  if (!answer?.verdict) return null

  const engines = answer.engines ?? []
  const tone = VERDICT_TONE[answer.verdict] ?? 'text-fg'

  return (
    <Panel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="label text-fg-subtle">{t('p.classification')}</p>
          <p className={cn('mt-2 text-display', tone)}>{humanise(answer.verdict)}</p>
          {answer.threat_name ? (
            <p className="tech mt-2 break-all text-body text-fg">{answer.threat_name}</p>
          ) : null}
          <p className="mt-3 text-sm text-fg-muted">
            {t(VERDICT_SENTENCE[answer.verdict] ?? 'p.the-engine-reached-this-classification')}
          </p>
        </div>

        <div className="min-w-0 space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {answer.platform ? <Fact label={t('u.platform')} value={answer.platform} /> : null}
            {answer.category ? <Fact label={t('u.category')} value={answer.category} /> : null}
            {answer.family ? <Fact label={t('u.family')} value={answer.family} /> : null}
          </dl>

          <div>
            <p className="label text-fg-subtle">Detection</p>
            <p className="mt-1 text-lead text-fg">
              <span className="tech">{answer.detection_ratio}</span>
            </p>
            {/* The sentence that stops the number being misread. */}
            <p className="mt-1 text-xs text-fg-faint">
              {answer.detected} of this engine&rsquo;s own {answer.total_engines} detectors flagged
              the sample. These are internal detectors, not other vendors, and the ratio is not
              comparable to a multi-scanner score.
            </p>

            {engines.length > 0 ? (
              <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {engines.map((engine) => (
                  <li
                    key={engine.engine}
                    className="flex items-center justify-between gap-3 rounded-panel border border-line-subtle px-3 py-1.5"
                  >
                    <span className="tech truncate text-xs text-fg-muted">{engine.engine}</span>
                    <span
                      className={cn(
                        'shrink-0 text-xs',
                        engine.detected ? 'text-critical' : 'text-fg-faint',
                      )}
                    >
                      {engine.result}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  )
}
