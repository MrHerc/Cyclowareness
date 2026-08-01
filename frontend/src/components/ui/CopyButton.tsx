/**
 * Copies a value and says so.
 *
 * Two things it does that a bare `navigator.clipboard.writeText` does not:
 *
 * - **It announces the result.** The tick is invisible to a screen reader, so
 *   the outcome also goes into a polite live region. An analyst copying a hash
 *   into a ticket needs to know it landed.
 * - **It reports failure.** The Clipboard API rejects outside a secure context
 *   and when the document is not focused. Showing a tick anyway would be a
 *   quiet lie about the one thing this button exists to do.
 */

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconButton, type ButtonSize, type ButtonVariant } from './Button'

type CopyState = 'idle' | 'copied' | 'failed'

export interface CopyButtonProps {
  /** The exact text placed on the clipboard. */
  value: string
  /** Accessible label, and the tooltip. Say what is being copied. */
  label?: string
  /** Renders a labelled button instead of an icon-only one. */
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function CopyButton({
  value,
  label = 'Copy',
  children,
  variant = 'ghost',
  size = 'sm',
  className,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  const icon =
    state === 'copied' ? (
      <Check size={14} className="text-safe" aria-hidden="true" />
    ) : (
      <Copy size={14} aria-hidden="true" />
    )

  const announcement =
    state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''

  return (
    <>
      {children ? (
        <Button variant={variant} size={size} icon={icon} onClick={copy} className={className}>
          {children}
        </Button>
      ) : (
        <IconButton
          label={state === 'failed' ? 'Copy failed — try again' : label}
          variant={variant}
          size={size}
          onClick={copy}
          className={className}
        >
          {icon}
        </IconButton>
      )}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  )
}
