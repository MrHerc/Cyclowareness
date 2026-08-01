/**
 * The one line of evidence each stage shows inside the timeline.
 *
 * It returns `null` — not an empty element — for a stage that produced nothing,
 * because `LoopTimeline` draws a bordered evidence box around whatever it is
 * given, and an empty box says "there is evidence here" when there is not.
 *
 * Everything here is a summary of what the panel beside it states in full. It
 * never computes a fact the panel does not also show.
 */

import type { ReactNode } from 'react'
import type { LoopRunDetail, Provenance } from '../../../domain/types'
import { provenanceOf } from '../../../domain/types'
import { humanise, num, pct, signed } from '../../../lib/format'

const PROVENANCE_WORD: Record<Provenance, string> = {
  ai_generated: 'AI generated',
  ai_assisted: 'AI assisted',
  analyst_edited: 'Analyst edited',
  human_approved: 'Human approved',
  template: 'Template',
  imported_lms: 'Imported from an LMS',
  unknown: 'Provenance unknown',
}

export function stageEvidence(stage: number, run: LoopRunDetail): ReactNode {
  const threat = run.threat
  const module = run.training_module

  if (stage === 1 && threat) {
    return (
      <p className="text-sm text-fg-muted">
        {humanise(threat.artifact_type)} from {humanise(threat.source).toLowerCase()}
      </p>
    )
  }

  if (stage === 2 && threat?.verdict) {
    const iocs = threat.iocs ?? {}
    const count = Object.values(iocs).reduce<number>(
      (total, list) => total + (list?.length ?? 0),
      0,
    )
    return (
      <p className="text-sm text-fg-muted">
        Verdict {threat.verdict}
        {threat.confidence === null
          ? ', confidence not stated'
          : ` at ${pct(threat.confidence)} confidence`}
        {` · ${count} indicator${count === 1 ? '' : 's'}`}
      </p>
    )
  }

  if (stage === 3 && module) {
    const provenance = provenanceOf(module.generation_source, {
      approved: module.status === 'approved',
    })
    return (
      <p className="text-sm text-fg-muted">
        “{module.title}” · {PROVENANCE_WORD[provenance]}
      </p>
    )
  }

  if (stage === 4 && run.targeting.length > 0) {
    const exposed = run.targeting.filter((target) => target.exposed === true).length
    return (
      <p className="text-sm text-fg-muted">
        {run.targeting.length} selected · {exposed} actually received the artifact
      </p>
    )
  }

  if (stage === 5 && run.assignments.length > 0) {
    const done = run.assignments.filter((assignment) => assignment.status === 'completed').length
    return (
      <p className="text-sm text-fg-muted">
        {done} of {run.assignments.length} completed
      </p>
    )
  }

  if (stage === 6 && run.measure_summary) {
    const summary = run.measure_summary
    return (
      <p className="text-sm text-fg-muted">
        {summary.assigned > 0 ? pct(summary.completion_rate) : 'Not measured'} completion ·{' '}
        {summary.avg_score === null ? 'no score' : `${num(summary.avg_score, 0)}% average`} · net
        risk {signed(summary.risk_delta_total, 1)}
      </p>
    )
  }

  return null
}
