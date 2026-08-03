/**
 * The first-run primer.
 *
 * It explains the loop, shows where the human gate sits, and lists the surfaces
 * this role can actually open — nothing else. It configures nothing, so there is
 * no wizard, no progress bar, and no step the user can fail: the deployment is
 * already running, and the only thing missing is that this person has not seen
 * how it fits together.
 *
 * It marks itself seen on mount rather than on the continue button. Being shown
 * IS the thing being remembered, and a user who reads it and then closes the tab
 * should not be shown it again at the next sign-in as if they had missed it.
 * Both ways out are on screen the whole time, so there is nothing to trap.
 */

import { ArrowRight, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Panel } from '../components/ui'
import { LoopPrimer } from '../features/onboarding/LoopPrimer'
import { RoleSurfaces } from '../features/onboarding/RoleSurfaces'
import { markOnboardingSeen } from '../features/onboarding/seen'
import { useAuth } from '../lib/auth/useAuth'
import { homeFor, ROLE_LABEL } from '../lib/auth/permissions'
import { PRODUCT_NAME } from '../lib/demo/registry'

const HOME_LABEL: Record<string, string> = {
  analyst: 'Take me to the Command Center',
  executive: 'Take me to the Executive View',
  employee: 'Take me to my training',
}

export default function Onboarding() {
  const { session, role, can } = useAuth()
  const navigate = useNavigate()

  useEffect(markOnboardingSeen, [])

  const home = homeFor(role)
  const leave = () => navigate(home, { replace: true })
  const who = session?.employee_name ?? session?.email ?? null

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label text-brand-fg">FIRST RUN</p>
          <h1 className="text-display text-fg mt-2">
            {who ? `Welcome, ${who}` : `Welcome to ${PRODUCT_NAME}`}
          </h1>
          <p className="text-lead text-fg-muted mt-2">
            {PRODUCT_NAME} turns threats that actually hit this organisation into training for the
            people they actually reached, and measures whether behaviour changed. It runs as one
            loop, and it stops for a person once.
          </p>
        </div>
        <Button variant="ghost" onClick={leave} className="shrink-0">
          Skip
        </Button>
      </header>

      <Panel
        tone="feature"
        title="The loop, in order"
        subtitle="Seven stages. Stage 7 feeds stage 1 — the evidence from one cycle decides the next."
      >
        <LoopPrimer />
      </Panel>

      <Panel
        title={role ? `What ${ROLE_LABEL[role]} covers` : 'What your role covers'}
        subtitle="Every screen below is one this account can open. Anything not listed is enforced by the server as well as hidden here."
      >
        <RoleSurfaces can={can} onNavigate={markOnboardingSeen} />
      </Panel>

      <Panel title="Two things worth knowing before you start">
        <ul className="flex flex-col gap-3">
          <li className="flex gap-3">
            <RefreshCw
              className="mt-0.5 size-4 shrink-0 text-brand"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <p className="text-body text-fg-muted">
              A blank measurement is a blank measurement. Where the platform has not measured
              something yet it prints an em dash and says how large the sample was, rather than a
              zero that looks like good news.
            </p>
          </li>
          <li className="flex gap-3">
            <ArrowRight
              className="mt-0.5 size-4 shrink-0 text-brand"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <p className="text-body text-fg-muted">
              Content written by a model is labelled as such, everywhere it appears. Template output
              is labelled as template output, never as AI.
            </p>
          </li>
        </ul>
      </Panel>

      <footer className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <p className="text-sm text-fg-subtle">
          You can reach every one of these screens from the navigation once you are inside.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={leave}
          icon={<ArrowRight className="size-4" aria-hidden="true" />}
        >
          {(role && HOME_LABEL[role]) ?? 'Take me to my home screen'}
        </Button>
      </footer>
    </div>
  )
}
