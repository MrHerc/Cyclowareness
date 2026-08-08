/**
 * The coefficients, and what the engine has actually done with them lately.
 *
 * Two columns that must never be confused, and are therefore labelled
 * differently in the header: the WEIGHT is a documented model constant — it was
 * chosen, not measured — while RECORDED is a count of real events in the recent
 * tail. A table that printed both in the same grey would invite a reader to
 * treat a design decision as evidence.
 */

import { Badge, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { cn, num, signed } from '../../lib/format'
import { SCORING_SIGNALS, type SignalDirection } from './riskModel'

export interface ObservedSignal {
  count: number
  total: number
}

export interface SignalWeightsTableProps {
  /** Keyed by signal id. Absent means the signal did not occur in the window. */
  observed: Map<string, ObservedSignal>
  /** How many events the observation was drawn from. */
  sample: number
}

const DIRECTION_LABEL: Record<SignalDirection, string> = {
  raises: 'Raises risk',
  lowers: 'Lowers risk',
  neutral: 'Records only',
  variable: 'Depends',
}

const DIRECTION_TONE: Record<SignalDirection, 'critical' | 'safe' | 'neutral'> = {
  raises: 'critical',
  lowers: 'safe',
  neutral: 'neutral',
  variable: 'neutral',
}

export function SignalWeightsTable({ observed, sample }: SignalWeightsTableProps) {
  const t = useT()
  return (
    <Table>
      <TableCaption>
        Weights are the engine’s constants, not measurements. The recorded column counts real events
        in the {sample} most recent the platform returned — a small window, and not a roll-up of the
        whole organisation, which the API does not expose.
      </TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead>Signal</TableHead>
          <TableHead>Effect</TableHead>
          <TableHead numeric>{t('u.weight-constant')}</TableHead>
          <TableHead numeric>{t('u.recorded-measured')}</TableHead>
          <TableHead numeric>{t('u.net-effect')}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {SCORING_SIGNALS.map((signal) => {
          const seen = observed.get(signal.key)
          return (
            <TableRow key={signal.key}>
              <TableCell className="max-w-96">
                <span className="block text-fg">{signal.label}</span>
                <span className="block text-xs text-fg-subtle">{signal.meaning}</span>
              </TableCell>

              <TableCell>
                <Badge size="sm" tone={DIRECTION_TONE[signal.direction]}>
                  {DIRECTION_LABEL[signal.direction]}
                </Badge>
              </TableCell>

              <TableCell numeric className="tech">
                {signal.weightNote ?? (signal.weight === null ? '—' : signed(signal.weight, 1))}
              </TableCell>

              <TableCell numeric className={seen ? undefined : 'text-fg-faint'}>
                {seen ? seen.count : 'None'}
              </TableCell>

              <TableCell
                numeric
                className={cn(
                  !seen && 'text-fg-faint',
                  seen && seen.total > 0 && 'text-critical',
                  seen && seen.total < 0 && 'text-safe',
                )}
              >
                {seen ? (seen.total === 0 ? num(0, 1) : signed(seen.total, 1)) : '—'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
