/**
 * Label, hint and error — wired to the control, once.
 *
 * Every form control in this library renders through here, which is what stops
 * the two failures that dog hand-built forms: a placeholder standing in for a
 * label (invisible the moment the user types) and an error message that sits
 * beside an input without ever being associated with it. The child receives the
 * exact aria props it must spread, so forgetting them is a type error rather
 * than a silent accessibility hole.
 *
 * The error is `role="alert"`: it is the answer to something the user just did.
 */

import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/format'

/** Spread these onto the control. */
export interface FieldAria {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

export interface FieldProps {
  label: string
  hint?: string
  /** Present means invalid. The string is shown and announced. */
  error?: string | null
  required?: boolean
  /** Hides the label visually but keeps it for assistive tech. */
  labelHidden?: boolean
  /** Supply when the control needs a stable id (a Radix trigger, a test hook). */
  id?: string
  className?: string
  children: (aria: FieldAria) => ReactNode
}

export function Field({
  label,
  hint,
  error,
  required,
  labelHidden = false,
  id,
  className,
  children,
}: FieldProps) {
  const generated = useId()
  const controlId = id ?? `field-${generated}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={controlId}
        className={cn(
          'text-sm font-medium text-fg-muted',
          labelHidden && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span className="text-critical ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-critical">
          {error}
        </p>
      )}
    </div>
  )
}
