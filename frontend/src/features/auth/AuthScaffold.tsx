/**
 * The frame every public page shares: one centred column, nothing beside it.
 *
 * WHY THE SECOND COLUMN IS GONE. It held a headline, a supporting sentence and
 * a drawn figure — a pitch. A sign-in is not a place to be sold to: the reader
 * already decided to come here, and the only thing they want is the shortest
 * path to the field. The reference this follows puts a mark, a heading, the
 * fields and two links on an empty page, and that emptiness is the whole
 * effect. Splitting the viewport put the form permanently off-centre and gave
 * the eye a second place to go first.
 *
 * The column is 26rem and does not grow. On a 1600px display the page does not
 * become a 1600px form; it stays exactly as wide as the task and lets the light
 * behind it carry the rest.
 *
 * ONE `h1` PER PAGE, AND IT IS THE TASK. The page is "Sign in" — not a slogan.
 * Anything read with assistive technology gets an outline that matches what the
 * page is actually for.
 */

import type { ReactNode } from 'react'
import { useLocale } from '../../lib/i18n'
import { MadeBy } from '../../components/shell/MadeBy'
import { AuroraField } from './AuroraField'
import { Link } from 'react-router-dom'
import { PointerLight } from './PointerLight'
// Directly, not through the shell barrel: that barrel reaches AppShell and the
// command palette, and none of it belongs in the first chunk a visitor loads.
import { ProductMark } from '../../components/shell/ProductMark'
import { PRODUCT_NAME } from '../../lib/demo/registry'

export interface AuthScaffoldProps {
  /** The page's own heading — the task, not the pitch. */
  title: string
  /** One or two sentences under the heading. */
  intro?: ReactNode
  /** Links out of the page — sign in, request an account, reset. */
  footer?: ReactNode
  children: ReactNode
}

export function AuthScaffold({ title, intro, footer, children }: AuthScaffoldProps) {
  const { locale, t } = useLocale()
  return (
    <div className="auth-surface relative flex min-h-dvh w-full flex-col overflow-hidden">
      {/* Full-bleed and carrying no information — see the components. The first
          screen anyone sees should feel like a lit surface rather than a form on
          a flat colour. */}
      <AuroraField />
      <PointerLight />

      {/* `justify-center` on the column, not `flex-1` on the main: the mark, the
          form and the links travel together as one block and stay optically
          centred, instead of the mark pinning to the top edge and the footer to
          the bottom on a tall display. */}
      <div className="relative mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-6 py-8 sm:px-0">
        <header className="settle settle-1 flex justify-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 rounded-control"
            aria-label={`${PRODUCT_NAME} — sign in`}
          >
            <ProductMark className="size-7" />
            <span className="flex flex-col leading-tight">
              <span className="text-h text-fg">{PRODUCT_NAME}</span>
              <span lang={locale} className="label text-fg-faint">
                {t('a.tagline')}
              </span>
            </span>
          </Link>
        </header>

        <main className="settle settle-2 mt-10">
          {/* Centred, because there is nothing to align to any more. The fields
              below keep their own left-aligned labels — a centred label above a
              left-aligned input is the tell of a template. */}
          <h1 className="text-center text-[2.25rem] font-medium leading-[1.1] tracking-[-0.025em] text-fg sm:text-[2.5rem]">
            {title}
          </h1>
          {intro ? (
            <p className="mx-auto mt-4 max-w-[22rem] text-center text-base leading-[1.65] text-fg-muted">
              {intro}
            </p>
          ) : null}

          <div className="mt-8">{children}</div>
        </main>

        <footer className="settle settle-4 mt-8 space-y-2 text-center text-sm text-fg-subtle">
          {footer}
          {/* Attribution sits under whatever the page's own footer says, on
              every auth screen, because this is where a reader looks for who
              made the thing they are about to sign in to. */}
          <MadeBy />
        </footer>
      </div>
    </div>
  )
}
