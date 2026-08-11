/**
 * The loop, which is the invention — so it is the first thing after the hero,
 * and the only place on the page that asks the reader to do something.
 *
 * Each stage opens the screen where that stage actually happens: intake for
 * ingest, the sandbox verdict for analyze, the training studio for convert, the
 * roster for target, and so on. Nothing is illustrated. A drawing of a process
 * is a claim; a screenshot of the process running is evidence, and this product
 * cannot afford the first kind.
 *
 * The interaction lives in `FeatureTabs`; this file is only the mapping from
 * stage to screen, which is the part that has to stay true.
 */

import { useLocale } from '../../lib/i18n'
import { Band, Container, SectionHead, Shot } from './primitives'
import { FeatureTabs, type FeatureTabItem } from './FeatureTabs'
import { Reveal } from './Section'

/** Stage → the screen it happens on. Each pairing is checked, not decorative. */
const STAGES = [
  { id: 'ingest', key: 'l.loop.stage.ingest', detailKey: 'l.loop.stage.ingest.detail', shot: 'threats' },
  { id: 'analyze', key: 'l.loop.stage.analyze', detailKey: 'l.loop.stage.analyze.detail', shot: 'sandbox-verdict' },
  { id: 'convert', key: 'l.loop.stage.convert', detailKey: 'l.loop.stage.convert.detail', shot: 'training' },
  { id: 'target', key: 'l.loop.stage.target', detailKey: 'l.loop.stage.target.detail', shot: 'employees' },
  { id: 'train', key: 'l.loop.stage.train', detailKey: 'l.loop.stage.train.detail', shot: 'loops' },
  { id: 'measure', key: 'l.loop.stage.measure', detailKey: 'l.loop.stage.measure.detail', shot: 'command-center' },
  { id: 'feedback', key: 'l.loop.stage.feedback', detailKey: 'l.loop.stage.feedback.detail', shot: 'risk-profiles' },
] as const

export function LoopSection() {
  const { t } = useLocale()

  const items: FeatureTabItem[] = STAGES.map((stage, index) => ({
    id: stage.id,
    term: `${index + 1}. ${t(stage.key)}`,
    detail: t(stage.detailKey),
    shot: `/product/${stage.shot}.avif`,
    alt: `${t(stage.key)} — ${t('l.loop.shot-alt')}`,
  }))

  return (
    <Band id="loop" seam={false}>
      <Container>
        <SectionHead
          eyebrow={t('l.loop.eyebrow')}
          title={t('l.loop.title')}
          lead={t('l.loop.intro')}
        />

        <Reveal>
          <p className="mt-8 text-sm text-fg-subtle">{t('l.loop.tabs-hint')}</p>
        </Reveal>

        <FeatureTabs items={items} className="mt-6" />

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="h-full rounded-panel border border-brand-deep/40 bg-brand/8 p-6">
              <p className="label text-brand-fg">{t('l.loop.gate.eyebrow')}</p>
              <p className="mt-3 text-sm leading-relaxed text-fg">{t('l.loop.gate.body')}</p>
              <p className="mt-4 text-sm text-fg-subtle">{t('l.loop.footnote')}</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <Shot src="/product/approvals.avif" alt={t('l.loop.gate.shot-alt')} />
          </Reveal>
        </div>
      </Container>
    </Band>
  )
}
