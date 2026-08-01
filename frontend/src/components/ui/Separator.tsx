/**
 * A hairline.
 *
 * `decorative` is the default and it is the honest one: most rules in this
 * product separate things that are already visually grouped, and announcing a
 * separator to a screen reader on every card adds noise without adding meaning.
 * Set it false only when the line is the sole thing marking a real boundary.
 *
 * `fade` uses the `.rule-fade` utility — a line that dissolves at both ends,
 * for separating without drawing a box.
 */

import * as RadixSeparator from '@radix-ui/react-separator'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/format'

export interface SeparatorProps extends ComponentProps<typeof RadixSeparator.Root> {
  fade?: boolean
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  fade = false,
  ...rest
}: SeparatorProps) {
  return (
    <RadixSeparator.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        fade && orientation === 'horizontal' ? 'rule-fade' : 'bg-line-subtle',
        className,
      )}
      {...rest}
    />
  )
}
