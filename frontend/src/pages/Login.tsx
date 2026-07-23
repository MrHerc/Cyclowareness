import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { homeFor, useAuth } from '../lib/auth'
import { useCapabilities } from '../lib/useCapabilities'
import { LoopMark } from '../components/Brand'
import { Button, Callout, Input, cx } from '../components/ui'
import { STAGES } from '../lib/types'

const DEMO_ACCOUNTS = [
  { role: 'Security analyst', email: 'analyst@caspiandynamics.az', password: 'analyst123' },
  { role: 'Employee — Finance', email: 'leyla.aliyeva@caspiandynamics.az', password: 'demo123' },
  { role: 'Employee — high risk', email: 'rashad.mammadov@caspiandynamics.az', password: 'demo123' },
  { role: 'Executive — read only', email: 'exec@caspiandynamics.az', password: 'exec123' },
]

export function Login() {
  const { login } = useAuth()
  const caps = useCapabilities()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const doLogin = async (e: string, p: string) => {
    setBusy(true)
    setError(null)
    try {
      const session = await login(e, p)
      navigate(homeFor(session.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-12">
      <div className="rise grid w-full gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20">
        {/* --- the proposition ------------------------------------------- */}
        <div>
          <div className="flex items-center gap-3">
            <LoopMark size={30} className="text-brand-fg" />
            <span className="text-h tracking-tight">Cyclowareness</span>
          </div>

          <h1 className="text-display mt-8 max-w-xl">
            The attack your people just reported becomes the training they get tomorrow.
          </h1>
          <p className="text-lead mt-5 max-w-lg text-c2">
            A reported threat is analysed, converted into a short lesson, and delivered only to the
            people that threat would actually have worked on. What they do next updates the risk
            model — which decides who gets targeted the next time round.
          </p>

          {/* The loop, stated plainly. Seven numbered stages read as a system;
              seven identical pills read as decoration. */}
          <ol className="mt-9 grid max-w-lg grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-3">
            {STAGES.map((s) => (
              <li key={s.n} className="flex items-baseline gap-2.5 border-t border-hair pt-2">
                <span className="text-xs font-mono text-c3">{String(s.n).padStart(2, '0')}</span>
                <span className="text-sm font-medium">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* --- sign in ---------------------------------------------------- */}
        <div className="w-full max-w-md justify-self-end rounded-panel border border-hair bg-panel p-6">
          <h2 className="text-h">Sign in</h2>
          <p className="text-sm mt-1 text-c2">Use your work account.</p>

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void doLogin(email, password)
            }}
          >
            <Input
              label="Email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div aria-live="polite">
                <Callout tone="danger">{error}</Callout>
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" busy={busy} className="w-full">
              Sign in <ArrowRight size={15} aria-hidden />
            </Button>
          </form>

          {/* The seeded accounts exist only in the exhibition build; in
              production every one of these buttons would fail on click. */}
          {caps.demo_mode && (
            <div className="mt-6 border-t border-hair pt-5">
              <div className="label text-c3">Demo accounts</div>
              <div className="mt-2.5 space-y-1">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={busy}
                    onClick={() => void doLogin(acc.email, acc.password)}
                    className={cx(
                      'flex w-full items-baseline justify-between gap-3 rounded-control px-2.5 py-2 text-left transition-colors',
                      'hover:bg-raised disabled:opacity-50',
                    )}
                  >
                    <span className="text-sm font-medium">{acc.role}</span>
                    <span className="text-xs truncate text-c3">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
