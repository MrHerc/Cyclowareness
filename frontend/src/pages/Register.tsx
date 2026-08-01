/**
 * Request an account.
 *
 * There is no self-registration endpoint in this backend, and there should not
 * be: a Cyclowareness account is bound to an employee record, a department and a
 * position in the risk model. An account someone created for themselves has no
 * employee behind it, so it has no risk history, no department to raise, and no
 * targeting reason that means anything.
 *
 * So the page says that, and then does the one useful thing it actually can —
 * it composes the request and hands it over. The validation is real because the
 * composed text has to contain a usable address; the submission is real because
 * it produces a real artifact. Nothing pretends to reach a server.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input } from '../components/ui'
import { AuthScaffold } from '../features/auth/AuthScaffold'
import { CompactIntro, PublicAside } from '../features/auth/PublicAside'
import { RequestPanel } from '../features/auth/RequestPanel'
import { PRODUCT_NAME } from '../lib/demo/registry'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
  name: z.string().min(2, 'Enter the name your organisation knows you by'),
  email: z
    .string()
    .min(1, 'Enter your work email')
    .regex(EMAIL_SHAPE, 'That does not look like an email address'),
  team: z.string(),
})

type RegisterValues = z.infer<typeof schema>

function composeRequest(values: RegisterValues): string {
  return [
    `${PRODUCT_NAME} account request`,
    '',
    `Name: ${values.name.trim()}`,
    `Work email: ${values.email.trim()}`,
    `Team or department: ${values.team.trim() || 'not given'}`,
    '',
    `Please provision a ${PRODUCT_NAME} account bound to my employee record and assign the role`,
    'appropriate to my work. I understand accounts are created by the security team and cannot be',
    'self-registered, because the account is what the risk model attaches behaviour to.',
  ].join('\n')
}

export default function Register() {
  const [request, setRequest] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', team: '' },
  })

  return (
    <AuthScaffold
      title="Request an account"
      intro={`${PRODUCT_NAME} accounts are created by your security team. There is no self-service sign-up in this deployment.`}
      mobileIntro={<CompactIntro />}
      aside={<PublicAside />}
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-fg rounded-control hover:underline">
            Sign in
          </Link>
          .
        </p>
      }
    >
      <div className="flex gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-brand"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <p className="text-sm text-fg-muted">
          Every account is bound to an employee record, a department and a role. That binding is
          what makes targeting and risk history mean anything, and it is why an account cannot be
          created from this screen.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => setRequest(composeRequest(values)))}
        className="mt-6 flex flex-col gap-4"
      >
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Team or department"
          hint="Optional. It helps whoever provisions the account pick the right role."
          autoComplete="organization"
          error={errors.team?.message}
          {...register('team')}
        />

        <Button type="submit" variant="primary" size="lg" block>
          Prepare the request
        </Button>
      </form>

      {request ? (
        <RequestPanel
          title="Account request"
          body={request}
          routing="Send this to whoever runs security in your organisation. They provision the account against your employee record and choose the role."
        />
      ) : null}
    </AuthScaffold>
  )
}
