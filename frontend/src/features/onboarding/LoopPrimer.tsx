/**
 * The seven stages, read top to bottom, with the gate in its actual position.
 *
 * It reads from `STAGES` and `APPROVAL_GATE_AFTER_STAGE` rather than restating
 * them, so a change to the loop cannot leave the explanation of the loop behind.
 * The gate is a row in the list, between stage 3 and stage 4, because that is
 * where it is — putting it in a sidebar would teach a new user that approval is
 * an aside rather than a stop.
 *
 * `owner` comes from the same table: knowing that Analysis is the sandbox and
 * Targeting is the risk engine is most of what a newcomer needs in order to read
 * the rest of the product.
 */

import { BadgeCheck, type LucideIcon } from 'lucide-react'
import { useLocale, useT, type MessageKey } from '../../lib/i18n'
import { STAGE_ICONS } from '../../components/loop/icons'
import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'
import { cn } from '../../lib/format'

interface PrimerRow {
  key: string
  gate: boolean
  /** The stage number, or null for the gate. A gate is not a stage. */
  n: number | null
  label: MessageKey
  detail: MessageKey
  owner: MessageKey
  icon: LucideIcon
}

const ROWS: PrimerRow[] = STAGES.flatMap((stage) => {
  const row: PrimerRow = {
    key: stage.key,
    gate: false,
    n: stage.n,
    label: stage.labelKey,
    detail: stage.hintKey,
    owner: stage.ownerKey,
    icon: STAGE_ICONS[stage.key],
  }
  if (stage.n !== APPROVAL_GATE_AFTER_STAGE) return [row]
  return [
    row,
    {
      key: 'gate',
      gate: true,
      n: null,
      label: 'p.human-approval-gate',
      detail: 'p.the-loop-stops-here-a-named',
      owner: 'p.required',
      icon: BadgeCheck,
    },
  ]
})

export function LoopPrimer() {
  const t = useT()
  const { locale } = useLocale()
  return (
    <ol className="flex flex-col gap-2">
      {ROWS.map((row) => {
        const Icon = row.icon
        return (
          <li
            key={row.key}
            className={cn(
              'flex items-start gap-3 rounded-control border px-3 py-2.5',
              row.gate ? 'border-brand/30 bg-brand/5' : 'border-line-subtle bg-base',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 grid size-8 shrink-0 place-items-center rounded-control border bg-elevated',
                row.gate ? 'border-brand/40 text-brand' : 'border-line text-fg-subtle',
              )}
            >
              <Icon className="size-4" strokeWidth={1.6} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-body text-fg">
                {row.n !== null && <span className="text-fg-faint">{row.n}. </span>}
                {t(row.label)}
              </p>
              <p className={cn('text-sm', row.gate ? 'text-fg-muted' : 'text-fg-subtle')}>
                {t(row.detail)}
              </p>
            </div>

            <span
              className={cn('label mt-1.5 shrink-0', row.gate ? 'text-brand-fg' : 'text-fg-faint')}
            >
              {t(row.owner).toLocaleUpperCase(locale)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
