/**
 * One fact about the deployment or the account.
 *
 * A definition row rather than a styled div pair, because that is what this is:
 * a term and its value. The `detail` line carries the sentence that stops the
 * value being misread — "mock" as a provider name means template output, and a
 * settings page that prints the word without the sentence has told the reader
 * nothing they can act on.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface SettingRowProps {
  term: string
  /** The value. Use `NoMeasurement` or plain words where nothing was recorded. */
  children: ReactNode
  /** One sentence explaining what the value means. */
  detail?: string
  className?: string
}

export function SettingRow({ term, children, detail, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        'grid gap-1 border-b border-line-subtle py-3 last:border-b-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-4',
        className,
      )}
    >
      <dt className="text-sm text-fg-subtle">{term}</dt>
      <dd className="min-w-0 space-y-1">
        <div className="text-body text-fg">{children}</div>
        {detail ? <p className="text-xs text-fg-subtle">{detail}</p> : null}
      </dd>
    </div>
  )
}
