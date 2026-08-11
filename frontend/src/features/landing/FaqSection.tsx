/**
 * Six questions, answered without a sales voice.
 *
 * Two of them — where the data goes, and what is not built yet — are the ones a
 * buyer's security team asks first and most vendor sites answer last or not at
 * all. Answering "what is not built" on the marketing page is deliberate: the
 * gaps are in `ROADMAP.md` in the public repository anyway, and a visitor who
 * finds them there after reading a page that implied otherwise has learned
 * something worse than the gap itself.
 *
 * Built on the shared Radix accordion, so keyboard and screen-reader behaviour
 * is the product's own rather than a second implementation.
 */

import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import { Band, Container, SectionHead } from './primitives'
import { Reveal } from './Section'

const QUESTIONS = [
  { id: 'what', q: 'l.faq.what.q', a: 'l.faq.what.a' },
  { id: 'data', q: 'l.faq.data.q', a: 'l.faq.data.a' },
  { id: 'malware', q: 'l.faq.malware.q', a: 'l.faq.malware.a' },
  { id: 'ai', q: 'l.faq.ai.q', a: 'l.faq.ai.a' },
  { id: 'gaps', q: 'l.faq.gaps.q', a: 'l.faq.gaps.a' },
  { id: 'start', q: 'l.faq.start.q', a: 'l.faq.start.a' },
] as const

export function FaqSection() {
  const { t } = useLocale()

  return (
    <Band id="faq">
      <Container>
        <SectionHead
          eyebrow={t('l.faq.eyebrow')}
          title={t('l.faq.title')}
          lead={t('l.faq.intro')}
        />
        <Reveal>
        <Accordion.Root
          type="single"
          collapsible
          className="mt-12 border-t border-hair"
        >
          {QUESTIONS.map((item) => (
            <Accordion.Item
              key={item.id}
              value={item.id}
              className="border-b border-hair"
            >
              <Accordion.Header>
                <Accordion.Trigger
                  className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-h font-normal text-fg group-hover:text-brand-fg">{t(item.q)}</span>
                  <ChevronDown
                    className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="pb-5">
                <p className="max-w-[46rem] text-sm leading-relaxed text-fg-muted">{t(item.a)}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
        </Reveal>
      </Container>
    </Band>
  )
}
