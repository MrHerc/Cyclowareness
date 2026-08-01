/**
 * The DOM ids the run page's in-page links point at.
 *
 * They live apart from the panels so the timeline can link to a stage without
 * importing the panel that renders it — and so the two sides cannot drift into
 * disagreeing about what an anchor is called.
 */

export function stageAnchor(stage: number): string {
  return `stage-${stage}`
}

export const GATE_ANCHOR = 'approval-gate'
