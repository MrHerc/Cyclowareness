/**
 * Reset a password.
 *
 * There is no reset endpoint, and this page says so rather than showing the
 * usual "if that address exists you will receive an email" — a sentence that is
 * carefully worded to be true whether or not anything was sent, and which here
 * would be simply false.
 *
 * The second paragraph is the one worth reading twice. A product that tells
 * people it will never email them a reset link has given them a rule they can
 * use against the next phishing message, which is the whole business this
 * product is in.
 */

import { useT } from '../lib/i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailWarning } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../components/ui'
import { AuthScaffold } from '../features/auth/AuthScaffold'
import { RequestPanel } from '../features/auth/RequestPanel'
import { rememberedEmail } from '../features/auth/rememberedEmail'
import { PRODUCT_NAME } from '../lib/demo/registry'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter the work email on the account')
    .regex(EMAIL_SHAPE, 'That does not look like an email address'),
})

type ResetValues = z.infer<typeof schema>

function composeRequest(values: ResetValues): string {
  return [
    `${PRODUCT_NAME} password reset request`,
    '',
    `Account: ${values.email.trim()}`,
    '',
    `I cannot sign in to ${PRODUCT_NAME} and need the password on this account reset.`,
    'I understand the reset is performed by the security team directly, and that Cyclowareness',
    'will never send me a reset link by email.',
  ].join('\n')
}

export default function ForgotPassword() {
  const t = useT()
  const [request, setRequest] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: rememberedEmail() ?? '' },
  })

  return (
    <AuthScaffold
      title={t('x.reset-your-password')}
      intro="Password resets go through your security team. This deployment has no self-service reset."
      footer={
        <p>
          Remembered it?{' '}
          <Link to="/login" className="text-brand-fg rounded-control hover:underline">
            Back to sign in
          </Link>
          .
        </p>
      }
    >
      <div className="flex gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5">
        <MailWarning
          className="mt-0.5 size-4 shrink-0 text-medium"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <p className="text-sm text-fg-muted">
          {PRODUCT_NAME} will never email you a password reset link. If a message claiming to be a{' '}
          {PRODUCT_NAME} reset arrives in your inbox, it did not come from the platform — report it.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => setRequest(composeRequest(values)))}
        className="mt-6 flex flex-col gap-4"
      >
        <Input
          label={t('p.work-email-on-the-account')}
          type="email"
          autoComplete="username"
          spellCheck={false}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" variant="primary" size="lg" block>
          Prepare the reset request
        </Button>
      </form>

      {request ? (
        <RequestPanel
          title={t('x.password-reset-request')}
          body={request}
          routing="Send this to your security team through a channel you already trust — not by replying to an email that asked you to. They reset the credential directly against the account."
        />
      ) : null}
    </AuthScaffold>
  )
}
