/**
 * A checkbox with its label beside it.
 *
 * It does not go through <Field> because the label belongs to the RIGHT of the
 * control here, not above it — but the aria wiring is the same: a real label,
 * a hint and an error joined by `aria-describedby`, and `aria-invalid` set from
 * the presence of an error rather than from a separate flag that can drift.
 */

import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface CheckboxProps {
  label: ReactNode
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  defaultChecked?: boolean
  hint?: string
  error?: string | null
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
}

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  defaultChecked,
  hint,
  error,
  disabled,
  required,
  name,
  value,
  id,
  className,
}: CheckboxProps) {
  const generated = useId()
  const controlId = id ?? `checkbox-${generated}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-start gap-2.5">
        <RadixCheckbox.Root
          id={controlId}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(next) => onCheckedChange?.(next === true)}
          disabled={disabled}
          required={required}
          name={name}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-chip border transition-colors duration-150',
            error ? 'border-critical/60' : 'border-line-strong hover:border-brand/60',
            'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
            'data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand',
            'disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          <RadixCheckbox.Indicator className="text-void">
            {checked === 'indeterminate' ? (
              <Minus size={11} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Check size={11} strokeWidth={3} aria-hidden="true" />
            )}
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>

        <label htmlFor={controlId} className="text-body text-fg cursor-pointer select-none">
          {label}
        </label>
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-faint pl-6.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-critical pl-6.5">
          {error}
        </p>
      )}
    </div>
  )
}
