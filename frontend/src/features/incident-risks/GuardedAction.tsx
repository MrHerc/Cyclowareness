/**
 * A control that is disabled with the reason written beside it.
 *
 * A disabled button on its own is an accusation with no explanation: the
 * analyst can see that closing this risk is not available and has no way to
 * learn that it is because the risk is still a draft. A tooltip would not do —
 * a disabled button receives no pointer events, so the hint never fires, which
 * is how "hover for why" becomes "no why at all".
 *
 * The reason is therefore visible text, associated through `aria-describedby`
 * so it is announced with the control rather than read as a loose sentence.
 */

import { useId, type ReactNode } from 'react'
import { Button, type ButtonProps } from '../../components/ui'
import { cn } from '../../lib/format'

export interface GuardedActionProps extends Omit<ButtonProps, 'disabled' | 'children'> {
  /** Why this cannot happen right now. Null means it can. */
  reason: string | null
  children: ReactNode
  className?: string
}

export function GuardedAction({ reason, children, className, ...rest }: GuardedActionProps) {
  const reasonId = useId()
  const blocked = reason !== null

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Button {...rest} disabled={blocked} aria-describedby={blocked ? reasonId : undefined}>
        {children}
      </Button>
      {blocked && (
        <p id={reasonId} className="max-w-60 text-xs text-fg-faint">
          {reason}
        </p>
      )}
    </div>
  )
}
