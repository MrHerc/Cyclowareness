/**
 * The finding→training pipeline, the GRC watcher and the Cyber AI — one API
 * seam, because the three arrived together and share a vocabulary.
 *
 * Kept as a feature-local module rather than swelling `queries.ts`/
 * `mutations.ts`: those files are the CORE contract every page reads, and this
 * seam has exactly three consumer surfaces. The rules still apply — every URL
 * comes from `endpoints`, every mutation composes its invalidation through the
 * same shape as `merge()` (a caller's own onSuccess must never silently
 * replace cache invalidation).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { api, type ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { qk } from '../../lib/api/queries'

/* --- shapes, mirroring backend/app/schemas.py ----------------------------- */

export interface AutoTrainResource {
  id: number
  provider: string
  title: string
  url: string
  duration_seconds: number | null
}

export interface AutoTrainOutcomeRow {
  employee_id: number
  name?: string
  assignment_id?: number
  reason?: string
}

export interface AutoTrainResult {
  path: 'assigned' | 'generated_awaiting_approval'
  topic: string
  module_id: number
  module_title: string
  module_status: string
  generation_source: string
  assigned: AutoTrainOutcomeRow[]
  skipped: AutoTrainOutcomeRow[]
  resources: AutoTrainResource[]
  note: string
}

export interface ModuleReviewResult {
  module: { id: number; title: string; status: string }
  assigned: AutoTrainOutcomeRow[]
  skipped: AutoTrainOutcomeRow[]
  origin_note: string
}

export interface GrcWatchMatch {
  match_id: number
  intel_item_id: number
  intel_title: string
  rule_id: number | null
  technology: string
  explanation: string
  created_at: string
  escalated_finding_id: number | null
}

export interface GrcWatchStatus {
  enabled: boolean
  interval_seconds: number
  /** null until the first scan has completed — "has not run", never zeroes. */
  last_scan: {
    ran_at: string
    rules_watched: number
    items_scanned: number
    new_matches: unknown[]
  } | null
  recent_matches: GrcWatchMatch[]
}

export interface AssistantSource {
  kind: 'guide' | 'preventive' | 'asset' | 'role'
  title: string
}

export interface AssistantReply {
  answer: string
  sources: AssistantSource[]
  generated_by: 'anthropic' | 'knowledge-base'
  disclaimer: string
}

/* --- hooks ---------------------------------------------------------------- */

type Opts<TData, TVars> = Omit<
  UseMutationOptions<TData, ApiError, TVars>,
  'mutationFn' | 'mutationKey'
>

function withInvalidation<TData, TVars>(
  invalidate: (data: TData, vars: TVars) => void,
  opts: Opts<TData, TVars> | undefined,
): Opts<TData, TVars> {
  return {
    ...opts,
    onSuccess: (...args: [TData, TVars, ...unknown[]]) => {
      invalidate(args[0], args[1])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(opts?.onSuccess as any)?.(...args)
    },
  }
}

export function useAutoTrainFinding(opts?: Opts<AutoTrainResult, number>) {
  const qc = useQueryClient()
  return useMutation<AutoTrainResult, ApiError, number>({
    mutationFn: (findingId) => api.post<AutoTrainResult>(endpoints.policy.autoTrain(findingId)),
    ...withInvalidation((_d, findingId) => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.policy.finding(findingId) })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useAutoTrainRisk(opts?: Opts<AutoTrainResult, number>) {
  const qc = useQueryClient()
  return useMutation<AutoTrainResult, ApiError, number>({
    mutationFn: (riskId) => api.post<AutoTrainResult>(endpoints.incidentRisks.autoTrain(riskId)),
    ...withInvalidation((_d, riskId) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(riskId) })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export interface ModuleReviewInput {
  moduleId: number
  decision: 'approve' | 'reject'
  comment?: string
}

export function useReviewModule(opts?: Opts<ModuleReviewResult, ModuleReviewInput>) {
  const qc = useQueryClient()
  return useMutation<ModuleReviewResult, ApiError, ModuleReviewInput>({
    mutationFn: ({ moduleId, decision, comment }) =>
      api.post<ModuleReviewResult>(endpoints.training.reviewModule(moduleId), {
        decision,
        comment: comment ?? '',
      }),
    ...withInvalidation(() => {
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

/** Polled gently: the background scan runs on minutes, not seconds. */
export function useGrcWatch() {
  return useQuery<GrcWatchStatus, ApiError>({
    queryKey: ['policy', 'watch'],
    queryFn: () => api.get<GrcWatchStatus>(endpoints.policy.watch()),
    refetchInterval: 60_000,
  })
}

export function useRunGrcWatch(opts?: Opts<unknown, void>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => api.post(endpoints.policy.watchRun()),
    ...withInvalidation(() => {
      qc.invalidateQueries({ queryKey: ['policy', 'watch'] })
      qc.invalidateQueries({ queryKey: qk.intel.all })
    }, opts),
  })
}

export interface AssistantChatInput {
  message: string
  locale: string
  history: { role: 'user' | 'assistant'; text: string }[]
}

export function useAssistantChat(opts?: Opts<AssistantReply, AssistantChatInput>) {
  return useMutation<AssistantReply, ApiError, AssistantChatInput>({
    mutationFn: (body) => api.post<AssistantReply>(endpoints.assistant.chat(), body),
    ...opts,
  })
}
