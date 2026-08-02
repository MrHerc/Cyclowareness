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
  // `my_status`, NOT `status`. The latter is the investigation's lifecycle,
  // so a person who had finished and been accepted still counted as owing
  // work for as long as the investigation stayed open.
  return (
    item.my_status !== 'completed' &&
    item.my_status !== 'reviewed' &&
    item.my_status !== 'waived'
  )
}
