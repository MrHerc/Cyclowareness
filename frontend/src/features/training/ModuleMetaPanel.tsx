/**
 * Everything about a module that is not the module.
 *
 * The row that matters most is the loop run. A training module that exists
 * because a real threat reached the CONVERT stage, and that is currently
 * holding a run at the human approval gate, is the entire product argument in
 * one link — so it is rendered as a link to that gate rather than as an id.
 *
 * The gate link is only available while the run is still waiting: the approval
 * queue is the only list that joins a module to its run, and once a decision is
 * made the module record keeps no pointer back. That is stated rather than
 * papered over with a guess.
 */

import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import { Badge, Panel, Spinner } from '../../components/ui'
import { provenanceOf, type Threat, type TrainingModule } from '../../domain/types'
import { channelLabel, formatDateTime, num } from '../../lib/format'
import { PLATFORM_PASS_MARK } from './moduleDraft'

export interface ModuleMetaPanelProps {
  module: TrainingModule
  /** The threat this module was generated from, when it is still on record. */
  threat: Threat | null
  /** True while the caller is still resolving the gating run. */
  gateLoading: boolean
  /** The loop run this module is currently holding at the approval gate. */
  gateRunId: number | null
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined while unknown. */
  modelConnected: boolean | undefined
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-fg">{children}</dd>
    </div>
  )
}

export function ModuleMetaPanel({
  module,
  threat,
  gateLoading,
  gateRunId,
  modelConnected,
}: ModuleMetaPanelProps) {
  const provenance = provenanceOf(module.generation_source, {
    approved: module.status === 'approved',
  })

  return (
    <Panel title="Module record" headingLevel={2}>
      <dl className="divide-y divide-line-subtle">
        <Row label="Review state">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={module.status} dot />
            {module.approved_by ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                {module.approved_by}
              </span>
            ) : (
              <span className="text-sm text-fg-faint">No approver recorded</span>
            )}
          </div>
        </Row>

        <Row label="Provenance">
          <div className="flex flex-wrap items-center gap-2">
            <AIProvenanceBadge
              provenance={provenance}
              generationSource={module.generation_source}
              modelConnected={modelConnected}
            />
            <span className="text-xs text-fg-faint">
              Recorded for the module as a whole — the API carries no per-block source, so every
              section and question below inherits this.
            </span>
          </div>
        </Row>

        <Row label="Generated from">
          {module.threat_id === null ? (
            <span className="text-fg-faint">
              No threat is linked. This module was not produced by a loop run.
            </span>
          ) : (
            <Link
              to={`/threats/${module.threat_id}`}
              className="inline-flex items-center gap-1.5 text-brand hover:underline"
            >
              {threat ? threat.title : `Threat #${module.threat_id}`}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          )}
        </Row>

        <Row label="Gating a loop run">
          {gateLoading ? (
            <span className="inline-flex items-center gap-2 text-fg-subtle">
              <Spinner size={13} />
              Checking the approval queue
            </span>
          ) : gateRunId !== null ? (
            <Link
              to={`/approvals/${gateRunId}`}
              className="inline-flex items-center gap-1.5 text-brand hover:underline"
            >
              Run {gateRunId} is waiting on this module at the approval gate
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-fg-faint">
              No run is waiting on this module. Once a gate decision is made the module keeps no
              pointer back to its run, so this can only be shown while a run is still queued.
            </span>
          )}
        </Row>

        <Row label="Pass criteria">
          <span>
            {PLATFORM_PASS_MARK}% or better on the quiz.
            <span className="ml-1 text-fg-faint">
              Fixed platform-wide at grading time; the API exposes no per-module pass mark, so it
              cannot be changed here.
            </span>
          </span>
        </Row>

        <Row label="Estimated duration">
          {module.est_minutes > 0 ? (
            `${num(module.est_minutes)} minutes`
          ) : (
            <span className="text-fg-faint">Not recorded</span>
          )}
        </Row>

        <Row label="Channel">{channelLabel(module.channel)}</Row>

        <Row label="Created">{formatDateTime(module.created_at)}</Row>
      </dl>
    </Panel>
  )
}
