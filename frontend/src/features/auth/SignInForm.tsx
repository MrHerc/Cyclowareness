/**
 * The credential form.
 *
 * It validates and it collects; it does not know how to sign anyone in. The page
 * owns `useAuth().login`, the resulting failure and the navigation, which keeps
 * the one call that crosses the network out of a presentation component and out
 * of this file's tests.
 *
 * The failure banner is `role="alert"` and lives above the fields: a message
 * rendered below the submit button, off the bottom of a phone viewport, is a
 * message nobody reads before typing the same wrong password again.
 */

import { useT } from '../../lib/i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, Checkbox, Input } from '../../components/ui'
import { PasswordField } from './PasswordField'
import { signInFailure } from './signInError'

/**
 * Deliberately a pattern rather than `z.email()`: the only job here is to catch
 * a typo before a round trip, and a stricter grammar rejects the perfectly legal
 * addresses that corporate directories are full of.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter your work email')
    .regex(EMAIL_SHAPE, 'That does not look like an email address'),
  password: z.string().min(1, 'Enter your password'),
})

type SignInValues = z.infer<typeof schema>

export interface SignInCredentials extends SignInValues {
  remember: boolean
}

export interface SignInFormProps {
  onSubmit: (credentials: SignInCredentials) => Promise<void>
  /** The last failure from the page. `null` clears the banner. */
  error: unknown
  /** Prefilled from the remembered address, if there is one. */
  defaultEmail: string
  /** True while a demo account button is signing in, which disables this form. */
  busyElsewhere?: boolean
}

export function SignInForm({
  onSubmit,
  error,
  defaultEmail,
  busyElsewhere = false,
}: SignInFormProps) {
  const t = useT()
  const [remember, setRemember] = useState(defaultEmail !== '')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, password: '' },
  })

  const failure = error ? signInFailure(error) : null
  const pending = isSubmitting || busyElsewhere

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit({ email: values.email.trim(), password: values.password, remember }),
      )}
      className="flex flex-col gap-4"
    >
      {failure ? (
        <div
          role="alert"
          className="rise flex gap-2.5 rounded-control border border-critical/40 bg-critical/10 px-3 py-2.5"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-critical"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <p className="text-body text-fg">{failure.headline}</p>
            <p className="text-sm text-fg-muted mt-0.5">{failure.detail}</p>
          </div>
        </div>
      ) : null}

      <Input
        label="Work email"
        type="email"
        autoComplete="username"
        autoFocus={defaultEmail === ''}
        spellCheck={false}
        error={errors.email?.message}
        {...register('email')}
      />

      <PasswordField
        label="Password"
        autoComplete="current-password"
        autoFocus={defaultEmail !== ''}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between gap-4">
        {/* The label says exactly what is stored. It is not a session-length
            control — that belongs to the token the server issues. */}
        <Checkbox
          label={t('p.remember-my-email-on-this-device')}
          checked={remember}
          onCheckedChange={setRemember}
        />
        <Link
          to="/forgot-password"
          className="text-sm text-brand-fg rounded-control hover:underline"
        >
          Forgot password
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Sign in
      </Button>
    </form>
  )
}
