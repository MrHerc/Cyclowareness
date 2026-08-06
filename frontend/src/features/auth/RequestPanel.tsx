/**
 * The result of a request this backend cannot accept.
 *
 * Registration and password reset both end here, and both end the same way: the
 * product composes the message, states plainly that it sent nothing, and hands
 * it to the person to send themselves. That is the honest shape of a missing
 * endpoint — a form that appears to submit and quietly does nothing is worse
 * than no form, because the user then waits for a reply that will never come.
 *
 * `aria-live="polite"` because the panel appears in response to something the
 * user just did, several fields above where their focus is.
 */

import { useT } from '../../lib/i18n'
import { CopyButton } from '../../components/ui'

export interface RequestPanelProps {
  /** What the person is looking at — "Account request", "Password reset request". */
  title: string
  /** The exact text placed on the clipboard. */
  body: string
  /** Who to send it to, in words. */
  routing: string
}

export function RequestPanel({ title, body, routing }: RequestPanelProps) {
  const t = useT()
  return (
    <section
      aria-live="polite"
      className="rise mt-6 rounded-panel border border-brand/25 bg-elevated p-4 shadow-panel"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h text-fg">{title}</h2>
          <p className="text-sm text-fg-muted mt-1">{t('p.nothing-was-sent-cyclowareness-has-no')}</p>
        </div>
        <CopyButton value={body} variant="secondary" size="sm">
          Copy
        </CopyButton>
      </header>

      <pre className="tech mt-3 max-h-64 overflow-auto rounded-control border border-line-subtle bg-base p-3 whitespace-pre-wrap text-fg-muted">
        {body}
      </pre>

      <p className="text-xs text-fg-faint mt-3">{routing}</p>
    </section>
  )
}
