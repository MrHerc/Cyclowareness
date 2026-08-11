/**
 * A single-choice select, Radix-backed.
 *
 * The options are passed as data rather than composed as children: every select
 * in this product is a flat list of values from an enum, and a composed API
 * invites each caller to re-style the items slightly differently. Radix supplies
 * the typeahead, roving focus, escape handling and portalling.
 *
 * The label is a real `<label>` pointing at the trigger, so clicking it opens
 * the menu — which a div-with-text label never does.
 */

import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/format'
import { useT, type MessageKey } from '../../lib/i18n'
import { Field } from './Field'
import { CONTROL_CLASSES, controlBorder } from './field-styles'

export interface SelectOption {
  value: string
  /**
   * The English text. Kept as the fallback, and as what a reader of the option
   * list sees without opening the catalogue.
   */
  label: string
  /**
   * The catalogue key, when there is one — `t(labelKey)` wins over `label`.
   *
   * Every option list in this product is a module-scope constant
   * (`SEVERITY_OPTIONS`, `VERDICT_OPTIONS`, …), and a module-scope constant
   * cannot call `useT()`: there is no component around it. So the constants kept
   * their English and 167 filter options stayed English on an Azerbaijani
   * screen — `Any severity`, `Awaiting triage`, `Curated feed` — while the page
   * around them was fully translated.
   *
   * Resolving here rather than at each of the 26 call sites is the same shape
   * `app/navigation.ts` already uses for `labelKey`: the data carries the key,
   * the component that renders it does the lookup.
   */
  labelKey?: MessageKey
  disabled?: boolean
}

export interface SelectProps {
  label: string
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  placeholder?: string
  hint?: string
  error?: string | null
  required?: boolean
  disabled?: boolean
  labelHidden?: boolean
  /** Form field name, for uncontrolled use inside a native <form>. */
  name?: string
  id?: string
  className?: string
}

export function Select({
  label,
  options,
  value,
  onValueChange,
  defaultValue,
  placeholder = 'Select…',
  hint,
  error,
  required,
  disabled,
  labelHidden,
  name,
  id,
  className,
}: SelectProps) {
  const t = useT()
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      labelHidden={labelHidden}
      id={id}
      className={className}
    >
      {(aria) => (
        <RadixSelect.Root
          value={value}
          onValueChange={onValueChange}
          defaultValue={defaultValue}
          disabled={disabled}
          name={name}
          required={required}
        >
          <RadixSelect.Trigger
            {...aria}
            className={cn(
              CONTROL_CLASSES,
              controlBorder(Boolean(error)),
              'flex h-9 items-center justify-between gap-2 text-left data-[placeholder]:text-fg-faint',
            )}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown size={15} className="text-fg-subtle" aria-hidden="true" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={6}
              className="z-50 overflow-hidden rounded-control border border-line bg-elevated shadow-float"
              style={{ minWidth: 'var(--radix-select-trigger-width)' }}
            >
              <RadixSelect.Viewport className="max-h-72 p-1">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center gap-2 rounded-chip py-1.5 pl-7 pr-3',
                      'text-body text-fg-muted outline-none',
                      'data-[highlighted]:bg-raised data-[highlighted]:text-fg',
                      'data-[state=checked]:text-fg',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 inline-flex">
                      <Check size={13} className="text-brand" aria-hidden="true" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>
                      {option.labelKey ? t(option.labelKey) : option.label}
                    </RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    </Field>
  )
}
