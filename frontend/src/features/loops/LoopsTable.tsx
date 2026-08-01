/**
 * Every run, one per row.
 *
 * The whole row is the hit area, but the only interactive element in it is a
 * real `<a>` on the run title stretched over the row with a pseudo-element.
 * A `<tr onClick>` is invisible to the keyboard and to assistive technology,
 * and a row full of nested links is a tab-stop swamp.
 */

import { Link } from 'react-router-dom'
import type { RunSummary } from '../../domain/types'
import { humanise, timeAgo, truncate } from '../../lib/format'
import { LoopStageTracker, LoopStatusBadge } from '../../components/loop'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import { stageLabel } from './filters'

export interface LoopsTableProps {
  runs: RunSummary[]
}

export function LoopsTable({ runs }: LoopsTableProps) {
  return (
    <Table containerClassName="max-h-[70vh] overflow-y-auto">
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Verdict</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead numeric>Targets</TableHead>
          <TableHead>Age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} interactive className="relative">
            <TableCell className="max-w-xs">
              <Link
                to={`/loops/${run.id}`}
                className="block text-fg after:absolute after:inset-0 hover:text-brand"
              >
                <span className="tech text-fg-faint">#{run.id}</span>{' '}
                <span className="font-medium">{truncate(run.threat_title, 70)}</span>
              </Link>
              {run.threat_type ? (
                <span className="mt-0.5 block text-xs text-fg-subtle">
                  {humanise(run.threat_type)}
                </span>
              ) : null}
            </TableCell>

            <TableCell className="text-sm">{run.source ? humanise(run.source) : '—'}</TableCell>

            <TableCell>
              {run.verdict ? (
                <Badge status={run.verdict} size="sm" />
              ) : (
                <span className="text-sm text-fg-faint">Not analysed</span>
              )}
            </TableCell>

            <TableCell>
              <LoopStageTracker currentStage={run.current_stage} status={run.status} />
            </TableCell>

            <TableCell className="whitespace-nowrap text-sm">
              {stageLabel(run.current_stage)}
            </TableCell>

            <TableCell>
              <LoopStatusBadge status={run.status} />
            </TableCell>

            <TableCell numeric>{run.targets}</TableCell>

            <TableCell className="whitespace-nowrap text-sm">{timeAgo(run.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
