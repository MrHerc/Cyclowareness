/**
 * The authenticated frame: top bar, navigation, and the page.
 *
 * Four decisions worth knowing about.
 *
 * - **Skip link first.** It is the first focusable element in the document and
 *   it moves focus to the `<main>` element itself, which carries `tabIndex={-1}`
 *   so it can accept that focus. Without both halves a keyboard user tabs
 *   through the entire navigation on every single page.
 *
 * - **The rail collapses; the sheet does not.** Under `lg` the navigation is a
 *   modal sheet (Radix Drawer, so the focus trap and Escape come for free) and
 *   the collapse control is withheld — collapsing a sheet to a rail of icons
 *   inside an overlay is a state with no purpose.
 *
 * - **One ErrorBoundary around the outlet, not around the shell.** A page that
 *   throws should cost the page. The navigation, the environment indicator and
 *   the sign-out control have to survive it, because the first thing anyone
 *   does with a broken screen is try to leave it.
 *
 * - **The palette lives here, not in the top bar.** Ctrl/Cmd+K has to work from
 *   anywhere in the application, including from a page that has scrolled the
 *   top bar's buttons out of the way, so the state that opens it belongs to the
 *   frame rather than to one control inside it.
 */

import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DisconnectedBanner, ErrorBoundary } from '../states'
import { Drawer } from '../ui'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { CommandPalette } from './CommandPalette'
import { PageFallback } from './PageFallback'
import { SideNavigation } from './SideNavigation'
import { TopNavigation } from './TopNavigation'

const COLLAPSED_KEY = 'cyclo.nav-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Wraps every authenticated route. Mounted by the router as a layout route, so
 * it renders once and survives navigation — which is what keeps the sidebar's
 * scroll position and the collapse state intact between pages.
 */
export function AppShell() {
  const t = useT()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname } = useLocation()

  // A sheet that survives navigation covers the page the user just asked for.
  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  // The control that opens the sheet disappears at `lg`, so a viewport that
  // crosses that line while the sheet is open would leave a modal overlay with
  // no visible way out. Presentation laptops change resolution when a projector
  // is plugged in, which is exactly when this must not happen.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)')
    const close = () => {
      if (desktop.matches) setSheetOpen(false)
    }
    close()
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {
        /* a preference that cannot be stored is still a valid preference */
      }
      return next
    })
  }, [])

  const openPalette = useCallback(() => setPaletteOpen(true), [])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60]',
          'focus:rounded-control focus:border focus:border-brand focus:bg-elevated',
          'focus:px-3 focus:py-2 focus:text-body focus:text-fg',
        )}
      >
        {t('shell.skipToContent')}
      </a>

      <TopNavigation onOpenSearch={openPalette} onOpenNav={() => setSheetOpen(true)} />

      <div className="flex flex-1 items-start">
        <aside
          className={cn(
            'sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-line-subtle',
            'bg-base/40 transition-[width] duration-200 lg:block',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <SideNavigation
            instanceId="rail"
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>

        {/* This region declares the language it is actually written in, which
            today is English: the shell is translated, the analytical prose
            inside the panels deliberately is not.

            It is not cosmetic. `text-transform: uppercase` follows the element's
            language, and Azerbaijani casing maps `i` to `İ` — correct for
            Azerbaijani words, and wrong for the 56 English labels that were
            rendering as "TİME SPENT" and "DELİVERED AS" the moment the document
            claimed to be Azerbaijani. A screen reader picks its voice the same
            way, so the attribute was mis-describing this text twice over.

            When the panel prose is translated, this becomes `locale` and the
            override below goes away. */}
        <main
          id="main-content"
          tabIndex={-1}
          lang="en"
          className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <ErrorBoundary name="page">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <Drawer
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        side="left"
        size="sm"
        title="Navigation"
        description={t('u.every-screen-your-role-can-open-2')}
      >
        <SideNavigation
          instanceId="sheet"
          collapsed={false}
          onNavigate={() => setSheetOpen(false)}
          className="-mx-3 -my-2"
        />
      </Drawer>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <DisconnectedBanner />
    </div>
  )
}
