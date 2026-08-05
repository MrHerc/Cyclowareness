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
  ResourceImportReport,
  EmployeeDetail,
  RemediationPlan,
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

/**
 * Compose this library's cache invalidation with the caller's own `onSuccess`.
 *
 * THE BUG THIS EXISTS TO PREVENT. Every mutation here used to end with
 *
 *     onSuccess: (data, vars) => { qc.invalidateQueries(...) },
 *     ...opts,
 *
 * and `...opts` is a plain object spread, so any component passing its own
 * `onSuccess` — to raise a toast, to close a dialog, to navigate — REPLACED the
 * invalidation outright. Thirty-one mutations were written that way and most
 * callers do pass one, so across the product a write succeeded on the server
 * and left the screen showing the old value until somebody reloaded.
 *
 * Found by walking the journey, not by reading the code: filing a dispute
 * returned 200, the row was on the server, and the card still offered a Dispute
 * button.
 *
 * Invalidation runs FIRST, so the refetch is already in flight while the
 * caller's toast renders.
 */
type OnSuccess<TData, TVars> = NonNullable<
  UseMutationOptions<TData, ApiError, TVars>['onSuccess']
>

function merge<TData, TVars>(
  invalidate: OnSuccess<TData, TVars>,
  opts: Opts<TData, TVars> | undefined,
): Opts<TData, TVars> {
  return {
    ...opts,
    // Rest args rather than a fixed arity: the callback signature is the
    // library's, and pinning it here would silently drop a parameter the day it
    // gains one.
    onSuccess: (...args: Parameters<OnSuccess<TData, TVars>>) => {
      invalidate(...args)
      opts?.onSuccess?.(...args)
    },
  }
}

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
    ...merge((_data, vars) => {
      // An approval moves the loop, empties a queue slot, changes the dashboard
      // counts and writes an audit entry. Invalidate all four.
      qc.invalidateQueries({ queryKey: qk.approvals.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.loops.detail(vars.runId) })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
      qc.invalidateQueries({ queryKey: qk.audit.all })
      qc.invalidateQueries({ queryKey: qk.training.all })
    }, opts),
  })
}

/* ============================================================================
   Loop control
   ========================================================================== */

export function useForceMeasure(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (runId) => api.post(endpoints.loops.forceMeasure(runId)),
    ...merge((_d, runId) => {
      qc.invalidateQueries({ queryKey: qk.loops.detail(runId) })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
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
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.threats.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
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
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.employee })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
  })
}

export function usePushReportToLoop(opts?: Opts<{ loop_run_id: number }, number | string>) {
  const qc = useQueryClient()
  return useMutation<{ loop_run_id: number }, ApiError, number | string>({
    mutationFn: (id) => api.post<{ loop_run_id: number }>(endpoints.reports.pushToLoop(id)),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
  })
}

export function useDismissReport(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.reports.dismiss(id)),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.reports.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
  })
}

/* ============================================================================
   Training
   ========================================================================== */

export interface NewModuleBody {
  title: string
  description: string
  channel: string
  est_minutes: number
  content: { heading: string; body: string }[]
  quiz: unknown[]
  takeaway: string
}

/** Author a module by hand. The server pins the AI fields to false/empty —
 *  no request body can make a hand-written module claim a model wrote it. */
export function useCreateModule(opts?: Opts<TrainingModule, NewModuleBody>) {
  const qc = useQueryClient()
  return useMutation<TrainingModule, ApiError, NewModuleBody>({
    mutationFn: (body) => api.post<TrainingModule>(endpoints.training.createModule(), body),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.training.all })
    }, opts),
  })
}

export interface ResourceImportBody {
  urls: string[]
  topic: string
  channel: string
}

/** Import external resource URLs. The report names every rejection — a silent
 *  partial import is how a catalogue looks fuller than it is. */
export function useImportResources(opts?: Opts<ResourceImportReport, ResourceImportBody>) {
  const qc = useQueryClient()
  return useMutation<ResourceImportReport, ApiError, ResourceImportBody>({
    mutationFn: (body) => api.post<ResourceImportReport>(endpoints.training.importResources(), body),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.training.all })
    }, opts),
  })
}

export function useUpdateModule(
  opts?: Opts<TrainingModule, { id: number | string; body: Partial<TrainingModule> }>,
) {
  const qc = useQueryClient()
  return useMutation<TrainingModule, ApiError, { id: number | string; body: Partial<TrainingModule> }>({
    mutationFn: ({ id, body }) => api.patch<TrainingModule>(endpoints.training.updateModule(id), body),
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.training.module(vars.id) })
      qc.invalidateQueries({ queryKey: qk.approvals.all })
    }, opts),
  })
}

export function useStartAssignment(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.training.start(id)),
    ...merge((_d, id) => {
      qc.invalidateQueries({ queryKey: qk.training.assignment(id) })
      qc.invalidateQueries({ queryKey: qk.training.mine() })
    }, opts),
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
    ...merge((_d, vars) => {
      // Completing training moves a risk score, which moves the department
      // rollup, the dashboards and the loop's measurement.
      qc.invalidateQueries({ queryKey: qk.training.assignment(vars.id) })
      qc.invalidateQueries({ queryKey: qk.training.mine() })
      qc.invalidateQueries({ queryKey: qk.dashboard.employee })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
      qc.invalidateQueries({ queryKey: qk.people.me() })
      qc.invalidateQueries({ queryKey: qk.loops.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.mine() })
    }, opts),
  })
}

/* ============================================================================
   Simulations
   ========================================================================== */

export function useCreateSimulation(opts?: Opts<Simulation, Record<string, unknown>>) {
  const qc = useQueryClient()
  return useMutation<Simulation, ApiError, Record<string, unknown>>({
    mutationFn: (body) => api.post<Simulation>(endpoints.simulations.create(), body),
    ...merge(() => qc.invalidateQueries({ queryKey: qk.simulations.all }), opts),
  })
}

export function useSimulationAction(
  action: 'launch' | 'complete' | 'autoOutcomes',
  opts?: Opts<unknown, number | string>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.simulations[action](id)),
    ...merge((_d, id) => {
      qc.invalidateQueries({ queryKey: qk.simulations.detail(id) })
      qc.invalidateQueries({ queryKey: qk.simulations.all })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
  })
}

export function useRecordOutcome(
  opts?: Opts<unknown, { simId: number | string; targetId: number | string; outcome: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { simId: number | string; targetId: number | string; outcome: string }>({
    mutationFn: ({ simId, targetId, outcome }) =>
      api.post(endpoints.simulations.targetOutcome(simId, targetId), { outcome }),
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.simulations.detail(vars.simId) })
      qc.invalidateQueries({ queryKey: qk.dashboard.analyst })
    }, opts),
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
    ...merge(() => qc.invalidateQueries({ queryKey: qk.sandbox.all }), opts),
  })
}

export function useSandboxUrl(opts?: Opts<{ public_id: string }, string>) {
  const qc = useQueryClient()
  return useMutation<{ public_id: string }, ApiError, string>({
    mutationFn: (url) => api.post<{ public_id: string }>(endpoints.sandbox.submitUrl(), { url }),
    ...merge(() => qc.invalidateQueries({ queryKey: qk.sandbox.all }), opts),
  })
}

export function useSandboxPassword(
  opts?: Opts<unknown, { publicId: string; password: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { publicId: string; password: string }>({
    mutationFn: ({ publicId, password }) => api.post(endpoints.sandbox.password(publicId), { password }),
    ...merge((_d, vars) => qc.invalidateQueries({ queryKey: qk.sandbox.job(vars.publicId) }), opts),
  })
}

export function useSandboxReanalyze(opts?: Opts<unknown, string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (publicId) => api.post(endpoints.sandbox.reanalyze(publicId)),
    ...merge((_d, publicId) => qc.invalidateQueries({ queryKey: qk.sandbox.job(publicId) }), opts),
  })
}

export function useSandboxFeedback(
  opts?: Opts<unknown, { publicId: string; verdict: string; note?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { publicId: string; verdict: string; note?: string }>({
    mutationFn: ({ publicId, ...body }) => api.post(endpoints.sandbox.feedback(publicId), body),
    ...merge((_d, vars) => qc.invalidateQueries({ queryKey: qk.sandbox.job(vars.publicId) }), opts),
  })
}

/* ============================================================================
   Policy intelligence
   ========================================================================== */

export function useExtractPolicyRules(opts?: Opts<unknown, number | string>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => api.post(endpoints.policy.extract(id)),
    ...merge((_d, id) => {
      qc.invalidateQueries({ queryKey: qk.policy.policy(id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useReviewRule(
  opts?: Opts<unknown, { ruleId: number | string; decision: 'activate' | 'reject'; note?: string }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { ruleId: number | string; decision: 'activate' | 'reject'; note?: string }>({
    mutationFn: ({ ruleId, ...body }) => api.post(endpoints.policy.reviewRule(ruleId), body),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useUpdateFinding(
  opts?: Opts<PolicyFinding, { id: number | string; body: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<PolicyFinding, ApiError, { id: number | string; body: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.patch<PolicyFinding>(endpoints.policy.updateFinding(id), body),
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.policy.finding(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useAssignFindingTraining(
  opts?: Opts<unknown, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.post(endpoints.policy.assignTraining(id), body ?? {}),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
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
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.intel.item(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useDismissIntel(opts?: Opts<unknown, { id: number | string; reason: string }>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; reason: string }>({
    mutationFn: ({ id, reason }) => api.post(endpoints.intel.dismiss(id), { reason }),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useCreateFindingFromIntel(
  opts?: Opts<PolicyFinding, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<PolicyFinding, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) =>
      api.post<PolicyFinding>(endpoints.intel.createFinding(id), body ?? {}),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.intel.all })
      qc.invalidateQueries({ queryKey: qk.policy.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

/** Deliberately reports what is actually configured rather than inventing items. */
export function useRefreshIntel(opts?: Opts<IntelRefreshResult, void>) {
  const qc = useQueryClient()
  return useMutation<IntelRefreshResult, ApiError, void>({
    mutationFn: () => api.post<IntelRefreshResult>(endpoints.intel.refresh()),
    ...merge(() => qc.invalidateQueries({ queryKey: qk.intel.all }), opts),
  })
}

/* ============================================================================
   Incident risks
   ========================================================================== */

export function useCreateIncidentRisk(opts?: Opts<IncidentRisk, Record<string, unknown>>) {
  const qc = useQueryClient()
  return useMutation<IncidentRisk, ApiError, Record<string, unknown>>({
    mutationFn: (body) => api.post<IncidentRisk>(endpoints.incidentRisks.create(), body),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useIncidentRiskAction(
  action: 'assign' | 'close' | 'reopen',
  opts?: Opts<unknown, { id: number | string; body?: Record<string, unknown> }>,
) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number | string; body?: Record<string, unknown> }>({
    mutationFn: ({ id, body }) => api.post(endpoints.incidentRisks[action](id), body ?? {}),
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.training.all })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
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
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
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
    ...merge((_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.integrations.all })
      qc.invalidateQueries({ queryKey: qk.integrations.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

/* ============================================================================
   Demo control
   ========================================================================== */

export function useResetDemo(opts?: Opts<unknown, void>) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => api.post(endpoints.admin.resetDemo()),
    ...merge(() => qc.invalidateQueries(), opts),
  })
}

/* ============================================================================
   Remediation — the human gate
   ========================================================================== */

/**
 * Approve or reject one remediation plan.
 *
 * NO OPTIMISTIC UPDATE, deliberately — the same rule the loop's own approval
 * gate follows. This is the moment something reaches a named person; showing it
 * as done before the server agrees would let a failed request look like a
 * delivery.
 *
 * A BLOCKED plan cannot be approved out of its rejection: the server answers
 * 409, and that is correct. An approval button that can override the output
 * firewall is the same as not having a firewall.
 */
export interface RemediationDecisionInput {
  id: number
  decision: 'approve' | 'reject'
  note?: string
}

export interface ContestRiskEventInput {
  eventId: number
  note: string
}

/** The person a risk event is about says it is wrong.
 *
 *  Does not touch the score client-side: a contest asks a human to look, and
 *  the server is the only thing that decides whether the event is withdrawn. */
export function useContestRiskEvent(opts?: Opts<EmployeeDetail, ContestRiskEventInput>) {
  const qc = useQueryClient()
  return useMutation<EmployeeDetail, ApiError, ContestRiskEventInput>({
    mutationFn: ({ eventId, note }) =>
      api.post<EmployeeDetail>(endpoints.employees.contestRiskEvent(eventId), { note }),
    ...merge(() => {
      qc.invalidateQueries({ queryKey: qk.people.me() })
      qc.invalidateQueries({ queryKey: qk.dashboard.employee })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export interface RemediationDisputeInput {
  id: number
  note: string
}

/** The learner contests a decision a machine made about them.
 *
 *  Deliberately does not touch the plan's status client-side. A dispute is a
 *  request for a human to look, not a self-service withdrawal, and the server
 *  is the only thing that decides what happens next. */
export function useRemediationDispute(opts?: Opts<RemediationPlan, RemediationDisputeInput>) {
  const qc = useQueryClient()
  return useMutation<RemediationPlan, ApiError, RemediationDisputeInput>({
    mutationFn: ({ id, note }) =>
      api.post<RemediationPlan>(endpoints.remediation.dispute(id), { note }),
    ...merge((_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.remediation.all })
      qc.invalidateQueries({ queryKey: qk.remediation.plan(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export interface RemediationDisputeResolutionInput {
  id: number
  resolution: string
  withdraw: boolean
}

/** A named human answers the appeal, and may withdraw the plan. */
export function useRemediationDisputeResolution(
  opts?: Opts<RemediationPlan, RemediationDisputeResolutionInput>,
) {
  const qc = useQueryClient()
  return useMutation<RemediationPlan, ApiError, RemediationDisputeResolutionInput>({
    mutationFn: ({ id, resolution, withdraw }) =>
      api.post<RemediationPlan>(endpoints.remediation.disputeResolution(id), {
        resolution,
        withdraw,
      }),
    ...merge((_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.remediation.all })
      qc.invalidateQueries({ queryKey: qk.remediation.plan(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}

export function useRemediationDecision(opts?: Opts<RemediationPlan, RemediationDecisionInput>) {
  const qc = useQueryClient()
  return useMutation<RemediationPlan, ApiError, RemediationDecisionInput>({
    mutationFn: ({ id, decision, note }) =>
      api.post<RemediationPlan>(endpoints.remediation.decision(id), {
        decision,
        note: note ?? '',
      }),
    ...merge((_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.remediation.all })
      qc.invalidateQueries({ queryKey: qk.remediation.plan(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    }, opts),
  })
}
