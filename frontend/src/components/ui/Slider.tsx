/**
 * A single-value slider — thresholds, minimum scores, risk cut-offs.
 *
 * The current value is always shown as a number beside the label. A slider is a
 * gesture, not a readout; asking someone to set "minimum score 70" by eyeballing
 * a thumb position is how a policy gets set to 68 by accident.
 */

import * as RadixSlider from '@radix-ui/react-slider'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface SliderProps {
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Rendered instead of the bare number — for "70%" or "3 days". */
  formatValue?: (value: number) => ReactNode
  hint?: string
  disabled?: boolean
  className?: string
}

export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  hint,
  disabled,
  className,
}: SliderProps) {
  const generated = useId()
  const hintId = hint ? `slider-${generated}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        <span className="text-body text-fg tabular-nums">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>

      <RadixSlider.Root
        value={[value]}
        onValueChange={([next]) => next !== undefined && onValueChange(next)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        aria-describedby={hintId}
        className="relative flex h-4 w-full touch-none select-none items-center disabled:opacity-45"
      >
        <RadixSlider.Track className="relative h-1 w-full grow overflow-hidden rounded-chip bg-raised">
          <RadixSlider.Range className="absolute h-full bg-brand" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block h-4 w-4 rounded-full border-2 border-brand bg-void shadow-panel" />
      </RadixSlider.Root>

      {hint && (
        <p id={hintId} className="text-xs text-fg-faint">
          {hint}
        </p>
      )}
    </div>
  )
}
