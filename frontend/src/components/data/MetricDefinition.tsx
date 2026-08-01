/**
 * What a metric actually means — the formula, and what it leaves out.
 *
 * Two organisations calling the same number "click rate" rarely compute it the
 * same way; the exclusions are usually where the disagreement lives. Putting the
 * definition one keypress from the figure is what lets a security lead defend
 * the number to their board instead of taking it on faith.
 *
 * A popover, not a hover tooltip: this is content to read, so it must survive
 * the pointer leaving and be reachable from the keyboard.
 */

import { Info } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/format'

export interface MetricDefinitionProps {
  /** The metric's name, exactly as the label beside it reads. */
  metric: string
  /** How it is computed, in words: "clicked ÷ delivered, per campaign". */
  calculation: string
  /** What counts toward it. */
  includes?: string[]
  /** What is deliberately left out — usually the contested part. */
  excludes?: string[]
  /** Anything that would make a reader over-trust the figure. */
  caveat?: string
  className?: string
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="label text-fg-faint">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-fg-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MetricDefinition({
  metric,
  calculation,
  includes,
  excludes,
  caveat,
  className,
}: MetricDefinitionProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`How ${metric} is calculated`}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded-chip text-fg-faint transition-colors hover:text-fg-muted',
            className,
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-panel border border-line bg-elevated p-4 shadow-float"
        >
          <div>
            <p className="text-h text-fg">{metric}</p>
            <p className="mt-1 text-sm text-fg-muted">{calculation}</p>
          </div>

          {includes?.length ? <Section title="Counted" items={includes} /> : null}
          {excludes?.length ? <Section title="Excluded" items={excludes} /> : null}
          {caveat ? <p className="border-t border-line-subtle pt-3 text-sm text-fg-subtle">{caveat}</p> : null}

          <Popover.Arrow className="fill-elevated" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
