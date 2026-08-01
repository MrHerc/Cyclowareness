/**
 * A one-of-N choice, built on native radio inputs.
 *
 * Radix has no radio-group package installed here, and it turns out not to be
 * needed: radios sharing a `name` already give arrow-key roving focus, a single
 * tab stop and correct announcement, for free and forever. The only work left
 * is appearance, so the input is `appearance-none` and the selected state is
 * drawn as a thick brand border with the field surface showing through.
 *
 * The group label is a real `<legend>` inside a `<fieldset>`, which is what
 * makes a screen reader read "Channel, Email, radio button 1 of 3" instead of
 * three orphan radios.
 */

import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface RadioOption {
  value: string
  label: ReactNode
  hint?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  label: string
  options: RadioOption[]
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  /** Shared across the inputs. Generated when omitted. */
  name?: string
  hint?: string
  error?: string | null
  required?: boolean
  disabled?: boolean
  orientation?: 'vertical' | 'horizontal'
  labelHidden?: boolean
  className?: string
}

export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  defaultValue,
  name,
  hint,
  error,
  required,
  disabled,
  orientation = 'vertical',
  labelHidden = false,
  className,
}: RadioGroupProps) {
  const generated = useId()
  const groupName = name ?? `radio-${generated}`
  const hintId = hint ? `${groupName}-hint` : undefined
  const errorId = error ? `${groupName}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <fieldset
      className={cn('flex flex-col gap-2 border-0 p-0 m-0', className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className={cn('text-sm font-medium text-fg-muted mb-1', labelHidden && 'sr-only')}>
        {label}
        {required && (
          <span className="text-critical ml-1" aria-hidden="true">
            *
          </span>
        )}
      </legend>

      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-wrap items-center')}>
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`
          return (
            <div key={option.value} className="flex items-start gap-2.5">
              <input
                type="radio"
                id={optionId}
                name={groupName}
                value={option.value}
                checked={value === undefined ? undefined : value === option.value}
                defaultChecked={value === undefined ? defaultValue === option.value : undefined}
                onChange={() => onValueChange?.(option.value)}
                disabled={option.disabled}
                required={required}
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full bg-base',
                  'border transition-colors duration-150',
                  error ? 'border-critical/60' : 'border-line-strong hover:border-brand/60',
                  'checked:border-brand checked:border-[5px]',
                  'disabled:cursor-not-allowed disabled:opacity-45',
                )}
              />
              <label htmlFor={optionId} className="cursor-pointer select-none">
                <span className="block text-body text-fg">{option.label}</span>
                {option.hint && <span className="block text-xs text-fg-faint">{option.hint}</span>}
              </label>
            </div>
          )
        })}
      </div>

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
    </fieldset>
  )
}
