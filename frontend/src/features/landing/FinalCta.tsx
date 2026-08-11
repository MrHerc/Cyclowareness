/**
 * The last block, and the only one that asks for anything.
 *
 * Two doors and no form. A contact form here would need a mail transport the
 * backend does not have — `grep smtplib` across `backend/` is empty — so a
 * submit button would either post into nothing or need a service wired up to
 * make one button work. Until that exists, the honest control is a link to the
 * account request the product already handles.
 */

import { useLocale } from '../../lib/i18n'
import { Container, PillLink } from './primitives'
import { EntryAction } from './LandingScaffold'
import { Reveal } from './Section'

export function FinalCta() {
  const { t } = useLocale()

  return (
    <section className="w-full border-t border-hair bg-void py-28 sm:py-36">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-[40rem] text-center">
            <h2
              className="text-[2rem] leading-[1.14] tracking-[-0.012em] text-fg sm:text-[2.6rem]"
              style={{ fontWeight: 480 }}
            >
              {t('l.cta.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-[34rem] text-lead text-fg-muted">{t('l.cta.body')}</p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <EntryAction className="h-11 px-5" />
              <PillLink to="/register" variant="ghost">
                {t('a.request-account')}
              </PillLink>
            </div>

            <p className="mt-6 text-sm text-fg-subtle">{t('l.cta.note')}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
