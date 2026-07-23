import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenCheck,
  Boxes,
  GraduationCap,
  Inbox,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Radar,
  Rss,
  Send,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/useTheme'
import { LoopMark } from './Brand'
import { IconButton, Spinner, cx } from './ui'
import type { RoleName } from '../lib/types'

const NAV = {
  analyst: [
    { to: '/', label: 'Loop', icon: Radar, end: true },
    { to: '/reports', label: 'Triage', icon: Inbox },
    { to: '/training', label: 'Training', icon: BookOpenCheck },
    { to: '/employees', label: 'People & risk', icon: Users },
    { to: '/sandbox', label: 'Sandbox', icon: Boxes },
    { to: '/simulations', label: 'Simulations', icon: Send },
    { to: '/feed', label: 'Intel', icon: Rss },
  ],
  employee: [{ to: '/me', label: 'My security', icon: GraduationCap, end: true }],
  executive: [{ to: '/exec', label: 'Posture', icon: LineChart, end: true }],
} satisfies Record<RoleName, { to: string; label: string; icon: typeof Radar; end?: boolean }[]>

/**
 * A top bar rather than the usual fixed left rail.
 *
 * The rail cost 240px of width on every page of a data-dense product, and
 * carried a single item for two of the three roles. It is also the most
 * recognisable admin-template silhouette there is. Horizontal navigation gives
 * the tables and the loop the room they actually need, and behaves the same
 * whether a role has one destination or six.
 */
export function Layout() {
  const { session, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (!session) return <Navigate to="/login" replace />

  const items = NAV[session.role] ?? []
  const name = session.employee_name ?? session.email
  const signOut = () => {
    logout()
    navigate('/login')
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative flex items-center gap-2 rounded-control px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-raised text-c1' : 'text-c2 hover:text-c1',
    )

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-panel focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-hair bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1560px] items-center gap-4 px-4 sm:px-6">
          <NavLink to={items[0]?.to ?? '/'} className="flex shrink-0 items-center gap-2" aria-label="Cyclowareness home">
            <LoopMark size={22} className="text-brand-fg" />
            <span className="text-body hidden font-semibold tracking-tight sm:inline">Cyclowareness</span>
          </NavLink>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 lg:flex">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}>
                <Icon size={15} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
              {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            </IconButton>

            <div className="hidden items-center gap-3 border-l border-hair pl-3 sm:flex">
              <div className="text-right leading-tight">
                <div className="text-sm max-w-40 truncate font-medium">{name}</div>
                <div className="text-xs capitalize text-c3">{session.role}</div>
              </div>
              <IconButton label="Sign out" onClick={signOut}>
                <LogOut size={15} aria-hidden />
              </IconButton>
            </div>

            <IconButton label="Open menu" onClick={() => setMenuOpen(true)} className="lg:hidden">
              <Menu size={18} aria-hidden />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Mounted only when open: toggling Tailwind v4 translate utilities left a
          stale `translate: -100%` in the computed style, so the panel is
          conditionally rendered instead. */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => setMenuOpen(false)} />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-line bg-panel shadow-2xl lg:hidden"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between border-b border-hair px-4 py-3">
              <span className="text-body font-semibold">{name}</span>
              <IconButton label="Close menu" onClick={() => setMenuOpen(false)}>
                <X size={18} aria-hidden />
              </IconButton>
            </div>
            <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(link({ isActive }), 'w-full')}>
                  <Icon size={16} aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-hair p-3">
              <button
                onClick={signOut}
                className="text-sm flex items-center gap-2 rounded-control px-3 py-2 text-c2 transition-colors hover:text-danger"
              >
                <LogOut size={15} aria-hidden /> Sign out
              </button>
            </div>
          </aside>
        </>
      )}

      <main id="main" className="mx-auto w-full max-w-[1560px] px-4 pb-16 pt-6 sm:px-6">
        <Suspense fallback={<Spinner label="Loading" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
