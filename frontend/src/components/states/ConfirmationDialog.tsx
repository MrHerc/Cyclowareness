/**
 * "Are you sure" — the honest version.
 *
 * Built on Radix Dialog with `role="alertdialog"` and outside-interaction
 * disabled, which is precisely what Radix's AlertDialog is; the standalone
 * package is not in this project's dependency list, and adding one to obtain
 * two attributes is not a trade worth making. Everything that matters comes
 * from Radix either way: the focus trap, the focus restore on close, Escape
 * handling, the labelled/described wiring and inert background content.
 *
 * Two behaviours worth knowing about:
 *
 * - **`requireTyped` is for actions that cannot be undone.** Resetting the demo
 *   world an hour before a keynote should take more than a reflex click on a
 *   red button, so the confirm control stays disabled until the exact string is
 *   typed. Use it sparingly: a confirmation people learn to type without
 *   reading is worse than no confirmation, because it manufactures consent.
 *
 * - **Confirming does not close the dialog.** The caller closes it when the
 *   mutation actually succeeds. That way `busy` can be shown truthfully, and a
 *   failure leaves the user where they were instead of dropping them back onto
 *   a page that quietly did nothing.
 */

import * as Dialog from '@radix-ui/react-dialog'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/format'
import { StateAction } from './StateAction'

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** What will happen, in one or two sentences. Say what is irreversible. */
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  /** Exact string the user must type before confirm becomes available. */
  requireTyped?: string
  onConfirm: () => void
  /** True while the action is in flight — both controls lock, nothing closes. */
  busy?: boolean
}

/**
 * A modal confirmation for an action worth pausing over.
 *
 * Controlled: the caller owns `open`, so the same dialog can be driven from a
 * row menu, a keyboard shortcut or a command palette without duplicating state.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  requireTyped,
  onConfirm,
  busy = false,
}: ConfirmationDialogProps) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // A dialog reopened after a cancel must not still hold the phrase from last
  // time — that would turn the second confirmation into a single click.
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  const armed = requireTyped === undefined || typed.trim() === requireTyped
  const danger = tone === 'danger'

  return (
    <Dialog.Root open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
        <Dialog.Content
          role="alertdialog"
          aria-busy={busy || undefined}
          className={cn(
            'rise glass fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))]',
            '-translate-x-1/2 -translate-y-1/2 rounded-panel border border-line p-6 shadow-float',
          )}
          // An alert dialog is dismissed by a deliberate choice, never by a
          // stray click on the page behind it.
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onOpenAutoFocus={(event) => {
            // Never open with focus resting on the destructive control.
            if (requireTyped !== undefined) {
              event.preventDefault()
              inputRef.current?.focus()
            } else if (danger) {
              event.preventDefault()
              cancelRef.current?.focus()
            }
          }}
        >
          <div className="flex gap-3">
            {danger ? (
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-critical"
                strokeWidth={1.5}
              />
            ) : null}
            <div className="min-w-0 space-y-2">
              <Dialog.Title className="text-h text-fg">{title}</Dialog.Title>
              <Dialog.Description className="text-body text-fg-muted">{description}</Dialog.Description>
            </div>
          </div>

          {requireTyped !== undefined ? (
            <div className="mt-5 space-y-2">
              <label htmlFor={inputId} className="block text-sm text-fg-muted">
                Type <span className="tech text-fg">{requireTyped}</span> to confirm
              </label>
              <input
                id={inputId}
                ref={inputRef}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={busy}
                autoComplete="off"
                spellCheck={false}
                className={cn(
                  'tech w-full rounded-control border border-line bg-surface px-3 py-2 text-fg',
                  'placeholder:text-fg-faint disabled:opacity-45',
                )}
                placeholder={requireTyped}
              />
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <StateAction ref={cancelRef} tone="quiet" onClick={() => onOpenChange(false)} disabled={busy}>
              {cancelLabel}
            </StateAction>
            <StateAction
              tone={danger ? 'danger' : 'primary'}
              onClick={onConfirm}
              disabled={!armed || busy}
              icon={
                busy ? <span className="pulse-soft size-1.5 rounded-full bg-current" /> : undefined
              }
            >
              {confirmLabel}
            </StateAction>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
