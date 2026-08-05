/**
 * The window every rate on a screen is measured over.
 *
 * The rule this enforces: a preset name is not a range. "Last 30 days" tells a
 * reader nothing about which 30 days, and two screenshots taken a week apart
 * carry the same label over different data. So the resolved dates sit next to
 * the preset on the trigger itself, and they are what a caller prints in an
 * export or a report.
 *
 * Controlled — the range belongs to the page, because the same range usually
 * drives several queries at once. The date maths lives in `dateRange.ts`.
 */

import { useT } from '../../lib/i18n'
import { useId } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/format'
import {
  DATE_RANGE_LABELS,
  DATE_RANGE_PRESETS,
  formatRangeLabel,
  fromISODate,
  rangeDays,
  resolveRange,
  toISODate,
  type DateRangePreset,
  type DateRangeValue,
} from './dateRange'

export interface DateRangeSelectorProps {
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
  /** Latest selectable day, `YYYY-MM-DD`. Defaults to today — the future is not measurable. */
  max?: string
  /** Accessible name for the trigger. */
  label?: string
  className?: string
}

export function DateRangeSelector({
  value,
  onChange,
  max,
  label = 'Measurement window',
  className,
}: DateRangeSelectorProps) {
  const t = useT()
  // Two selectors can share a page (a dashboard and a drawer); hardcoded ids
  // would point both <label>s at the first pair of inputs.
  const fieldId = useId()
  const maxDate = max ?? toISODate(new Date())
  const resolved = formatRangeLabel(value.from, value.to)
  const days = rangeDays(value.from, value.to)

  function selectPreset(preset: Exclude<DateRangePreset, 'custom'>) {
    onChange({ preset, ...resolveRange(preset) })
  }

  // An inverted range returns an empty result set, which reads on screen as
  // "nothing happened". Push the other end rather than accept from > to.
  function setBound(bound: 'from' | 'to', next: string) {
    if (!fromISODate(next)) return
    const from = bound === 'from' ? next : value.from
    const to = bound === 'to' ? next : value.to
    onChange({
      preset: 'custom',
      from: bound === 'to' && next < from ? next : from,
      to: bound === 'from' && next > to ? next : to,
    })
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex items-center gap-2 rounded-control border border-line bg-elevated px-3 py-2 text-sm text-fg transition-colors hover:border-line-strong',
            className,
          )}
        >
          <Calendar className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span>{DATE_RANGE_LABELS[value.preset]}</span>
          <span className="text-fg-subtle">{resolved}</span>
          <ChevronDown className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-72 max-w-[calc(100vw-2rem)] space-y-4 rounded-panel border border-line bg-elevated p-4 shadow-float"
        >
          <div className="space-y-1">
            {DATE_RANGE_PRESETS.map((preset) => {
              const range = resolveRange(preset.key)
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={value.preset === preset.key}
                  onClick={() => selectPreset(preset.key)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-sm transition-colors',
                    value.preset === preset.key
                      ? 'bg-raised text-fg'
                      : 'text-fg-muted hover:bg-raised hover:text-fg',
                  )}
                >
                  <span>{preset.label}</span>
                  <span className="text-xs text-fg-faint">{formatRangeLabel(range.from, range.to)}</span>
                </button>
              )
            })}
          </div>

          <fieldset className="space-y-2 border-t border-line-subtle pt-3">
            <legend className="label text-fg-faint">Custom</legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${fieldId}-from`} className="text-xs text-fg-subtle">{t('y.from')}</label>
                <input
                  id={`${fieldId}-from`}
                  type="date"
                  value={value.from}
                  max={maxDate}
                  onChange={(event) => setBound('from', event.target.value)}
                  className="mt-1 w-full rounded-control border border-line bg-surface px-2 py-1.5 text-sm text-fg"
                />
              </div>
              <div>
                <label htmlFor={`${fieldId}-to`} className="text-xs text-fg-subtle">
                  To
                </label>
                <input
                  id={`${fieldId}-to`}
                  type="date"
                  value={value.to}
                  max={maxDate}
                  onChange={(event) => setBound('to', event.target.value)}
                  className="mt-1 w-full rounded-control border border-line bg-surface px-2 py-1.5 text-sm text-fg"
                />
              </div>
            </div>
          </fieldset>

          <p className="text-xs text-fg-faint" aria-live="polite">
            Measuring {resolved}
            {days !== null ? ` · ${days} days` : ''}
          </p>

          <Popover.Arrow className="fill-elevated" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
