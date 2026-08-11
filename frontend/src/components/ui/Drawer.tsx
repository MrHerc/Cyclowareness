/**
 * A side sheet — the same modal contract as <Dialog>, anchored to an edge.
 *
 * It exists for detail that needs room without losing the list behind it: an
 * approval alongside the queue, a sandbox signal alongside the report. Same
 * required `title`, same Radix focus trap; only the geometry differs.
 */

import * as RadixDialog from '@radix-ui/react-dialog'
import { useT } from '../../lib/i18n'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { IconButton } from './Button'

export type DrawerSide = 'right' | 'left'
export type DrawerSize = 'sm' | 'md' | 'lg'

const SIZE: Record<DrawerSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export interface DrawerProps {
  /** Required: it is the sheet's accessible name. */
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  footer?: ReactNode
  side?: DrawerSide
  size?: DrawerSize
  className?: string
  children?: ReactNode
}

export function Drawer({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  footer,
  side = 'right',
  size = 'md',
  className,
  children,
}: DrawerProps) {
  const t = useT()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'rise fixed inset-y-0 z-50 flex w-full flex-col bg-surface shadow-float',
            side === 'right' ? 'right-0 border-l border-line' : 'left-0 border-r border-line',
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
