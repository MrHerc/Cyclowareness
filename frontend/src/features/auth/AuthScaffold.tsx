/**
 * The frame every public page shares: credentials on the left, the product on
 * the right.
 *
 * Two constraints decided the layout.
 *
 * - **The form never scrolls off.** The left column is the only column below
 *   `lg`; the signature figure is not shrunk to fit a phone, it is dropped, and
 *   `mobileIntro` carries the same claim in text. A hero illustration that
 *   pushes the password field under the fold is a hero illustration that costs
 *   sign-ins.
 * - **One `h1` per page, and it is the task.** The marketing headline in the
 *   right column is large but it is not a heading — the page is "Sign in", and
 *   an outline that says otherwise is wrong for anyone reading it with assistive
 *   technology.
 */

import type { ReactNode } from 'react'
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
  /** Shown above the form below `lg`, where the right column does not exist. */
  mobileIntro?: ReactNode
  /** The right column. Omit for a single centred column. */
  aside?: ReactNode
  /** Links out of the page — sign in, request an account, reset. */
  footer?: ReactNode
  children: ReactNode
}

export function AuthScaffold({
  title,
  intro,
  mobileIntro,
  aside,
  footer,
  children,
}: AuthScaffoldProps) {
  return (
    <div className="min-h-dvh w-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Behind everything, pointer-events-none, and carrying no information —
          see the component. The first screen anyone sees should feel like a
          surface rather than a form on a flat colour. */}
      <PointerLight />
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header>
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 rounded-control"
            aria-label={`${PRODUCT_NAME} — sign in`}
          >
            <ProductMark className="size-7" />
            <span className="flex flex-col leading-tight">
              <span className="text-h text-fg">{PRODUCT_NAME}</span>
              <span className="label text-fg-faint">CLOSED-LOOP HUMAN CYBER RISK</span>
            </span>
          </Link>
        </header>

        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            {mobileIntro ? <div className="mb-8 lg:hidden">{mobileIntro}</div> : null}

            <h1 className="text-display text-fg">{title}</h1>
            {intro ? <p className="text-lead text-fg-muted mt-2">{intro}</p> : null}

            <div className="mt-7">{children}</div>
          </div>
        </main>

        {footer ? (
          <footer className="mx-auto w-full max-w-sm text-sm text-fg-subtle lg:mx-0">
            {footer}
          </footer>
        ) : null}
      </div>

      {aside ? (
        <aside className="relative hidden border-l border-line-subtle bg-base/50 lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-16">
          {aside}
        </aside>
      ) : null}
    </div>
  )
}
