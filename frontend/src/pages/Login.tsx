import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldHalf, ArrowRight } from 'lucide-react'
import { homeFor, useAuth } from '../lib/auth'
import { useCapabilities } from '../lib/useCapabilities'
import { Button } from '../components/ui'

const DEMO_ACCOUNTS = [
  { label: 'Security Analyst', email: 'analyst@caspiandynamics.az', password: 'analyst123' },
  { label: 'Employee (Finance)', email: 'leyla.aliyeva@caspiandynamics.az', password: 'demo123' },
  { label: 'Employee (high risk)', email: 'rashad.mammadov@caspiandynamics.az', password: 'demo123' },
  { label: 'Executive (read-only)', email: 'exec@caspiandynamics.az', password: 'exec123' },
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
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-5xl fade-in">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* left: brand story */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
                <ShieldHalf size={26} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Cyclowareness</h1>
                <p className="text-[11px] uppercase tracking-[0.22em] text-faint">
                  closed-loop security awareness
                </p>
              </div>
            </div>
            <h2 className="text-3xl font-semibold leading-snug tracking-tight">
              Real threats become <span className="text-accent">personalized training</span> — automatically.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Every reported attack is detonated in a sandbox, converted by AI into targeted
              micro-training for the exact people at risk, and measured — the results feed straight
              back into the risk model. Learn, detect, neutralize. And repeat.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-faint">
              {['Ingest', 'Analyze', 'Convert', 'Target', 'Train', 'Measure', 'Feedback'].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-surface px-2 py-1 font-medium tracking-wide text-muted">
                    {s}
                  </span>
                  {i < 6 && <span className="text-accent/60">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* right: login card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-semibold">Sign in</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void doLogin(email, password)
              }}
            >
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent/60"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent/60"
              />
              {error && <div className="text-xs text-bad">{error}</div>}
              <Button type="submit" busy={busy} className="w-full justify-center py-2">
                Sign in <ArrowRight size={14} />
              </Button>
            </form>

            {/* The seeded accounts only exist in the exhibition build; in
                production these buttons would fail on every click. */}
            {caps.demo_mode && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Demo accounts — one click
                </div>
                <div className="space-y-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      disabled={busy}
                      onClick={() => void doLogin(acc.email, acc.password)}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-xs transition-colors hover:border-accent/50"
                    >
                      <span className="font-medium">{acc.label}</span>
                      <span className="text-faint">{acc.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
