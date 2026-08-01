/**
 * Raw artifact text — headers, log lines, YARA matches, extracted strings.
 *
 * The rule this component enforces: **nothing in here is ever turned into a
 * link, and nothing is ever re-wrapped for looks.** The content is frequently a
 * live malicious URL, and a clickable one inside an analyst tool is a real
 * incident, not a styling detail. The value is rendered as a single text node,
 * so no autolinker can ever be introduced by accident.
 *
 * It also never highlights syntax. Colour in this product means severity; a
 * green string literal inside a suspicious script would say "safe".
 */

import { cn } from '../../lib/format'
import { CopyButton } from './CopyButton'

export interface CodeBlockProps {
  /** Rendered verbatim. Never linkified, never sanitised — display only. */
  value: string
  /** A caption above the block: "Response headers", "Detonation log". */
  label?: string
  /** Adds a copy control to the header. Requires `label` to have a home. */
  copyable?: boolean
  /** Soft-wraps long lines instead of scrolling horizontally. */
  wrap?: boolean
  /** Caps the height; the block scrolls beyond it. Default 20rem. */
  maxHeight?: string
  className?: string
}

export function CodeBlock({
  value,
  label,
  copyable = false,
  wrap = false,
  maxHeight = '20rem',
  className,
}: CodeBlockProps) {
  return (
    <div className={cn('overflow-hidden rounded-control border border-line bg-void', className)}>
      {(label || copyable) && (
        <div className="flex items-center justify-between gap-2 border-b border-line-subtle px-3 py-1.5">
          <span className="label truncate text-fg-faint">{label}</span>
          {copyable && <CopyButton value={value} label={`Copy ${label ?? 'contents'}`} />}
        </div>
      )}
      <pre
        className={cn(
          'tech overflow-auto px-3 py-2.5 text-fg-muted',
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
        )}
        style={{ maxHeight }}
        tabIndex={0}
      >
        <code>{value}</code>
      </pre>
    </div>
  )
}
