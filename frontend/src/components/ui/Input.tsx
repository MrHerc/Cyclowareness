/**
 * A single-line text input with a real label.
 *
 * `label` is required and there is no `placeholder`-only escape hatch, because
 * a placeholder disappears the moment the field has a value — which is exactly
 * when someone reviewing a long form needs to know what they typed into.
 */

import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from '../../lib/format'
import { Field } from './Field'
import { CONTROL_CLASSES, controlBorder } from './field-styles'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label: string
  hint?: string
  error?: string | null
  labelHidden?: boolean
  id?: string
  /** Applies to the input, not the field wrapper. */
  inputClassName?: string
  className?: string
  ref?: Ref<HTMLInputElement>
}

export function Input({
  label,
  hint,
  error,
  labelHidden,
  id,
  className,
  inputClassName,
  ref,
  ...rest
}: InputProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      labelHidden={labelHidden}
      id={id}
      className={className}
    >
      {(aria) => (
        <input
          {...aria}
          {...rest}
          ref={ref}
          className={cn(CONTROL_CLASSES, controlBorder(Boolean(error)), 'h-9', inputClassName)}
        />
      )}
    </Field>
  )
}
