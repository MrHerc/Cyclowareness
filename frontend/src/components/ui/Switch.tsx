/**
 * A switch, for settings that take effect immediately.
 *
 * Use it only where flipping it IS the action. If the change needs a Save, use
 * a Checkbox — a switch that silently waits for a submit button teaches people
 * their toggle did nothing.
 */

import * as RadixSwitch from '@radix-ui/react-switch'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface SwitchProps {
  label: ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  defaultChecked?: boolean
  hint?: string
  disabled?: boolean
  name?: string
  id?: string
  className?: string
}

export function Switch({
  label,
  checked,
  onCheckedChange,
  defaultChecked,
  hint,
  disabled,
  name,
  id,
  className,
}: SwitchProps) {
  const generated = useId()
  const controlId = id ?? `switch-${generated}`
  const hintId = hint ? `${controlId}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2.5">
        <RadixSwitch.Root
          id={controlId}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          name={name}
          aria-describedby={hintId}
          className={cn(
            'relative h-5 w-9 shrink-0 rounded-full border border-line-strong bg-raised',
            'transition-colors duration-150 data-[state=checked]:border-brand data-[state=checked]:bg-brand',
            'disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          <RadixSwitch.Thumb
            className={cn(
              'block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-fg shadow-panel',
              'transition-transform duration-150 data-[state=checked]:translate-x-4',
              'data-[state=checked]:bg-void',
            )}
          />
        </RadixSwitch.Root>

        <label htmlFor={controlId} className="text-body text-fg cursor-pointer select-none">
          {label}
        </label>
      </div>

      {hint && (
        <p id={hintId} className="text-xs text-fg-faint pl-11.5">
          {hint}
        </p>
      )}
    </div>
  )
}
