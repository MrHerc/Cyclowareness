/**
 * One sentence about what a run still needs, read off the run itself.
 *
 * This is deliberately not called a recommendation. It states what the record
 * shows is outstanding — an undecided gate, open assignments, a failed stage —
 * and nothing else. A screen that dressed a derived sentence as a model's advice
 * would be claiming an intelligence the product does not have here.
 */

import type { LoopRunDetail } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { stageLabel } from '../filters'

const OPEN_STATUSES = new Set(['assigned', 'in_progress'])

export function nextActionFor(run: LoopRunDetail): string {
  if (run.status === 'failed') {
    const failure = run.stage_history.find((entry) => entry.status === 'failed')
    const where = failure ? stageLabel(failure.stage) : stageLabel(run.current_stage)
    return failure?.error
      ? `The run failed at ${where}: ${failure.error} Nothing advances from here — a new run has to be started from the threat.`
      : `The run failed at ${where}. No error text was recorded, and nothing advances from here.`
  }

  if (run.status === 'awaiting_approval') {
    return 'A human decision at the approval gate. No employee is targeted or assigned anything until one is given.'
  }

  if (run.status === 'awaiting_training') {
    const open = run.assignments.filter((assignment) => OPEN_STATUSES.has(assignment.status))
    return `${open.length} of ${run.assignments.length} assignment${
      run.assignments.length === 1 ? '' : 's'
    } ${open.length === 1 ? 'is' : 'are'} still open. The run measures itself when the last one lands, or when an analyst forces measurement early.`
  }

  if (run.status === 'running') {
    const stage = STAGES.find((s) => s.n === run.current_stage)
    return `${stage ? stage.label : `Stage ${run.current_stage}`} is in progress. Nothing is required from a person while it runs.`
  }

  // completed
  const summary = run.measure_summary
  if (!summary) {
    return 'The run closed without a measurement. A benign verdict closes the loop at conversion, because there is nothing to train anyone on.'
  }
  const missed = summary.assigned - summary.completed
  if (missed > 0) {
    return `Closed. ${missed} of ${summary.assigned} ${
      missed === 1 ? 'person' : 'people'
    } did not complete the training — each of those is recorded as ignored training and raised that person's risk score, which is what the next run's targeting will select on.`
  }
  return 'Closed. Every assignment was completed, and the measured results have already been folded into the risk scores the next run will target on.'
}
