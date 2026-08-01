/**
 * The approval thread for one run.
 *
 * `GET /api/approvals/{id}/history` exists and is the authoritative record —
 * it reads straight out of `audit_events`, so there is no second store of
 * approval comments to fall out of step with the trail. There is no hook for it
 * in `lib/api/queries.ts`, and that file is frozen, so the query is assembled
 * here from the same foundation pieces every other hook uses: the shared client,
 * the endpoint table and the `qk.approvals.history` key that was already
 * reserved for it.
 */

import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { qk, POLL_QUEUE } from '../../lib/api/queries'
import { adaptHistory, type HistoryEntry } from './contract'

export function useApprovalHistory(runId: string | number | undefined) {
  return useQuery<HistoryEntry[], ApiError>({
    queryKey: qk.approvals.history(runId ?? 'none'),
    queryFn: async () => adaptHistory(await api.get<unknown>(endpoints.approvals.history(runId!))),
    enabled: runId !== undefined && runId !== null && runId !== '',
    // Someone else may endorse or comment on this run while it is open on screen.
    refetchInterval: POLL_QUEUE,
  })
}
