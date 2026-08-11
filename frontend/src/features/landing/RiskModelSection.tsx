/**
 * The scoring weights, printed in full.
 *
 * PUBLISHING THE TABLE IS THE POINT. A human-risk score a vendor will not show
 * the arithmetic for is a number an employee cannot contest and a buyer cannot
 * audit. Every row is `WEIGHTS` in `core/risk_engine.py`, copied exactly —
 * including the one that is zero.
 *
 * THAT ZERO IS THE MOST INTERESTING ROW ON THE PAGE. "A real threat reached
 * you" used to add +8, which handed an outsider a write primitive on somebody
 * else's score: mail a chosen employee six times and they top the risk heatmap
 * having done nothing. It is weighted zero now and the event is still recorded,
 * because the fact is worth showing and is what justifies training someone — it
 * just no longer moves a number that claims to measure their behaviour. Leaving
 * it off would hide the correction; showing it at +8, as the README did for a
 * while, would state something untrue.
 */

import { useLocale } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { Band, Container, SectionHead, Shot } from './primitives'
import { Reveal } from './Section'

/** `WEIGHTS` in `backend/app/core/risk_engine.py`, verbatim. */
const WEIGHTS = [
  { delta: '+12', key: 'l.risk.w.click' },
  { delta: '+4', key: 'l.risk.w.ignored' },
  { delta: '+3', key: 'l.risk.w.failed' },
  { delta: '0', key: 'l.risk.w.exposure', muted: true },
  { delta: '−4', key: 'l.risk.w.report-real' },
  { delta: '−4', key: 'l.risk.w.completed' },
  { delta: '−5', key: 'l.risk.w.report-sim' },
  { delta: '−6', key: 'l.risk.w.comprehension' },
] as const

function tone(delta: string, muted?: boolean) {
  if (muted) return 'text-fg-faint'
  return delta.startsWith('+') ? 'text-high' : 'text-safe'
}

export function RiskModelSection() {
  const { t } = useLocale()

  return (
    <Band id="risk-model" tone="surface">
      <Container>
        <SectionHead
          eyebrow={t('l.risk.eyebrow')}
          title={t('l.risk.title')}
          lead={t('l.risk.intro')}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <Reveal>
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('l.risk.table-caption')}</caption>
              <thead>
                <tr className="border-b border-hair text-left">
                  <th scope="col" className="pb-3 font-normal text-fg-faint">
                    {t('l.risk.col.signal')}
                  </th>
                  <th scope="col" className="w-24 pb-3 text-right font-normal text-fg-faint">
                    {t('l.risk.col.delta')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map((row) => (
                  <tr key={row.key} className="border-b border-hair">
                    <td className="py-4 pr-6 leading-relaxed text-fg-muted">{t(row.key)}</td>
                    <td
                      className={cn(
                        'py-4 text-right font-semibold tabular-nums',
                        tone(row.delta, 'muted' in row ? row.muted : false),
                      )}
                    >
                      {row.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-6 text-sm text-fg-subtle">{t('l.risk.footnote')}</p>
          </Reveal>

          <div className="space-y-8">
            <Reveal delay={60}>
              <Shot src="/product/risk-profiles.avif" alt={t('l.risk.shot-alt')} />
            </Reveal>
            <Reveal delay={100}>
              <div className="border-t border-hair pt-5">
                <h3 className="text-h font-normal text-fg">{t('l.risk.baseline.title')}</h3>
                <p className="mt-2 font-mono text-sm text-fg">20 + (0…1 × 20)</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {t('l.risk.baseline.body')}
                </p>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="border-t border-hair pt-5">
                <h3 className="text-h font-normal text-fg">{t('l.risk.split.title')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {t('l.risk.split.body')}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </Band>
  )
}
