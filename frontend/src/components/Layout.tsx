import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Radar,
  Inbox,
  BookOpenCheck,
  Users,
  Send,
  Rss,
  LogOut,
  Menu,
  ShieldHalf,
  GraduationCap,
  LineChart,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cx, Spinner } from './ui'
import type { RoleName } from '../lib/types'

const NAV = {
  analyst: [
    { to: '/', label: 'Loop Dashboard', icon: Radar, end: true },
    { to: '/reports', label: 'Triage Queue', icon: Inbox },
    { to: '/training', label: 'Training Review', icon: BookOpenCheck },
    { to: '/employees', label: 'Employees & Risk', icon: Users },
    { to: '/simulations', label: 'Simulations', icon: Send },
    { to: '/feed', label: 'Intel Feed', icon: Rss },
  ],
  employee: [{ to: '/me', label: 'My Security Portal', icon: GraduationCap, end: true }],
  executive: [{ to: '/exec', label: 'Executive View', icon: LineChart, end: true }],
}

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
      <ShieldHalf size={19} className="text-accent" />
    </div>
    <div>
      <div className="text-[15px] font-bold leading-tight tracking-tight">Cyclowareness</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint">learn · detect · repeat</div>
    </div>
  </div>
)

function SidebarBody({
  role,
  name,
  onSignOut,
}: {
  role: RoleName
  name: string
  onSignOut: () => void
}) {
  const items = NAV[role] ?? []
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end as boolean | undefined}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="truncate text-[13px] font-medium">{name}</div>
        <div className="mb-2 text-[11px] capitalize text-faint">{role}</div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-bad"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </>
  )
}

export function Layout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname])

  if (!session) return <Navigate to="/login" replace />
  const name = session.employee_name ?? session.email
  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-border p-2 text-muted hover:text-ink"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Desktop sidebar — always present ≥lg */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface/80 backdrop-blur lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Brand />
        </div>
        <SidebarBody role={session.role} name={name} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer — mounted only when open */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-border bg-surface shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-5 pb-5 pt-6">
              <Brand />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <SidebarBody role={session.role} name={name} onSignOut={signOut} />
          </aside>
        </>
      )}

      {/* Content is capped and centred: past ~1600px the dashboard would
          otherwise sprawl edge-to-edge and lose all sense of composition. */}
      <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6 lg:ml-60 lg:px-8 lg:pt-7">
        <div className="mx-auto w-full max-w-[1440px]">
          <Suspense fallback={<Spinner label="Loading…" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
