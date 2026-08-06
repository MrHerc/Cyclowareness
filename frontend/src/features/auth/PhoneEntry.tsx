/**
 * Employee sign-in by phone number.
 *
 * The user number opens the portal directly — the owner asked for the OTP step
 * on the admin door only. A verified number resolves to the same seeded
 * employee account the password form issues, so nothing downstream changes.
 *
 * If the ADMIN number is typed here, the answer is a pointer to /admin rather
 * than a silent sign-in: the two portals were split so their audiences never
 * share a first screen, and this form does not quietly undo that.
 *
 * Unknown numbers get the server's flat 404, reworded once for humans and
 * identically for every unknown input — a form that words its errors per input
 * is an enumeration oracle.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { api, ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/useAuth'
import type { Session } from '../../domain/types'
import { Button, Input } from '../../components/ui'

interface StartResponse {
  portal: 'admin' | 'user'
  otp_required: boolean
  demo_otp: string | null
}

export function PhoneEntry() {
  const t = useT()
  const navigate = useNavigate()
  const { adoptSession } = useAuth()
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enter() {
    setBusy(true)
    setError(null)
    try {
      const start = await api.post<StartResponse>(
        '/api/auth/phone/start',
        { phone },
        { anonymous: true },
      )
      if (start.portal === 'admin') {
        setError('This is the admin number — it signs in at /admin, behind a code.')
        return
      }
      const session = await api.post<Session>(
        '/api/auth/phone/verify',
        { phone, code: '' },
        { anonymous: true },
      )
      adoptSession(session)
      navigate('/portal', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? t('a.not-registered')
          : err instanceof ApiError
            ? err.message
            : t('a.no-answer'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (phone.trim() && !busy) void enter()
      }}
    >
      <Input
        id="phone-entry"
        label={t('a.phone-entry-label')}
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        hint={t('a.phone-entry-hint')}
      />
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <Button
        type="submit"
        variant="outline"
        block
        icon={<Smartphone className="size-4" aria-hidden="true" />}
        loading={busy}
        disabled={!phone.trim()}
      >{t('a.continue-phone')}</Button>
    </form>
  )
}
