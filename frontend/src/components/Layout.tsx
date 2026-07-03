import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Radar,
  Inbox,
  BookOpenCheck,
  Users,
  Send,
  Rss,
  LogOut,
  ShieldHalf,
  GraduationCap,
  LineChart,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cx } from './ui'

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

export function Layout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  if (!session) return <Navigate to="/login" replace />
  const items = NAV[session.role] ?? []

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-surface/80 backdrop-blur">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
            <ShieldHalf size={19} className="text-accent" />
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight tracking-tight">Cyclowareness</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint">learn · detect · repeat</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end as boolean | undefined}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="truncate text-[13px] font-medium">{session.employee_name ?? session.email}</div>
          <div className="mb-2 text-[11px] capitalize text-faint">{session.role}</div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-bad"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 min-h-screen flex-1 px-8 py-7">
        <Outlet />
      </main>
    </div>
  )
}
