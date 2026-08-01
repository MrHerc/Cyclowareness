/**
 * What still counts as owed.
 *
 * Lives apart from the panel that renders it because two screens ask the same
 * question — the obligation list, and the "what to do next" line under the risk
 * score — and two copies of this predicate would eventually disagree about
 * whether someone is finished.
 */

import type { MyIncidentRisk } from '../../domain/types'

/**
 * `failed` counts as open: falling short of the required score leaves the
 * obligation standing, and dropping it from the count would tell someone they
 * are done when an analyst is about to say otherwise.
 */
export function isIncidentWorkOpen(item: MyIncidentRisk): boolean {
  return item.status !== 'completed' && item.status !== 'reviewed' && item.status !== 'waived'
}
