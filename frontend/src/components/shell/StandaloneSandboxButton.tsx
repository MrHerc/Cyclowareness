/**
 * The door to the standalone Cyclowareness Sandbox, in the top bar.
 *
 * It sat on the Sandbox page, at the bottom, below the portal's own screens —
 * which meant the one control that leads OUT of this application was the last
 * thing on a page you had to already know to visit. So it moved here, beside
 * the other controls that cross a boundary rather than navigate within one.
 *
 * IT IS NOT A NAV ITEM, and it is not in the sidebar with them. Everything in
 * that rail changes the panel to its right. This opens a different application
 * in a different tab, and dressing it as a sixteenth destination would promise
 * a back button that does not exist. The icon says so, and so does the label.
 *
 * It renders NOTHING when no standalone is configured — read from
 * `/api/capabilities` at startup, so the row of controls does not rearrange
 * itself a beat after the header paints.
 */

import { ExternalLink, Loader2 } from 'lucide-react'
import { Tooltip, useToast } from '../ui'
import { cn } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { useAuth } from '../../lib/auth/useAuth'
import { useStandaloneDoor } from '../../features/sandbox/useStandaloneDoor'
import { useEffect, useRef } from 'react'

export interface StandaloneSandboxButtonProps {
  className?: string
}

export function StandaloneSandboxButton({ className }: StandaloneSandboxButtonProps) {
  const t = useT()
  const toast = useToast()
  const { can } = useAuth()
  const { configured, busy, error, open } = useStandaloneDoor()

  // A failure in a top bar has nowhere to render — there is no room for a
  // sentence beside a 32px control, and a red dot explains nothing. The toast
  // is the shell's own channel for "this did not work", and the ref keeps one
  // failure from announcing itself again on every unrelated re-render.
  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (!error || announced.current === error) return
    announced.current = error
    toast.show({
      tone: 'error',
      title: t('nav.sandbox.app.failed'),
      description: error,
    })
  }, [error, toast, t])

  // Same permission as the portal's own sandbox screens: whoever may not read
  // an analysis here has no business holding a session over there.
  if (!configured || !can('sandbox.view')) return null

  const label = t('nav.sandbox.app')

  return (
    <Tooltip content={t('nav.sandbox.app.hint')}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        // `aria-label` unconditionally: below `md` the text is hidden and this
        // is an icon-only control, where the accessible name is the only name.
        aria-label={label}
        className={cn(
          // `h-11` under `md`, where this is a touch target and 32px is not one.
          'inline-flex h-11 items-center gap-1.5 rounded-chip px-2.5 text-xs md:h-8',
          // FILLED, against the flat outlined pills it stands beside. Those are
          // readouts — the loop's state, the sandbox's — and this one word away
          // from them is a control that leaves the application. Dressed the
          // same they read as a third status, which is how a button ends up
          // unfindable while sitting in plain sight.
          'border border-line-strong bg-elevated font-medium whitespace-nowrap text-fg transition-colors',
          'hover:border-cta hover:bg-raised',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:pointer-events-none disabled:opacity-60',
          className,
        )}
      >
        {busy ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
        )}
        <span className="hidden md:inline">{label}</span>
      </button>
    </Tooltip>
  )
}
