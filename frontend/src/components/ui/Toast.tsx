/**
 * The toast provider and its viewport.
 *
 * Three deliberate behaviours:
 *
 * - **Errors are `role="alert"`; everything else is `role="status"`.** An alert
 *   interrupts a screen reader, which is right for a failed approval and wrong
 *   for "copied". Getting this backwards makes the product either shouty or
 *   silent at exactly the wrong moment.
 * - **Errors last longer and stay dismissible.** A failure message the user
 *   blinked past is a support ticket.
 * - **The stack is capped.** A polling screen that fails repeatedly would
 *   otherwise paper over itself; only the newest few are kept.
 */

import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/format'
import { IconButton } from './Button'
import { TONE_DOT, type StatusTone } from './status'
import {
  ToastContext,
  type ToastApi,
  type ToastOptions,
  type ToastRecord,
  type ToastTone,
} from './toast-store'

const MAX_VISIBLE = 4

const TONE_MAP: Record<ToastTone, StatusTone> = {
  info: 'brand',
  success: 'safe',
  warning: 'high',
  error: 'critical',
}

const DEFAULT_DURATION: Record<ToastTone, number> = {
  info: 5000,
  success: 4000,
  warning: 7000,
  error: 9000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const tone = options.tone ?? 'info'
      const record: ToastRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: options.title,
        description: options.description,
        tone,
        duration: options.duration ?? DEFAULT_DURATION[tone],
      }
      setToasts((current) => [...current, record].slice(-MAX_VISIBLE))
      timers.current.set(
        record.id,
        setTimeout(() => dismiss(record.id), record.duration),
      )
      return record.id
    },
    [dismiss],
  )

  // Unmounting with timers outstanding would fire setState on a dead provider.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* TWO regions, both mounted for the whole life of the application, and
          the message inserted INTO one of them. They used to carry no live
          attributes at all — those sat on the card, which is created at the
          moment of the announcement, and a live region that does not exist
          before its content changes is unreliably announced. `SandboxDetail`
          states this rule about itself in a comment: "A region that unmounts at
          the moment of the announcement announces nothing."

          Split by urgency because one region cannot be both: an error must
          interrupt (`assertive`), and a confirmation must not (`polite`). */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
          {toasts
            .filter((toast) => toast.tone === 'error')
            .map((toast) => (
              <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
        </div>
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {toasts
            .filter((toast) => toast.tone !== 'error')
            .map((toast) => (
              <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'rise glass pointer-events-auto flex items-start gap-3 rounded-panel border border-line',
        'px-4 py-3 shadow-float',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[TONE_MAP[toast.tone]])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-fg">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-fg-muted">{toast.description}</p>
        )}
      </div>
      <IconButton
        label="Dismiss"
        size="sm"
        variant="ghost"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1"
      >
        <X size={14} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
