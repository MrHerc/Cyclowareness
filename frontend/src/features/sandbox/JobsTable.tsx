/**
 * The submission queue.
 *
 * Two honesty details carry this table.
 *
 * - **A job that has not been scored shows no score.** `final_score` and
 *   `risk_level` are column defaults until the scoring stage writes them, so a
 *   queued sample would otherwise read as "Low · 0" — the most flattering
 *   possible lie about a file nobody has looked at yet.
 *
 * - **A running job shows the stage it is in.** The engine writes `stage` as it
 *   moves (identify, unpack, static analysis, scoring), and a scan bar under the
 *   status makes the difference between "working" and "stuck" visible.
 */

import { Link, useNavigate } from 'react-router-dom'
import type { SandboxJobSummary } from '../../domain/types'
import { NoMeasurement } from '../../components/data'
import {
  Badge,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import { humanise, num, timeAgo } from '../../lib/format'
import { isScored, sampleLabel } from './shared'

export interface JobsTableProps {
  jobs: SandboxJobSummary[]
}

const MOVING = new Set(['queued', 'running'])

const VERDICT_TONE: Record<string, string> = {
  malicious: 'text-critical',
  suspicious: 'text-high',
  clean: 'text-safe',
}

function StageBar({ stage }: { stage: string }) {
  return (
    <div className="mt-1.5 max-w-40">
      <p className="text-xs text-fg-faint">{stage ? humanise(stage) : 'Waiting for a worker'}</p>
      <div
        aria-hidden="true"
        className="scan relative mt-1 h-0.5 overflow-hidden rounded-chip bg-raised"
      />
    </div>
  )
}

export function JobsTable({ jobs }: JobsTableProps) {
  const navigate = useNavigate()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sample</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Verdict</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead numeric>Score</TableHead>
          <TableHead numeric>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const scored = isScored(job)
          const moving = MOVING.has(job.status)
          // `null` from the queue endpoint, `{}` from the detail one — both mean
          // "not classified yet". `verdict` in it is what tells an answer apart.
          const answer = job.verdict && 'verdict' in job.verdict ? job.verdict : null

          return (
            <TableRow
              key={job.public_id}
              interactive
              // The row click is a mouse convenience layered over the real link
              // in the first cell — which is what keyboard and screen-reader
              // users actually navigate with.
              onClick={() => navigate(`/sandbox/${job.public_id}`)}
            >
              <TableCell className="max-w-[22rem]">
                <Link
                  to={`/sandbox/${job.public_id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="block truncate text-fg hover:text-brand"
                >
                  {sampleLabel(job)}
                </Link>
                <p className="tech truncate text-fg-faint">{job.sha256.slice(0, 24)}…</p>
              </TableCell>

              <TableCell>
                <span className="text-fg-muted">{humanise(job.family)}</span>
                <p className="tech truncate text-fg-faint">{job.mime || 'unknown'}</p>
              </TableCell>

              <TableCell>
                <StatusDot status={job.status} />
                {moving ? <StageBar stage={job.stage} /> : null}
              </TableCell>

              <TableCell>
                {/* The engine's answer, not a restatement of the score. A job
                    can score 27 and still be classified suspicious, and the two
                    columns disagreeing is information, not a bug. */}
                {answer ? (
                  <>
                    <span className={VERDICT_TONE[answer.verdict] ?? 'text-fg'}>
                      {humanise(answer.verdict)}
                    </span>
                    {answer.threat_name ? (
                      <p className="tech truncate text-fg-faint" title={answer.threat_name}>
                        {answer.threat_name}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <NoMeasurement
                    label="Not classified"
                    reason="The engine has not reached a verdict for this job yet."
                  />
                )}
              </TableCell>

              <TableCell>
                {scored ? (
                  <Badge status={job.risk_level} size="sm" />
                ) : (
                  <NoMeasurement
                    label="Not scored"
                    reason="Scoring has not run for this job yet, so it has no risk level."
                  />
                )}
              </TableCell>

              <TableCell numeric>
                {scored ? (
                  <Tooltip content="Out of 100.">
                    <span>{num(job.final_score, 0)}</span>
                  </Tooltip>
                ) : (
                  <span className="text-fg-faint">—</span>
                )}
              </TableCell>

              <TableCell numeric>
                <span className="text-fg-muted">{timeAgo(job.created_at)}</span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
