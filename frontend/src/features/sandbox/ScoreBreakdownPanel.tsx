/**
 * The arithmetic behind the number.
 *
 * The model's provenance line is rendered verbatim and given its own frame,
 * because it is the sentence that stops this component being a lie: the model is
 * an expert-weighted logistic function, not something trained on a labelled
 * corpus, and nothing in this UI may describe it as a trained AI. The violet
 * hue is used here for exactly the reason it exists — machine reasoning — and
 * nowhere else on the page.
 *
 * Every feature's contribution is shown because "why is this 79 and not 40" has
 * to be answerable by hand.
 */

import type { ScoreBreakdown } from '../../domain/types'
import { Badge, Panel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import { num } from '../../lib/format'
import { featureLabel } from './shared'

export interface ScoreBreakdownPanelProps {
  breakdown: ScoreBreakdown
  ruleScore: number
  modelScore: number
  finalScore: number
}

function ContributionBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0
  return (
    <span
      aria-hidden="true"
      className="block h-1.5 rounded-chip bg-ai/70"
      style={{ width: `${width}%` }}
    />
  )
}

export function ScoreBreakdownPanel({
  breakdown,
  ruleScore,
  modelScore,
  finalScore,
}: ScoreBreakdownPanelProps) {
  const rule = breakdown.rule
  const model = breakdown.model
  const contributions = model?.contributions ?? []
  const maxContribution = contributions.reduce((max, c) => Math.max(max, Math.abs(c.contribution)), 0)

  return (
    <Panel title="Score breakdown" subtitle="Every point, traced to the thing that produced it.">
      <div className="rounded-panel border border-line-subtle bg-base p-4">
        {/* The weights come from the server's own formula string rather than
            being restated here — a UI that hardcodes 0.6 and 0.4 keeps printing
            them after the engine has changed its mind. */}
        <p className="tech text-fg-muted">{breakdown.formula}</p>
        <p className="tech mt-1 text-fg">
          rule = {num(ruleScore, 1)} · model = {num(modelScore, 1)} · final = {num(finalScore, 1)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* --- rule component ------------------------------------------------ */}
        <section>
          <h3 className="text-h text-fg">Rule component</h3>
          <p className="mt-1 text-sm text-fg-subtle">
            Severity-weighted, and saturating on purpose: twenty low-severity observations must not
            add up to one critical one, because they are not the same evidence.
          </p>
          <p className="mt-2 text-lead text-fg">
            {num(rule?.score ?? 0, 1)}{' '}
            <span className="text-sm text-fg-subtle">
              from {rule?.signal_count ?? 0} {rule?.signal_count === 1 ? 'signal' : 'signals'}
            </span>
          </p>

          {rule?.bands?.length ? (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Band</TableHead>
                  <TableHead numeric>Signals</TableHead>
                  <TableHead numeric>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rule.bands.map((band) => (
                  <TableRow key={band.severity}>
                    <TableCell>
                      <Badge status={band.severity} size="sm" />
                    </TableCell>
                    <TableCell numeric>{band.count}</TableCell>
                    <TableCell numeric>{num(band.contribution, 1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="mt-3 text-sm text-fg-faint">
              No severity band contributed — no signal above informational fired.
            </p>
          )}
        </section>

        {/* --- model component ----------------------------------------------- */}
        <section>
          <h3 className="text-h text-fg">Model component</h3>

          <div className="mt-2 rounded-panel border border-ai/30 bg-ai/5 p-3">
            <p className="label text-ai">How this model was built</p>
            <p className="mt-1.5 text-sm text-fg-muted">{model?.provenance}</p>
          </div>

          <p className="mt-3 text-lead text-fg">
            {num(model?.score ?? 0, 1)}{' '}
            <span className="text-sm text-fg-subtle">probability of malicious, as 0–100</span>
          </p>

          {contributions.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {contributions.map((contribution) => (
                <li key={contribution.feature}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-fg">{featureLabel(contribution.feature)}</span>
                    <span className="tech shrink-0 text-fg-muted">
                      {num(contribution.value, 2)} × {num(contribution.weight, 2)} ={' '}
                      {num(contribution.contribution, 2)}
                    </span>
                  </div>
                  <ContributionBar value={contribution.contribution} max={maxContribution} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-faint">
              No feature was present in this sample, so the score is the model's base rate alone.
            </p>
          )}

          <p className="tech mt-3 text-fg-faint">
            bias = {num(model?.bias ?? 0, 2)} — chosen so an all-zero feature vector reads as
            "nothing found", not as a coin flip.
          </p>
        </section>
      </div>
    </Panel>
  )
}
