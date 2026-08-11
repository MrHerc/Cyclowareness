/**
 * The frame around the public landing.
 *
 * IT IS DARK, AND IT USED TO BE LIGHT. The first version shared the sign-in
 * door's white-and-pastel surface so the walk from landing to `/login` had no
 * seam. That was the right instinct aimed one screen too early: the door is a
 * doorway, and what the reader is actually being sold is the console behind it,
 * which is near-black with a lime accent. A light landing meant the product
 * changed appearance at the moment of most commitment. Now the landing wears
 * the application's own palette, and the only bright surface on the whole
 * journey is the hero photograph — which is exactly the arrangement the
 * reference site uses.
 *
 * The header is transparent over the hero and takes on a ground once the
 * reader is past it, so the photograph is never cropped by a bar sitting on it.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'
import { LOCALES, LOCALE_NAMES, useLocale } from '../../lib/i18n'
import { useAuth } from '../../lib/auth/useAuth'
import { MadeBy } from '../../components/shell/MadeBy'
import { ProductMark } from '../../components/shell/ProductMark'
import { PRODUCT_NAME } from '../../lib/demo/registry'
import { CONTAINER } from './primitives'

function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      {LOCALES.map((code, index) => (
        <span key={code} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-fg-faint">·</span> : null}
          <button
            type="button"
            lang={code}
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            aria-label={LOCALE_NAMES[code]}
            className={cn(
              'rounded-control px-1 uppercase tracking-wide',
              locale === code ? 'font-semibold text-fg' : 'text-fg-faint hover:text-fg-muted',
            )}
          >
            {code}
          </button>
        </span>
      ))}
    </span>
  )
}

/**
 * The one control whose destination depends on who is reading: a signed-in
 * visitor following a shared link is offered the way back in, not a second
 * sign-in. The landing itself stays reachable either way — a marketing URL
 * that bounces half its readers into an application is one nobody can share.
 */
export function EntryAction({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth()
  const { t } = useLocale()
  return (
    <Link
      to={isAuthenticated ? '/app' : '/login'}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-5',
        'bg-cta text-on-cta text-[0.9375rem] font-medium',
        'transition-[filter] duration-150 hover:brightness-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
        className,
      )}
    >
      {isAuthenticated ? t('l.nav.open-portal') : t('l.nav.sign-in')}
    </Link>
  )
}

export function LandingScaffold({ children }: { children: ReactNode }) {
  const { locale, t } = useLocale()
  const headerRef = useRef<HTMLElement | null>(null)
  const [grounded, setGrounded] = useState(false)

  useEffect(() => {
    let raf = 0
    const apply = () => {
      raf = 0
      setGrounded(window.scrollY > window.innerHeight * 0.6)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="relative min-h-dvh w-full bg-base">
      <a
        href="#main"
        className={cn(
          'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50',
          'focus:rounded-control focus:bg-elevated focus:px-3 focus:py-2 focus:text-sm focus:text-fg',
        )}
      >
        {t('l.skip-to-content')}
      </a>

      <header
        ref={headerRef}
        className={cn(
          'fixed inset-x-0 top-0 z-30 transition-colors duration-300',
          grounded ? 'border-b border-hair bg-base/85 backdrop-blur-md' : 'bg-transparent',
        )}
      >
        <div className={cn(CONTAINER, 'flex h-16 items-center justify-between')}>
          <Link to="/" className="inline-flex items-center gap-2.5 rounded-control" aria-label={PRODUCT_NAME}>
            <ProductMark className="size-7 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-h text-fg">{PRODUCT_NAME}</span>
              {/* The tagline is seven words in Azerbaijani and wrapped to three
                  lines on a phone, which pushed the header to twice its height
                  and squeezed the sign-in control into two lines beside it. It
                  is a subtitle, not a wayfinding element — the page below says
                  the same thing in a full sentence. */}
              <span lang={locale} className="label hidden whitespace-nowrap text-fg-faint sm:block">
                {t('a.tagline')}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <LocaleToggle />
            <EntryAction />
          </div>
        </div>
      </header>

      <main id="main" lang={locale}>
        {children}
      </main>

      <footer className="border-t border-hair bg-void">
        <div className={cn(CONTAINER, 'flex flex-col gap-6 py-14 sm:flex-row sm:items-start sm:justify-between')}>
          <div className="max-w-[26rem] space-y-2">
            <div className="flex items-center gap-2.5">
              <ProductMark className="size-6" />
              <span className="text-h text-fg">{PRODUCT_NAME}</span>
            </div>
            <p className="text-sm text-fg-muted">{t('l.footer.line')}</p>
            <MadeBy />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link to="/login" className="rounded-control text-fg-subtle hover:text-fg">
              {t('l.nav.sign-in')}
            </Link>
            <Link to="/register" className="rounded-control text-fg-subtle hover:text-fg">
              {t('a.request-account')}
            </Link>
            <LocaleToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}
