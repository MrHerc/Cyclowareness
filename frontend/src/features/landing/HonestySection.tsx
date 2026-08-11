/**
 * The differentiator, written as a list of refusals.
 *
 * Every item names something the product declines to do. That is what separates
 * it from a dashboard which always has a number, and each one has a
 * corresponding guard in the codebase — each was added after the opposite
 * behaviour shipped and was caught.
 *
 * Stated as "we do not" rather than "we always", because a negative claim is
 * falsifiable by one screenshot and a positive one is not.
 */

import { useLocale } from '../../lib/i18n'
import { Band, Container, SectionHead } from './primitives'
import { Stagger, Rise } from './Section'

const REFUSALS = [
  { key: 'l.honesty.tiers', bodyKey: 'l.honesty.tiers.body' },
  { key: 'l.honesty.gate', bodyKey: 'l.honesty.gate.body' },
  { key: 'l.honesty.provenance', bodyKey: 'l.honesty.provenance.body' },
  { key: 'l.honesty.sample', bodyKey: 'l.honesty.sample.body' },
  { key: 'l.honesty.execute', bodyKey: 'l.honesty.execute.body' },
  { key: 'l.honesty.audit', bodyKey: 'l.honesty.audit.body' },
] as const

export function HonestySection() {
  const { t } = useLocale()

  return (
    <Band id="honesty">
      <Container>
        <SectionHead
          eyebrow={t('l.honesty.eyebrow')}
          title={t('l.honesty.title')}
          lead={t('l.honesty.intro')}
        />

        <Stagger as="ul" className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {REFUSALS.map((item) => (
            <Rise as="li" key={item.key}>
              <div className="border-t border-hair pt-5">
                  <h3 className="text-h font-normal text-fg">{t(item.key)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t(item.bodyKey)}</p>
              </div>
            </Rise>
          ))}
        </Stagger>
      </Container>
    </Band>
  )
}
