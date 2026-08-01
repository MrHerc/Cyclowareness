/**
 * A password input with a reveal control inside it.
 *
 * It is not the shared `<Input>` because the reveal button has to sit inside the
 * control's border — bolting it on from outside would either break the field's
 * shape or steal the input's own click target. Everything else is `<Field>`, so
 * the label, hint and `role="alert"` error wiring is the same as every other
 * control in the product.
 *
 * The toggle is a real `<button type="button">` with `aria-pressed`, not an
 * icon with a click handler: it changes state and has to announce that it did.
 */

import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { CONTROL_CLASSES, controlBorder, Field } from '../../components/ui'
import { cn } from '../../lib/format'

export interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'type'> {
  label: string
  hint?: string
  error?: string | null
  ref?: Ref<HTMLInputElement>
}

export function PasswordField({ label, hint, error, ref, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field label={label} hint={hint} error={error} required={rest.required}>
      {(aria) => (
        <div className="relative">
          <input
            {...aria}
            {...rest}
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={cn(CONTROL_CLASSES, controlBorder(Boolean(error)), 'h-9 pr-10')}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-pressed={visible}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-9 place-items-center rounded-control text-fg-subtle transition-colors duration-150 hover:text-fg"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </Field>
  )
}
