/**
 * Where a number came from.
 *
 * Live measurement, sandbox output, a demonstration dataset and an external feed
 * carry very different weight, and a dashboard that renders all four in the same
 * grey type invites a buyer to trust the weakest of them as much as the
 * strongest. Nothing here uses a risk hue: provenance is not health.
 */

import { CircleHelp, FlaskConical, MonitorPlay, Radio, Rss } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/format'
import { Tip } from './Tip'

export type DataSource = 'live' | 'sandbox' | 'demo' | 'external' | 'unknown'

export interface DataSourceLabelProps {
  source: DataSource
  /** Names the specific origin — the feed, the dataset, the analyzer. */
  detail?: string
  className?: string
}

const SOURCES: Record<DataSource, { label: string; icon: LucideIcon; tone: string; tip: string }> = {
  live: {
    label: 'Live API',
    icon: Radio,
    tone: 'text-fg-muted',
    tip: 'Measured from this deployment’s own records.',
  },
  sandbox: {
    label: 'Sandbox',
    icon: FlaskConical,
    tone: 'text-fg-muted',
    tip: 'Produced by the analysis sandbox from a real artifact.',
  },
  demo: {
    label: 'Demo dataset',
    icon: MonitorPlay,
    tone: 'text-fg-subtle',
    tip: 'Demonstration data. Nothing here was measured from a live system.',
  },
  external: {
    label: 'External feed',
    icon: Rss,
    tone: 'text-fg-muted',
    tip: 'Supplied by a third party. Cyclowareness did not measure it.',
  },
  unknown: {
    label: 'Source not recorded',
    icon: CircleHelp,
    tone: 'text-fg-faint',
    tip: 'This deployment did not record where the number came from.',
  },
}

export function DataSourceLabel({ source, detail, className }: DataSourceLabelProps) {
  const spec = SOURCES[source] ?? SOURCES.unknown
  const Icon = spec.icon

  return (
    <Tip content={detail ? `${spec.tip} ${detail}` : spec.tip}>
      <span className={cn('inline-flex items-center gap-1.5 text-xs', spec.tone, className)}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {detail ? `${spec.label} · ${detail}` : spec.label}
      </span>
    </Tip>
  )
}
