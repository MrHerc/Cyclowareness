/**
 * Sign in — the product's first impression.
 *
 * This page owns the three things a form must not: the network call, the
 * failure, and where a successful sign-in lands. `SignInForm` validates and
 * collects; everything else is here.
 *
 * WHERE A SIGN-IN LANDS, IN ORDER
 * 1. the location the route guard stored, if the user was deep-linking — being
 *    bounced to a dashboard after clicking a link to an approval is the fastest
 *    way to lose someone's afternoon;
 * 2. the first-run primer, if it has never been shown on this device;
 * 3. `homeFor(role)`, which is a different screen for all three roles.
 *
 * The demo-account buttons are gated on `/api/capabilities`, not on a build
 * flag. If that call fails the buttons simply do not appear — a failure to read
 * capabilities must never block the credential form, which is the only thing on
 * this page that has to work.
 */

import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '../domain/types'
import { AuthScaffold } from '../features/auth/AuthScaffold'
import { DemoAccounts } from '../features/auth/DemoAccounts'
import { FederatedIdentity } from '../features/auth/FederatedIdentity'
import { CompactIntro, PublicAside } from '../features/auth/PublicAside'
import { rememberedEmail, setRememberedEmail } from '../features/auth/rememberedEmail'
import { PhoneEntry } from '../features/auth/PhoneEntry'
import { SignInForm, type SignInCredentials } from '../features/auth/SignInForm'
import { hasSeenOnboarding } from '../features/onboarding/seen'
import { useCapabilities } from '../lib/api/queries'
import { useAuth } from '../lib/auth/useAuth'
import { homeFor } from '../lib/auth/permissions'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const capabilities = useCapabilities({ retry: false })

  const [error, setError] = useState<unknown>(null)
  const [demoPending, setDemoPending] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? null

  const land = useCallback(
    (session: Session) => {
      if (from) navigate(from, { replace: true })
      else if (!hasSeenOnboarding()) navigate('/onboarding', { replace: true })
      else navigate(homeFor(session.role), { replace: true })
    },
    [from, navigate],
  )

  const signIn = useCallback(
    async ({ email, password, remember }: SignInCredentials) => {
      setError(null)
      try {
        const session = await login(email, password)
        setRememberedEmail(remember ? email : null)
        land(session)
      } catch (failure) {
        setError(failure)
      }
    },
    [land, login],
  )

  const useDemoAccount = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setDemoPending(email)
      try {
        const session = await login(email, password)
        land(session)
      } catch (failure) {
        // Only cleared on failure: on success this page is already unmounting,
        // and clearing it would flash the four buttons back to life first.
        setError(failure)
        setDemoPending(null)
      }
    },
    [land, login],
  )

  return (
    <AuthScaffold
      title="Sign in"
      intro="Your role decides what the platform shows you, and what it lets you approve."
      mobileIntro={<CompactIntro />}
      aside={<PublicAside />}
      footer={
        <p>
          Accounts are provisioned by the security team.{' '}
          <Link to="/register" className="text-brand-fg rounded-control hover:underline">
            Request one
          </Link>
          .
        </p>
      }
    >
      <SignInForm
        onSubmit={signIn}
        error={error}
        defaultEmail={rememberedEmail() ?? ''}
        busyElsewhere={demoPending !== null}
      />

      <PhoneEntry />

      <FederatedIdentity />

      {capabilities.data?.demo_mode ? (
        <DemoAccounts onUse={useDemoAccount} pending={demoPending} />
      ) : null}
    </AuthScaffold>
  )
}
