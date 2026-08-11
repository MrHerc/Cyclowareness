/**
 * A modal, composed rather than assembled.
 *
 * `title` is a required prop and not an optional child, which is the whole
 * reason this wraps Radix instead of re-exporting it: a dialog without an
 * accessible name is announced as "dialog" and nothing else, and that is the
 * single most common way a hand-built modal fails a screen reader. Radix gives
 * the focus trap, the escape handler, the scroll lock and the return of focus
 * to the trigger.
 *
 * The footer is where the confirm/cancel pair goes. It is separated by a
 * hairline so a destructive button is never mistaken for body content.
 */

import * as RadixDialog from '@radix-ui/react-dialog'
import { useT } from '../../lib/i18n'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { IconButton } from './Button'

export type DialogSize = 'sm' | 'md' | 'lg'

const SIZE: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

export interface DialogProps {
  /** Required: it is the dialog's accessible name. */
  title: string
  /** One sentence of context. Becomes the dialog's accessible description. */
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Wrapped in <DialogTrigger asChild>. Omit when controlling `open`. */
  trigger?: ReactNode
  footer?: ReactNode
  size?: DialogSize
  className?: string
  children?: ReactNode
}

export function Dialog({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  footer,
  size = 'md',
  className,
  children,
}: DialogProps) {
  const t = useT()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
        <RadixDialog.Content
          // Radix points its default `aria-describedby` at a description that
          // does not exist unless one is rendered. Clearing it is the documented
          // opt-out and beats shipping an empty <Description> to quiet a warning.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'rise fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[calc(100vh-4rem)] flex-col rounded-panel border border-line bg-surface shadow-float',
            SIZE[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-h text-fg">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-fg-subtle">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label={t('u.close')} size="sm" variant="ghost">
                <X size={16} aria-hidden="true" />
              </IconButton>
            </RadixDialog.Close>
          </div>

          {children !== undefined && (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-body text-fg-muted">
              {children}
            </div>
          )}

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-line-subtle px-5 py-3">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
