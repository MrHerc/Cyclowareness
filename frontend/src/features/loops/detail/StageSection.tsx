/**
 * The frame every stage panel on the run page shares.
 *
 * Each one states its own timestamps and its own data source, because "where did
 * this come from" is asked of a single stage, not of a page. A stage the run
 * never reached still renders, with the timestamps as em dashes — an absent
 * panel and an unexecuted stage would otherwise look identical.
 */

import type { ReactNode } from 'react'
import type { StageEntry } from '../../../domain/types'
import { duration, formatDateTime } from '../../../lib/format'
import { msBetween } from '../../../components/loop'
import type { LoopStageDef } from '../../../components/loop'
import { DataSourceLabel, type DataSource } from '../../../components/data'
import { Badge, Panel } from '../../../components/ui'
import { stageAnchor } from './anchors'

export interface StageSectionProps {
  stage: LoopStageDef
  entry: StageEntry | undefined
  /** Where this panel's facts come from. */
  source: DataSource
  sourceDetail: string
  actions?: ReactNode
  children: ReactNode
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  failed: 'Failed',
  pending: 'Not reached',
}

export function StageSection({
  stage,
  entry,
  source,
  sourceDetail,
  actions,
  children,
}: StageSectionProps) {
  const status = entry?.status ?? 'pending'
  const elapsed = msBetween(entry?.started_at, entry?.completed_at)

  return (
    <div id={stageAnchor(stage.n)} className="scroll-mt-20">
      <Panel
        headingLevel={2}
        title={
          <span className="flex items-center gap-2">
            <span className="tech text-fg-faint">{stage.n}</span>
            {stage.label}
          </span>
        }
        subtitle={stage.hint}
        actions={
          <Badge status={status === 'pending' ? undefined : status} size="sm">
            {STATUS_LABEL[status]}
          </Badge>
        }
        footer={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span>
              <span className="text-fg-faint">Started </span>
              {formatDateTime(entry?.started_at ?? null)}
            </span>
            <span>
              <span className="text-fg-faint">Completed </span>
              {formatDateTime(entry?.completed_at ?? null)}
            </span>
            <span>
              <span className="text-fg-faint">Took </span>
              {elapsed === null ? '—' : duration(elapsed)}
            </span>
            <span className="text-fg-faint">Owner {stage.owner}</span>
            <DataSourceLabel source={source} detail={sourceDetail} className="ml-auto" />
          </div>
        }
      >
        {entry?.error ? (
          <p
            role="alert"
            className="mb-4 rounded-control border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical"
          >
            {entry.error}
          </p>
        ) : null}

        {entry?.detail ? <p className="mb-4 text-body text-fg-muted">{entry.detail}</p> : null}

        {actions ? <div className="mb-4 flex flex-wrap items-center gap-2">{actions}</div> : null}

        {children}
      </Panel>
    </div>
  )
}
