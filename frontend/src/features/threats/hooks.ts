/**
 * The two things the intake screens need that `lib/api` does not already hold.
 *
 * `usePushFeedItemToLoop` is a write hook with no entry in `mutations.ts`; the
 * endpoint exists (`endpoints.feed.pushToLoop`) and it invalidates exactly what
 * a new loop run touches, in the same style as its neighbours there.
 *
 * `useReportForThreat` exists because the platform API has no threat → loop-run
 * index. A human-sensor report keeps `linked_threat_id` and `linked_loop_run_id`
 * side by side, so the report list is the one honest route from an artifact back
 * to the run it started. For a feed or analyst-submitted artifact there is no
 * such record, and the caller is expected to say so rather than guess.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { qk, useReports } from '../../lib/api/queries'
import type { Report } from '../../domain/types'

export function usePushFeedItemToLoop() {
  const qc = useQueryClient()
  return useMutation<{ loop_run_id: number }, ApiError, number>({
    mutationFn: (id) => api.post<{ loop_run_id: number }>(endpoints.feed.pushToLoop(id)),
    onSuccess: () => {
      // One push creates a Threat and a LoopRun, and flips `pushed_to_loop` on
      // the feed row. All four surfaces are wrong until they refetch.
      qc.invalidateQueries({ queryKey: qk.feed.list() })
      qc.invalidateQueries({ queryKey: qk.threats.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
  })
}

export interface ThreatOrigin {
  /** The report this artifact came from, when the artifact came from a person. */
  report: Report | null
  /** The run this artifact started, when a record links the two. */
  loopRunId: number | null
  isLoading: boolean
}

/**
 * Resolves an artifact back to the human report and the loop run behind it.
 *
 * Reads the existing reports cache, so opening a threat after visiting the
 * intake queue costs nothing. The list the server returns is capped at 100, so
 * a null result means "no link is visible from here", never "no link exists" —
 * which is why the caller words it that way.
 */
export function useReportForThreat(threatId: number | undefined): ThreatOrigin {
  const reports = useReports()
  const report =
    threatId === undefined
      ? null
      : (reports.data ?? []).find((item) => item.linked_threat_id === threatId) ?? null

  return {
    report,
    loopRunId: report?.linked_loop_run_id ?? null,
    isLoading: reports.isLoading,
  }
}
