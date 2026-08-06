/**
 * The score, made derivable.
 *
 * The engine defines a person's score as `baseline + Σ(non-revoked event
 * deltas)`, and this panel is the claim that the number above it is exactly
 * that. So it does two things a normal breakdown table does not: it prints the
 * arithmetic as a line someone can check on paper, and it adds the
 * contributions up itself and compares the total against the score the server
 * sent. When those disagree the panel says so rather than showing the tidy
 * version — a reconciliation that only ever succeeds is not a reconciliation.
 */

import { useT } from '../../lib/i18n'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import type { EmployeeDetail } from '../../domain/types'
import { cn, humanise, num, signed } from '../../lib/format'
import { baselineFor, breakdownTotal, signalFor } from './riskModel'

/** Anything under this is rounding in the last decimal, not a disagreement. */
const RECONCILES_WITHIN = 0.15

export interface RiskDerivationProps {
  employee: EmployeeDetail
}

function contributionTone(factor: string, contribution: number): string {
  if (factor === 'baseline_role_sensitivity') return 'text-fg'
  if (contribution > 0) return 'text-critical'
  if (contribution < 0) return 'text-safe'
  return 'text-fg-muted'
}

export function RiskDerivation({ employee }: RiskDerivationProps) {
  const t = useT()
  const breakdown = employee.risk_breakdown ?? []
  const baseline = baselineFor(employee.role_sensitivity)
  const total = breakdownTotal(breakdown)
  const behaviour = Math.round((total - baseline) * 10) / 10
  const difference = Math.round((total - employee.current_risk_score) * 10) / 10
  const reconciles = Math.abs(difference) <= RECONCILES_WITHIN

  const widest = breakdown.reduce((max, factor) => Math.max(max, Math.abs(factor.contribution)), 0)

  return (
    <div className="space-y-4">
      <p className="text-body text-fg-muted">{t('p.this-score-is-not-asserted-it')}</p>

      <p className="tech rounded-control border border-line-subtle bg-base px-3 py-2.5 text-fg">
        20 + {num(employee.role_sensitivity, 1)} × 20 = {num(baseline, 1)}
        {'  ·  '}baseline {num(baseline, 1)} {behaviour < 0 ? '−' : '+'} {num(Math.abs(behaviour), 1)}{' '}
        recorded = {num(total, 1)}
      </p>

      {reconciles ? (
        <p className="text-sm text-fg-subtle">
          That total matches the score the engine holds for this person ({num(employee.current_risk_score, 1)}).
        </p>
      ) : (
        <p role="alert" className="text-sm text-high">
          These contributions add up to {num(total, 1)}, but the engine holds{' '}
          {num(employee.current_risk_score, 1)} — a difference of {signed(difference, 1)}. That happens
          when the score was clamped at 0 or 100, or when events were withdrawn after the score was
          last recomputed. The engine’s value is the one used for targeting.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Factor</TableHead>
            <TableHead numeric>Events</TableHead>
            <TableHead numeric>Contribution</TableHead>
            <TableHead>Share of the score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakdown.map((factor) => {
            const spec = signalFor(factor.factor)
            const width = widest > 0 ? (Math.abs(factor.contribution) / widest) * 100 : 0
            return (
              <TableRow key={factor.factor}>
                <TableCell className="max-w-80">
                  <span className="block text-fg">{spec?.label ?? factor.label ?? humanise(factor.factor)}</span>
                  {spec ? <span className="block text-xs text-fg-subtle">{spec.meaning}</span> : null}
                </TableCell>
                <TableCell numeric>
                  {factor.factor === 'baseline_role_sensitivity' ? (
                    <Tooltip content="The baseline is not an event. It is where the score starts.">
                      <span className="text-fg-faint">—</span>
                    </Tooltip>
                  ) : (
                    factor.events
                  )}
                </TableCell>
                <TableCell numeric className={contributionTone(factor.factor, factor.contribution)}>
                  {factor.factor === 'baseline_role_sensitivity'
                    ? num(factor.contribution, 1)
                    : signed(factor.contribution, 1)}
                </TableCell>
                <TableCell>
                  <span aria-hidden="true" className="block h-1.5 w-full min-w-24 rounded-chip bg-raised">
                    <span
                      className={cn(
                        'block h-full rounded-chip',
                        factor.factor === 'baseline_role_sensitivity'
                          ? 'bg-fg-faint'
                          : factor.contribution > 0
                            ? 'bg-critical'
                            : 'bg-safe',
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                </TableCell>
              </TableRow>
            )
          })}

          <TableRow className="border-t border-line">
            <TableCell className="text-fg">Total</TableCell>
            <TableCell numeric>
              {breakdown.reduce((sum, factor) => sum + factor.events, 0)}
            </TableCell>
            <TableCell numeric className="text-fg">
              {num(total, 1)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
