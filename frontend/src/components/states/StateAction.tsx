/**
 * The one button style used inside a state block — retry, primary action,
 * confirm, cancel.
 *
 * It lives here rather than in `components/ui` because the state components
 * must render before anything else is guaranteed to exist: a state block is
 * what a page falls back to when the rest of it could not be built.
 */

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../lib/format'

export type StateActionTone = 'primary' | 'quiet' | 'danger'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control px-3.5 py-2 text-sm font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-45'

/**
 * `danger` uses the critical hue. That is the one place a risk colour is
 * allowed to describe something other than a risk score: an action that
 * destroys data is genuinely the thing on the screen most worth hesitating over.
 */
const TONES: Record<StateActionTone, string> = {
  primary: 'bg-brand/15 text-brand-fg border border-brand/40 hover:bg-brand/25',
  quiet: 'bg-elevated text-fg-muted border border-line hover:bg-raised hover:text-fg',
  danger: 'bg-critical/15 text-critical border border-critical/45 hover:bg-critical/25',
}

export interface StateActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: StateActionTone
  /** Rendered before the label. Decorative — the label carries the meaning. */
  icon?: ReactNode
  /** React 19 passes `ref` as a prop; a dialog needs it to place initial focus. */
  ref?: Ref<HTMLButtonElement>
}

/** A real `<button>`, always with `type="button"` unless a form asks otherwise. */
export function StateAction({
  tone = 'primary',
  icon,
  className,
  children,
  type = 'button',
  ref,
  ...rest
}: StateActionProps) {
  return (
    <button ref={ref} type={type} className={cn(BASE, TONES[tone], className)} {...rest}>
      {icon ? <span aria-hidden="true" className="flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  )
}
