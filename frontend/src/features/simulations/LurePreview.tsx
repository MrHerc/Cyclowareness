/**
 * The lure, shown exactly as it was stored.
 *
 * Rendered through `CodeBlock` on purpose: the preview is frequently a real
 * phishing body carrying a real hostile URL, and `CodeBlock` is the one surface
 * in this product guaranteed never to linkify or re-wrap what it is given. An
 * analyst has to be able to read a lure without the UI turning it into
 * something clickable.
 *
 * It is also the "look before you create it" control in the campaign dialog: a
 * campaign whose lure nobody read before launch is how a simulation ends up
 * being escalated as a genuine incident.
 */

import { Link } from 'react-router-dom'
import { Badge, CodeBlock } from '../../components/ui'
import { channelLabel } from '../../lib/format'

export interface LurePreviewProps {
  /** The stored `lure_preview`, or a candidate one while composing. */
  value: string
  channel: string | null
  /** What produced it: a template name, or the threat's title. */
  sourceLabel: string
  /** Where that source lives, when it is a record with a page of its own. */
  sourceHref?: string
  /** Shown instead of the block when there is nothing to preview. */
  emptyMessage?: string
  className?: string
}

export function LurePreview({
  value,
  channel,
  sourceLabel,
  sourceHref,
  emptyMessage = 'No lure text was stored for this campaign.',
  className,
}: LurePreviewProps) {
  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge tone="neutral">{channelLabel(channel)}</Badge>
        <span className="text-sm text-fg-subtle">Lure source</span>
        {sourceHref ? (
          <Link to={sourceHref} className="text-sm text-brand hover:underline">
            {sourceLabel}
          </Link>
        ) : (
          <span className="text-sm text-fg">{sourceLabel}</span>
        )}
      </div>

      {value.trim() ? (
        <CodeBlock value={value} label="Lure as stored" copyable wrap maxHeight="16rem" />
      ) : (
        <p className="text-sm text-fg-faint">{emptyMessage}</p>
      )}
    </div>
  )
}
