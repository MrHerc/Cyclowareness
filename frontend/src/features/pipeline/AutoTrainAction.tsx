/**
 * The one-click pipeline: match the catalogue, else generate — and SHOW the
 * outcome, whichever path ran.
 *
 * The dialog is the honesty surface. "Assigned" and "generated, awaiting
 * approval" are different promises — the first says people already have work
 * in their lists, the second says NOBODY has been reached yet and names the
 * gate that will finish the job. Collapsing the two into one success toast
 * would let the button imply completions it did not make.
 */

import { useState } from 'react'
import { GraduationCap, ExternalLink } from 'lucide-react'
import { Badge, Button, Dialog } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { duration } from '../../lib/format'
import type { AutoTrainResult } from './api'

export interface AutoTrainActionProps {
  /** Fire the mutation; the caller owns which endpoint it hits. */
  onRun: () => Promise<AutoTrainResult>
  busy: boolean
  /** Why the button is disabled, shown as the title attribute. */
  disabledReason?: string
}

export function AutoTrainAction({ onRun, busy, disabledReason }: AutoTrainActionProps) {
  const t = useT()
  const [outcome, setOutcome] = useState<AutoTrainResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null)
    try {
      setOutcome(await onRun())
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc))
    }
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        icon={<GraduationCap className="size-4" />}
        loading={busy}
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onClick={() => void run()}
      >
        {t('pl.auto-train')}
      </Button>
      {error ? <p className="text-sm text-critical">{error}</p> : null}

      <Dialog
        open={outcome !== null}
        onOpenChange={(open) => {
          if (!open) setOutcome(null)
        }}
        title={
          outcome?.path === 'assigned'
            ? t('pl.training-assigned')
            : t('pl.generated-awaiting-approval')
        }
      >
        {outcome ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={outcome.path === 'assigned' ? 'safe' : 'brand'}>
                {outcome.path === 'assigned' ? t('pl.path-assigned') : t('pl.path-generated')}
              </Badge>
              <span className="text-body text-fg">{outcome.module_title}</span>
              {outcome.generation_source ? (
                <Badge tone="neutral">
                  {outcome.generation_source === 'anthropic' ? 'AI' : t('pl.template')}
                </Badge>
              ) : null}
            </div>

            <p className="text-sm text-fg-muted">{outcome.note}</p>

            {outcome.assigned.length > 0 ? (
              <div>
                <p className="label text-fg-subtle">{t('pl.assigned-to')}</p>
                <ul className="mt-1 space-y-1">
                  {outcome.assigned.map((row) => (
                    <li key={row.employee_id} className="text-sm text-fg">
                      {row.name ?? `#${row.employee_id}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {outcome.skipped.length > 0 ? (
              <div>
                <p className="label text-fg-subtle">{t('pl.skipped')}</p>
                <ul className="mt-1 space-y-1">
                  {outcome.skipped.map((row) => (
                    <li key={row.employee_id} className="text-sm text-fg-muted">
                      {row.name ?? `#${row.employee_id}`} — {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {outcome.resources.length > 0 ? (
              <div>
                <p className="label text-fg-subtle">{t('pl.supporting-resources')}</p>
                <ul className="mt-1 space-y-1.5">
                  {outcome.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-brand-fg underline-offset-4 hover:underline"
                      >
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                        {r.title}
                      </a>{' '}
                      <span className="text-xs text-fg-faint">
                        {r.provider}
                        {r.duration_seconds ? ` · ${duration(r.duration_seconds * 1000)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
