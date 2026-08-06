/**
 * Who built this platform.
 *
 * Read from `/api/capabilities`, not written into the component. The deployment
 * is the authority on its own provenance, and a vendor name compiled into the
 * bundle would keep claiming a maker after somebody forked it.
 *
 * Deliberately NOT the same thing as the notifying entity. `entity_name` is the
 * organisation RUNNING the platform, copied verbatim onto NIS2 and DORA
 * incident records; putting the vendor there would file a regulatory
 * notification in the wrong company's name. Two fields, two meanings, and this
 * component only ever renders the first.
 *
 * Renders nothing when the capability has not arrived or the name is empty —
 * an attribution line that flickers a placeholder is worse than one that waits.
 */

import { useCapabilities } from '../../lib/api/queries'
import { cn } from '../../lib/format'

export interface MadeByProps {
  className?: string
  /** `full` for auth screens, `inline` for a settings row. */
  variant?: 'full' | 'inline'
}

export function MadeBy({ className, variant = 'full' }: MadeByProps) {
  const capabilities = useCapabilities()
  const vendor = capabilities.data?.vendor_name?.trim()

  if (!vendor) return null

  if (variant === 'inline') {
    return <span className={cn('text-fg-muted', className)}>{vendor}</span>
  }

  return (
    <p className={cn('text-xs text-fg-faint', className)}>
      Built by <span className="text-fg-subtle">{vendor}</span>
    </p>
  )
}
