/**
 * The admin portal's own door: a phone number, then a one-time code.
 *
 * `/admin` is an ENTRY split, not a second identity system. A verified phone
 * resolves to the same seeded analyst account the password form issues, so
 * every permission check downstream is untouched — two doors, one building.
 *
 * The OTP is a stub and the screen says so. No SMS gateway is wired, so in
 * demo mode the server returns the code in the response and this page shows it
 * for the operator to type back. That exercises the real flow shape — start,
 * code, expiry, single use — while being incapable of pretending a message was
 * sent. When a gateway exists, the code arrives by SMS and the hint disappears
 * without this page changing shape.
 *
 * An unknown number gets the server's flat 404 — no hint of which numbers
 * exist. This page adds nothing to that answer, because a login screen that
 * words its errors differently per input is an enumeration oracle.
 */

import { useT } from '../lib/i18n'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { AuthScaffold } from '../features/auth/AuthScaffold'
import { LoopSignature } from '../features/auth/LoopSignature'
import { api, ApiError } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'
import type { Session } from '../domain/types'
import { Button, Input } from '../components/ui'

interface StartResponse {
  portal: 'admin' | 'user'
  otp_required: boolean
  demo_otp: string | null
}

export default function AdminLogin() {
  const t = useT()
  const navigate = useNavigate()
  const { adoptSession } = useAuth()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [stage, setStage] = useState<'phone' | 'otp'>('phone')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<StartResponse>(
        '/api/auth/phone/start',
        { phone },
        { anonymous: true },
      )
      if (res.portal !== 'admin') {
        // The employee number on the admin door: point at the right door
        // rather than silently opening the wrong portal from /admin.
        setError('This number opens the employee portal — use the main sign-in.')
        return
      }
      setDemoOtp(res.demo_otp)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('a.no-answer'))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setBusy(true)
    setError(null)
    try {
      const session = await api.post<Session>(
        '/api/auth/phone/verify',
        { phone, code },
        { anonymous: true },
      )
      adoptSession(session)
      navigate('/command-center', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('a.no-answer'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScaffold
      title={t('x.admin-portal')}
      intro={t('a.admin-intro')}
      aside={<LoopSignature />}
      footer={
        <p>
          {t('a.not-admin')}{' '}
          <a href="/login" className="text-brand-fg underline-offset-4 hover:underline">{t('a.employee-signin')}</a>
        </p>
      }
    >
      {stage === 'phone' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (phone.trim() && !busy) void start()
          }}
        >
          <Input
            id="admin-phone"
            label={t('a.admin-phone-label')}
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            hint={t('a.digits-only')}
          />
          {error ? <p className="text-sm text-critical">{error}</p> : null}
          <Button type="submit" block loading={busy} disabled={!phone.trim()}>{t('a.continue')}</Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (code.trim() && !busy) void verify()
          }}
        >
          <Input
            id="admin-otp"
            label={t('a.otp-label')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            hint={t('a.otp-hint')}
          />
          {demoOtp ? (
            // The stub, stated as a stub. This block exists only while no SMS
            // gateway is configured, and it never pretends a message was sent.
            <p className="flex items-start gap-2 rounded-control border border-line-subtle bg-surface px-3 py-2 text-sm text-fg-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-fg" aria-hidden="true" />
              <span>
                No SMS gateway is wired in this demo, so the code is shown here
                instead of texted: <span className="tech text-fg">{demoOtp}</span>
              </span>
            </p>
          ) : null}
          {error ? <p className="text-sm text-critical">{error}</p> : null}
          <Button type="submit" block loading={busy} disabled={code.trim().length < 6}>{t('a.enter-admin')}</Button>
          <Button
            type="button"
            variant="ghost"
            block
            onClick={() => {
              setStage('phone')
              setCode('')
              setDemoOtp(null)
              setError(null)
            }}
          >{t('a.different-number')}</Button>
        </form>
      )}
    </AuthScaffold>
  )
}
