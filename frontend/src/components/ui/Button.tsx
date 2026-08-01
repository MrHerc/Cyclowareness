/**
 * The action control.
 *
 * Two decisions worth knowing about.
 *
 * - **`loading` never changes the button's width.** The label stays in the DOM
 *   at `opacity-0` and the spinner is absolutely centred over it. Swapping the
 *   label for a spinner reflows the row, and a toolbar that jumps while a
 *   request is in flight is how a demo loses the room.
 *
 * - **Text on a saturated fill is the void tone, not `fg`.** Near-white on cyan
 *   measures about 1.6:1. The surfaces palette is the only place to find a tone
 *   dark enough to clear AA on brand and critical fills.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/format'
import { Slot } from './Slot'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-void border border-brand hover:bg-brand-fg hover:border-brand-fg shadow-panel',
  secondary:
    'bg-raised text-fg border border-line hover:bg-elevated hover:border-line-strong shadow-panel',
  ghost: 'bg-transparent text-fg-muted border border-transparent hover:bg-raised hover:text-fg',
  danger:
    'bg-critical text-void border border-critical hover:bg-critical/85 hover:border-critical/85 shadow-panel',
  outline:
    'bg-transparent text-fg border border-line-strong hover:bg-raised hover:border-brand/50',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-control',
  md: 'h-9 px-4 text-body rounded-control',
  lg: 'h-11 px-5 text-lead rounded-control',
}

const GAP: Record<ButtonSize, string> = { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2' }

const BASE =
  'relative inline-flex items-center justify-center font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-45'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Disables the button and shows a spinner without changing its width. */
  loading?: boolean
  /** Rendered before the label. Purely decorative — the label carries meaning. */
  icon?: ReactNode
  /** Stretches to the container. Use for a single action in a narrow column. */
  block?: boolean
  /**
   * Render onto the child element instead of a `<button>` — for wrapping a
   * router `<Link>`. `loading` is ignored: a navigation has no pending state.
   */
  asChild?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  asChild = false,
  className,
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(BASE, VARIANT[variant], SIZE[size], block && 'w-full', className)

  if (asChild) {
    return (
      <Slot className={classes} {...rest}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={size === 'lg' ? 18 : 15} />
        </span>
      )}
      <span className={cn('inline-flex items-center', GAP[size], loading && 'opacity-0')}>
        {icon}
        {children}
      </span>
    </button>
  )
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 rounded-control',
  md: 'h-9 w-9 rounded-control',
  lg: 'h-11 w-11 rounded-control',
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /**
   * Required, and not optional by oversight: an icon-only control is invisible
   * to a screen reader without it. It becomes both `aria-label` and the native
   * hover tooltip.
   */
  label: string
  children: ReactNode
}

/** A square button whose only content is an icon. */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  label,
  className,
  disabled,
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANT[variant], ICON_SIZE[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 15} /> : children}
    </button>
  )
}
