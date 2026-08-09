/**
 * Where a number came from.
 *
 * Live measurement, sandbox output, a demonstration dataset and an external feed
 * carry very different weight, and a dashboard that renders all four in the same
 * grey type invites a buyer to trust the weakest of them as much as the
 * strongest. Nothing here uses a risk hue: provenance is not health.
 */

import { useT, type MessageKey } from '../../lib/i18n'
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

const SOURCES: Record<DataSource, { label: MessageKey; icon: LucideIcon; tone: string; tip: MessageKey }> = {
  live: {
    label: 'u.live-api',
    icon: Radio,
    tone: 'text-fg-muted',
    tip: 'p.measured-from-this-deployments-own-records',
  },
  sandbox: {
    label: 'y.sandbox',
    icon: FlaskConical,
    tone: 'text-fg-muted',
    tip: 'p.produced-by-the-analysis-sandbox-from',
  },
  demo: {
    label: 'u.demo-dataset',
    icon: MonitorPlay,
    tone: 'text-fg-subtle',
    tip: 'p.demonstration-data-nothing-here-was-measured',
  },
  external: {
    label: 'u.external-feed',
    icon: Rss,
    tone: 'text-fg-muted',
    tip: 'p.supplied-by-a-third-party-cyclowareness',
  },
  unknown: {
    label: 'p.source-not-recorded',
    icon: CircleHelp,
    tone: 'text-fg-faint',
    tip: 'p.this-deployment-did-not-record-where',
  },
}

export function DataSourceLabel({ source, detail, className }: DataSourceLabelProps) {
  const t = useT()
  const spec = SOURCES[source] ?? SOURCES.unknown
  const Icon = spec.icon

  return (
    <Tip content={detail ? `${t(spec.tip)} ${detail}` : t(spec.tip)}>
      <span className={cn('inline-flex items-center gap-1.5 text-xs', spec.tone, className)}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {detail ? `${t(spec.label)} · ${detail}` : t(spec.label)}
      </span>
    </Tip>
  )
}
