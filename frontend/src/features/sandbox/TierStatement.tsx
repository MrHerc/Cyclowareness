/**
 * What ran, and what did not.
 *
 * This block sits above the findings, not below them, because it changes how
 * every finding underneath it should be read. A score computed without
 * detonation is a score with a stated blind spot; "we did not look" and "we
 * looked and found nothing" are different claims, and a security product that
 * lets a reader confuse them is worse than one that admits the gap.
 *
 * The `detail` string is the engine's own sentence and is rendered verbatim.
 */

import { useT } from '../../lib/i18n'
import { CircleSlash, ScanSearch } from 'lucide-react'
import type { ScoreBreakdown } from '../../domain/types'
import { Panel } from '../../components/ui'
import { humanise } from '../../lib/format'
import { analyzerLabel } from './shared'

export interface TierStatementProps {
  tiers: ScoreBreakdown['tiers']
}

const TIER_TITLES: Record<string, { ran: string; missing: string }> = {
  static: {
    ran: 'Static analysis ran',
    missing: 'Static analysis did not run',
  },
  dynamic: {
    ran: 'Dynamic detonation ran',
    missing: 'Dynamic detonation did not run',
  },
}

export function TierStatement({ tiers }: TierStatementProps) {
  const t = useT()
  const entries = Object.entries(tiers ?? {})
  if (entries.length === 0) {
    return (
      <Panel title={t('x.analysis-tiers')}>
        <p className="text-body text-fg-muted">
          This job did not record which tiers ran. Treat the findings below as incomplete rather
          than as a full picture.
        </p>
      </Panel>
    )
  }

  return (
    <Panel
      title={t('x.what-ran-and-what-did')}
      subtitle={t('x.read-every-finding-below-against')}
      headingLevel={2}
    >
      <ul className="space-y-3">
        {entries.map(([name, tier]) => {
          const titles = TIER_TITLES[name]
          const heading = titles
            ? tier.ran
              ? titles.ran
              : titles.missing
            : `${humanise(name)} ${tier.ran ? 'ran' : 'did not run'}`
          const gaps = Object.entries(tier.unavailable_analyzers ?? {})

          return (
            <li
              key={name}
              className={
                tier.ran
                  ? 'flex items-start gap-3 rounded-panel border border-line-subtle bg-base p-4'
                  : 'flex items-start gap-3 rounded-panel border border-medium/35 bg-medium/5 p-4'
              }
            >
              {tier.ran ? (
                <ScanSearch
                  className="mt-0.5 size-5 shrink-0 text-safe"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              ) : (
                <CircleSlash
                  className="mt-0.5 size-5 shrink-0 text-medium"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              )}

              <div className="min-w-0">
                <h3 className="text-h text-fg">{heading}</h3>
                <p className="mt-1 text-body text-fg-muted">{tier.detail}</p>

                {gaps.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-sm text-fg-subtle">
                      {gaps.length} {gaps.length === 1 ? 'analyzer was' : 'analyzers were'} not
                      available on this host:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {gaps.map(([analyzer, reason]) => (
                        <li key={analyzer} className="text-xs text-fg-faint">
                          {analyzerLabel(analyzer)} — {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
