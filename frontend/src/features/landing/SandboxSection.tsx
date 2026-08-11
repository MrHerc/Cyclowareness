/**
 * The analysis engine — stage two of the loop, and a product on its own.
 *
 * The screenshot leads on this one and the copy follows it, mirroring the
 * previous section so the page alternates rather than marching. What it shows
 * is a real verdict on a real submission: a file named like an invoice, scored
 * 76, classified from its own signals. Nothing on it was arranged for the
 * photograph.
 */

import { useLocale } from '../../lib/i18n'
import { Band, Container, HairlineList, SectionHead, Shot } from './primitives'
import { Reveal } from './Section'

const CAPABILITIES = [
  { key: 'l.sandbox.cap.identify', bodyKey: 'l.sandbox.cap.identify.body' },
  { key: 'l.sandbox.cap.static', bodyKey: 'l.sandbox.cap.static.body' },
  { key: 'l.sandbox.cap.archives', bodyKey: 'l.sandbox.cap.archives.body' },
  { key: 'l.sandbox.cap.url', bodyKey: 'l.sandbox.cap.url.body' },
  { key: 'l.sandbox.cap.score', bodyKey: 'l.sandbox.cap.score.body' },
  { key: 'l.sandbox.cap.export', bodyKey: 'l.sandbox.cap.export.body' },
] as const

/** The families the engine dispatches an analyzer for. Names, not translations. */
const FAMILIES = [
  'PE', 'Office', 'PDF', 'ELF', 'LNK', 'RTF', 'JAR', 'APK', 'ISO', 'Script', 'Archive', 'VirusTotal',
]

export function SandboxSection() {
  const { t } = useLocale()

  return (
    <Band id="sandbox" tone="surface">
      <Container>
        <SectionHead
          eyebrow={t('l.sandbox.eyebrow')}
          title={t('l.sandbox.title')}
          lead={t('l.sandbox.intro')}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6 lg:order-1 lg:sticky lg:top-24 lg:self-start">
            <Reveal>
              <Shot src="/product/sandbox-verdict.avif" alt={t('l.sandbox.shot-alt')} />
            </Reveal>
            <Reveal delay={80}>
              <div>
                <p className="label text-fg-faint">{t('l.sandbox.families')}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {FAMILIES.map((family) => (
                    <li
                      key={family}
                      className="rounded-chip border border-hair px-2.5 py-1 text-xs text-fg-muted"
                    >
                      {family}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="lg:order-2">
            <HairlineList
              className="mt-0"
              items={CAPABILITIES.map((capability) => ({
                term: t(capability.key),
                detail: t(capability.bodyKey),
              }))}
            />
            <Reveal>
              <p className="mt-6 text-sm text-fg-subtle">{t('l.sandbox.footnote')}</p>
            </Reveal>
          </div>
        </div>
      </Container>
    </Band>
  )
}
