/**
 * Write hooks.
 *
 * Every mutation names exactly which caches it invalidates. That is not
 * bookkeeping: an approval changes the queue, the loop, the dashboard counts
 * and the audit trail at once, and a UI that refreshes only the screen you
 * happen to be looking at is how a demo ends up showing two contradictory
 * numbers on two tabs.
 *
 * No optimistic updates on anything that crosses the human approval gate. An
 * approval that appears to have happened and then silently did not is the one
 * failure this product cannot afford, so those mutations wait for the server.
 */

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { api, ApiError } from './client'
import { endpoints } from './endpoints'
import { qk } from './queries'
import type {
  ApprovalDecision,
  IncidentRisk,
  IntelRefreshResult,
  PolicyFinding,
  QuizResult,
  Report,
  Simulation,
  TrainingModule,
} from '../../domain/types'

type Opts<TData, TVars> = Omit<
  UseMutationOptions<TData, ApiError, TVars>,
  'mutationFn'
>

/* ============================================================================
   The approval gate — the product's most important control
   ========================================================================== */

export interface ApprovalDecisionInput {
  runId: number | string
  decision: ApprovalDecision
  comment?: string
  require_second_approval?: boolean
}

export function useApprovalDecision(opts?: Opts<unknown, ApprovalDecisionInput>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, ApprovalDecisionInput>({
    mutationFn: ({ runId, ...body }) => api.post(endpoints.approvals.decide(runId), body),
    onSuccess: (_data, vars) => {
      // An approval moves the loop, empties a queue slot, changes the dashboard
      // counts and writes an audit entry. Invalidate all four.
      qc.invalidateQueries({ queryKey: qk.approvals.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.loops.detail(vars.runId) })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
      qc.invalidateQueries({ queryKey: qk.audit.all })
      qc.invalidateQueries({ queryKey: qk.training.all })
    },
    ...opts,
  })
}

/* ============================================================================
   Loop control
   ========================================================================== */

export function useForceMeasure(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (runId) => api.post(endpoints.loops.forceMeasure(runId)),
    onSuccess: (_d, runId) => {
      qc.invalidateQueries({ queryKey: qk.loops.detail(runId) })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

/* ============================================================================
   Threat intake
   ========================================================================== */

export interface SubmitThreatInput {
  artifact_type: string
  artifact_ref: string
  title: string
  artifact_meta?: Record<string, string>
}

export function useSubmitThreat(opts?: Opts<{ loop_run_id: number }, SubmitThreatInput>) {
  const qc = useQueryClient()
  return useMutation<{ loop_run_id: number }, ApiError, SubmitThreatInput>({
    mutationFn: (body) => api.post<{ loop_run_id: number }>(endpoints.threats.create(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.threats.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

/* ============================================================================
   Human sensor reports
   ========================================================================== */

export interface SubmitReportInput {
  artifact_type: string
  artifact_ref: string
  note?: string
}

export function useSubmitReport(opts?: Opts<Report, SubmitReportInput>) {
  const qc = useQueryClient()
  return useMutation<Report, ApiError, SubmitReportInput>({
    mutationFn: (body) => api.post<Report>(endpoints.reports.create(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.employee })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

export function usePushReportToLoop(opts?: Opts<{ loop_run_id: number }, number | string>) {
  const qc = useQueryClient()
  return useMutation<{ loop_run_id: number }, ApiError, number | string>({
    mutationFn: (id) => api.post<{ loop_run_id: number }>(endpoints.reports.pushToLoop(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

export function useDismissReport(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.reports.dismiss(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

/* ============================================================================
   Training
   ========================================================================== */

export function useUpdateModule(
  opts?: Opts<TrainingModule, { id: number | string; body: Partial<TrainingModule> }>,
) {
  const qc = useQueryClient()
  return useMutation<TrainingModule, ApiError, { id: number | string; body: Partial<TrainingModule> }>({
    mutationFn: ({ id, body }) => api.patch<TrainingModule>(endpoints.training.updateModule(id), body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.training.module(vars.id) })
      qc.invalidateQueries({ queryKey: qk.approvals.all })
    },
    ...opts,
  })
}

export function useStartAssignment(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.training.start(id)),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: qk.training.assignment(id) })
      qc.invalidateQueries({ queryKey: qk.training.mine() })
    },
    ...opts,
  })
}

export interface CompleteQuizInput {
  id: number | string
  answers: number[]
  time_spent_seconds: number
}

export function useCompleteAssignment(opts?: Opts<QuizResult, CompleteQuizInput>) {
  const qc = useQueryClient()
  return useMutation<QuizResult, ApiError, CompleteQuizInput>({
    mutationFn: ({ id, ...body }) => api.post<QuizResult>(endpoints.training.complete(id), body),
    onSuccess: (_d, vars) => {
      // Completing training moves a risk score, which moves the department
      // rollup, the dashboards and the loop's measurement.
      qc.invalidateQueries({ queryKey: qk.training.assignment(vars.id) })
      qc.invalidateQueries({ queryKey: qk.training.mine() })
      qc.invalidateQueries({ queryKey: qk.dashboard.employee })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
      qc.invalidateQueries({ queryKey: qk.people.me() })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.mine() })
    },
    ...opts,
  })
}

/* ============================================================================
   Simulations
   ========================================================================== */

export function useCreateSimulation(opts?: Opts<Simulation, Record<string, unknown>>) {
  const qc = useQueryClient()
  return useMutation<Simulation, ApiError, Record<string, unknown>>({
    mutationFn: (body) => api.post<Simulation>(endpoints.simulations.create(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.simulations.all }),
    ...opts,
  })
}

export function useSimulationAction(
  action: 'launch' | 'complete' | 'autoOutcomes',
  opts?: Opts<unknown, number | string>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.simulations[action](id)),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: qk.simulations.detail(id) })
      qc.invalidateQueries({ queryKey: qk.simulations.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

export function useRecordOutcome(
  opts?: Opts<unknown, { simId: number | string; targetId: number | string; outcome: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { simId: number | string; targetId: number | string; outcome: string }>({
    mutationFn: ({ simId, targetId, outcome }) =>
      api.post(endpoints.simulations.targetOutcome(simId, targetId), { outcome }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.simulations.detail(vars.simId) })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    },
    ...opts,
  })
}

/* ============================================================================
   Sandbox
   ========================================================================== */

export function useSandboxUpload(
  opts?: Opts<{ public_id: string }, { file: File; password?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<{ public_id: string }, ApiError, { file: File; password?: string }>({
    mutationFn: ({ file, password }) => {
      const form = new FormData()
      form.append('file', file)
      if (password) form.append('password', password)
      return api.upload<{ public_id: string }>(endpoints.sandbox.upload(), form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sandbox.all }),
    ...opts,
  })
}

export function useSandboxUrl(opts?: Opts<{ public_id: string }, string>) {
  const qc = useQueryClient()
  return useMutation<{ public_id: string }, ApiError, string>({
    mutationFn: (url) => api.post<{ public_id: string }>(endpoints.sandbox.submitUrl(), { url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sandbox.all }),
    ...opts,
  })
}

export function useSandboxPassword(
  opts?: Opts<unknown, { publicId: string; password: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { publicId: string; password: string }>({
    mutationFn: ({ publicId, password }) => api.post(endpoints.sandbox.password(publicId), { password }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: qk.sandbox.job(vars.publicId) }),
    ...opts,
  })
}

export function useSandboxReanalyze(opts?: Opts<unknown, string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (publicId) => api.post(endpoints.sandbox.reanalyze(publicId)),
    onSuccess: (_d, publicId) => qc.invalidateQueries({ queryKey: qk.sandbox.job(publicId) }),
    ...opts,
  })
}

export function useSandboxFeedback(
  opts?: Opts<unknown, { publicId: string; verdict: string; note?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { publicId: string; verdict: string; note?: string }>({
    mutationFn: ({ publicId, ...body }) => api.post(endpoints.sandbox.feedback(publicId), body),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: qk.sandbox.job(vars.publicId) }),
    ...opts,
  })
}

/* ============================================================================
   Policy intelligence
   ========================================================================== */

export function useExtractPolicyRules(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.policy.extract(id)),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: qk.policy.policy(id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useReviewRule(
  opts?: Opts<unknown, { ruleId: number | string; decision: 'activate' | 'reject'; note?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { ruleId: number | string; decision: 'activate' | 'reject'; note?: string }>({
    mutationFn: ({ ruleId, ...body }) => api.post(endpoints.policy.reviewRule(ruleId), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useUpdateFinding(
  opts?: Opts<PolicyFinding, { id: number | string; body: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<PolicyFinding, ApiError, { id: number | string; body: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.patch<PolicyFinding>(endpoints.policy.updateFinding(id), body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.policy.finding(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useAssignFindingTraining(
  opts?: Opts<unknown, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.post(endpoints.policy.assignTraining(id), body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

/* ============================================================================
   Threat intelligence
   ========================================================================== */

export function useAssessIntel(
  opts?: Opts<unknown, { id: number | string; relevance: string; reason?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; relevance: string; reason?: string }>({
    mutationFn: ({ id, ...body }) => api.post(endpoints.intel.assess(id), body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.intel.item(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useDismissIntel(opts?: Opts<unknown, { id: number | string; reason: string }>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; reason: string }>({
    mutationFn: ({ id, reason }) => api.post(endpoints.intel.dismiss(id), { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useCreateFindingFromIntel(
  opts?: Opts<PolicyFinding, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<PolicyFinding, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) =>
      api.post<PolicyFinding>(endpoints.intel.createFinding(id), body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

/** Deliberately reports what is actually configured rather than inventing items. */
export function useRefreshIntel(opts?: Opts<IntelRefreshResult, void>) {
  const qc = useQueryClient()
  return useMutation<IntelRefreshResult, ApiError, void>({
    mutationFn: () => api.post<IntelRefreshResult>(endpoints.intel.refresh()),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.intel.all }),
    ...opts,
  })
}

/* ============================================================================
   Incident risks
   ========================================================================== */

export function useCreateIncidentRisk(opts?: Opts<IncidentRisk, Record<string, unknown>>) {
  const qc = useQueryClient()
  return useMutation<IncidentRisk, ApiError, Record<string, unknown>>({
    mutationFn: (body) => api.post<IncidentRisk>(endpoints.incidentRisks.create(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useIncidentRiskAction(
  action: 'assign' | 'close' | 'reopen',
  opts?: Opts<unknown, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.post(endpoints.incidentRisks[action](id), body ?? {}),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

export function useReviewSubject(
  opts?: Opts<
    unknown,
    { id: number | string; subjectId: number | string; decision: string; note?: string }
  >,
) {
  const qc = useQueryClient()
  return useMutation<
    unknown,
    ApiError,
    { id: number | string; subjectId: number | string; decision: string; note?: string }
  >({
    mutationFn: ({ id, subjectId, ...body }) =>
      api.post(endpoints.incidentRisks.reviewSubject(id, subjectId), body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

/* ============================================================================
   Integrations
   ========================================================================== */

export function useIntegrationAction(
  action: 'configure' | 'sync' | 'disable',
  opts?: Opts<unknown, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.post(endpoints.integrations[action](id), body ?? {}),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.integrations.all })
      qc.invalidateQueries({ queryKey: qk.integrations.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
    ...opts,
  })
}

/* ============================================================================
   Demo control
   ========================================================================== */

export function useResetDemo(opts?: Opts<unknown, void>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => api.post(endpoints.admin.resetDemo()),
    onSuccess: () => qc.invalidateQueries(),
    ...opts,
  })
}
