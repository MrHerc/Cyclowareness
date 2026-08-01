/**
 * Multi-line text — analyst notes, rejection comments, closure criteria.
 *
 * Resize is vertical only. A textarea that can be dragged wider than its column
 * breaks every layout it sits in, and nobody has ever wanted it.
 */

import type { Ref, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/format'
import { Field } from './Field'
import { CONTROL_CLASSES, controlBorder } from './field-styles'

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  label: string
  hint?: string
  error?: string | null
  labelHidden?: boolean
  id?: string
  className?: string
  textareaClassName?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({
  label,
  hint,
  error,
  labelHidden,
  id,
  className,
  textareaClassName,
  rows = 4,
  ref,
  ...rest
}: TextareaProps) {
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
        <textarea
          {...aria}
          {...rest}
          rows={rows}
          ref={ref}
          className={cn(
            CONTROL_CLASSES,
            controlBorder(Boolean(error)),
            'resize-y py-2 leading-relaxed',
            textareaClassName,
          )}
        />
      )}
    </Field>
  )
}
