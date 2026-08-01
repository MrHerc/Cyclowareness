/**
 * One evidence pack, described honestly.
 *
 * The card leads with the coverage claim — the range and the number of records
 * behind it — because that is the part a reader can check, and it is counted
 * from the same API the pack would be built from. The capability statement sits
 * below it in its own frame so it cannot be skimmed past, and the only control
 * on the card goes to the screen that holds those records today. A disabled
 * "Generate" button would be a promise; a link is a fact.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, Ban } from 'lucide-react'
import { SampleSizeLabel } from '../../components/data'
import { formatRangeLabel, type DateRangeValue } from '../../components/data/dateRange'
import { Button, Panel } from '../../components/ui'
import type { ReportType } from './catalogue'

export interface ReportTypeCardProps {
  type: ReportType
  /**
   * Records that would go into the pack, counted from live rows. `null` while
   * the count is still loading or its query failed — never rendered as 0.
   */
  sample: number | null
  /** True when this role may not read the underlying records at all. */
  blocked?: boolean
  range: DateRangeValue
}

export function ReportTypeCard({ type, sample, blocked = false, range }: ReportTypeCardProps) {
  const Icon = type.icon
  const coverage =
    type.scoping === 'range'
      ? formatRangeLabel(range.from, range.to)
      : 'Point in time — today’s stored scores'

  return (
    <Panel headingLevel={3} className="flex h-full flex-col">
      <div className="flex min-h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control border border-line-subtle bg-elevated"
          >
            <Icon className="size-4 text-fg-subtle" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="text-h text-fg">{type.title}</h3>
            <p className="mt-1 text-body text-fg-muted">{type.purpose}</p>
          </div>
        </div>

        <div>
          <p className="label text-fg-faint">What it contains</p>
          <ul className="mt-2 space-y-1.5">
            {type.contains.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-fg-muted">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-fg-faint" />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-control border border-line-subtle bg-base px-3 py-2.5">
          <p className="label text-fg-faint">Coverage</p>
          <p className="mt-1 text-sm text-fg">{coverage}</p>
          <p className="mt-1">
            {blocked ? (
              <span className="text-xs text-fg-faint">
                Your role cannot read these records, so the coverage is not counted here.
              </span>
            ) : sample === null ? (
              <span className="text-xs text-fg-faint">
                Record count not available — the source query did not answer.
              </span>
            ) : sample === 0 ? (
              <span className="text-xs text-fg-faint">
                n=0 {type.sampleNoun}. {type.emptyHint}
              </span>
            ) : (
              <SampleSizeLabel sample={sample} noun={type.sampleNoun} />
            )}
          </p>
        </div>

        {/* The capability statement. Neutral, not a risk hue: a missing export
            route is a limit of this build, not a finding about the customer. */}
        <div className="rounded-control border border-dashed border-line-strong px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-sm text-fg">
            <Ban className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" strokeWidth={1.75} />
            This deployment cannot generate this pack
          </p>
          <p className="mt-1 text-xs text-fg-subtle">{type.missing}</p>
        </div>

        {/* Offered only where the role can actually open it. A link that
            bounces off a route guard is a dead end wearing a button. */}
        <div className="mt-auto pt-1">
          {blocked ? (
            <p className="text-xs text-fg-faint">
              {type.surface.label} is not available to your role.
            </p>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to={type.surface.to}>
                {type.surface.label}
                <ArrowRight className="size-4" aria-hidden="true" strokeWidth={1.75} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )
}
