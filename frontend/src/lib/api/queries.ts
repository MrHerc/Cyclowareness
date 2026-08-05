/**
 * Read hooks. One hook per thing the product can know.
 *
 * All server state lives in React Query; none of it lives in component state.
 * That is what makes "loading", "empty", "error" and "stale" expressible
 * everywhere instead of being reinvented per page — and it is why a page
 * component in this codebase never contains a `useEffect` that fetches.
 *
 * Polling intervals are deliberate, not decorative: the loop and the sandbox
 * move on their own and must be watched, while a policy library does not.
 * Anything that polls also pauses when the tab is hidden (`refetchIntervalInBackground`
 * defaults to false), because a forgotten tab should not bill the model
 * provider all afternoon.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { api, ApiError } from './client'
import { endpoints } from './endpoints'
import { itemsOf } from '../../domain/types'
import type {
  TrainingResource,
  TrainingResourceTopic,
  AnalystDashboard,
  Paginated,
  Assignment,
  AssignmentDetail,
  AuditEvent,
  AuditPage,
  ApprovalDetail,
  ApprovalQueueItem,
  Capabilities,
  DepartmentRisk,
  Employee,
  EmployeeDashboard,
  EmployeeDetail,
  ExecutiveDashboard,
  ExternalCourse,
  FeedItem,
  Identity,
  IncidentRisk,
  IncidentRiskDetail,
  IntelItem,
  IntelItemDetail,
  IntelMatch,
  Integration,
  LoopRunDetail,
  MyIncidentRisk,
  Policy,
  PolicyDetail,
  PolicyFinding,
  Report,
  RunSummary,
  RemediationControlGap,
  RemediationCoverageGap,
  RemediationPlan,
  RemediationStats,
  SandboxCapabilities,
  SandboxJobDetail,
  SandboxJobStats,
  SandboxJobSummary,
  SimTemplate,
  Simulation,
  SimulationDetail,
  Threat,
  TrainingModule,
} from '../../domain/types'

/* ============================================================================
   Query keys — one factory so invalidation is never guesswork
   ========================================================================== */

export const qk = {
  capabilities: ['capabilities'] as const,
  identity: ['identity'] as const,

  dashboard: {
    analyst: ['dashboard', 'analyst'] as const,
    employee: ['dashboard', 'employee'] as const,
    executive: ['dashboard', 'executive'] as const,
  },

  loops: {
    all: ['loops'] as const,
    list: (status?: string) => ['loops', 'list', status ?? 'all'] as const,
    detail: (id: number | string) => ['loops', 'detail', String(id)] as const,
  },
  approvals: {
    all: ['approvals'] as const,
    queue: (filters?: unknown) => ['approvals', 'queue', filters ?? null] as const,
    detail: (id: number | string) => ['approvals', 'detail', String(id)] as const,
    history: (id: number | string) => ['approvals', 'history', String(id)] as const,
  },
  threats: {
    all: ['threats'] as const,
    list: () => ['threats', 'list'] as const,
    detail: (id: number | string) => ['threats', 'detail', String(id)] as const,
  },
  reports: {
    all: ['reports'] as const,
    list: (status?: string) => ['reports', 'list', status ?? 'all'] as const,
    mine: () => ['reports', 'mine'] as const,
  },
  training: {
    all: ['training'] as const,
    modules: (status?: string) => ['training', 'modules', status ?? 'all'] as const,
    module: (id: number | string) => ['training', 'module', String(id)] as const,
    mine: () => ['training', 'mine'] as const,
    assignment: (id: number | string) => ['training', 'assignment', String(id)] as const,
    resources: (topic?: string) => ['training', 'resources', topic ?? 'all'] as const,
    resourceTopics: () => ['training', 'resource-topics'] as const,
    moduleResources: (id: number | string) =>
      ['training', 'module-resources', String(id)] as const,
  },
  simulations: {
    all: ['simulations'] as const,
    list: () => ['simulations', 'list'] as const,
    detail: (id: number | string) => ['simulations', 'detail', String(id)] as const,
    templates: () => ['simulations', 'templates'] as const,
  },
  people: {
    employees: (filters?: unknown) => ['employees', filters ?? null] as const,
    employee: (id: number | string) => ['employees', 'detail', String(id)] as const,
    me: () => ['employees', 'me'] as const,
    departments: () => ['departments'] as const,
  },
  feed: { list: () => ['feed'] as const },
  remediation: {
    all: ['remediation'] as const,
    plans: (filters?: unknown) => ['remediation', 'plans', filters ?? null] as const,
    plan: (id: number | string) => ['remediation', 'plan', id] as const,
    mine: () => ['remediation', 'mine'] as const,
    coverageGaps: () => ['remediation', 'coverage-gaps'] as const,
    controlGaps: () => ['remediation', 'control-gaps'] as const,
    stats: () => ['remediation', 'stats'] as const,
  },
  sandbox: {
    all: ['sandbox'] as const,
    capabilities: () => ['sandbox', 'capabilities'] as const,
    stats: () => ['sandbox', 'stats'] as const,
    jobs: (filters?: unknown) => ['sandbox', 'jobs', filters ?? null] as const,
    job: (id: string) => ['sandbox', 'job', id] as const,
  },
  policy: {
    all: ['policy'] as const,
    policies: (filters?: unknown) => ['policy', 'policies', filters ?? null] as const,
    policy: (id: number | string) => ['policy', 'policy', String(id)] as const,
    findings: (filters?: unknown) => ['policy', 'findings', filters ?? null] as const,
    finding: (id: number | string) => ['policy', 'finding', String(id)] as const,
    stats: () => ['policy', 'stats'] as const,
  },
  intel: {
    all: ['intel'] as const,
    items: (filters?: unknown) => ['intel', 'items', filters ?? null] as const,
    item: (id: number | string) => ['intel', 'item', String(id)] as const,
    matches: (filters?: unknown) => ['intel', 'matches', filters ?? null] as const,
    stats: () => ['intel', 'stats'] as const,
  },
  incidentRisks: {
    all: ['incident-risks'] as const,
    list: (filters?: unknown) => ['incident-risks', 'list', filters ?? null] as const,
    detail: (id: number | string) => ['incident-risks', 'detail', String(id)] as const,
    mine: () => ['incident-risks', 'mine'] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    list: () => ['integrations', 'list'] as const,
    detail: (id: number | string) => ['integrations', 'detail', String(id)] as const,
    courses: (id: number | string) => ['integrations', 'courses', String(id)] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (filters?: unknown) => ['audit', 'list', filters ?? null] as const,
    actions: () => ['audit', 'actions'] as const,
  },
} as const

/* ============================================================================
   Polling cadences
   ========================================================================== */

/** The loop moves on its own; an analyst watching it expects it to move. */
export const POLL_LIVE = 4_000
/** A sandbox job resolves in seconds — watch it closely while it runs. */
export const POLL_FAST = 2_500
/** Queues change when a human acts, which is not every second. */
export const POLL_QUEUE = 15_000
/** Reference data. Refetch on focus is enough. */
export const POLL_NONE = false as const

type Opts<T> = Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>

/**
 * Options for a list hook that receives the `{items,total,truncated}` envelope
 * and hands the caller plain rows. `select` is owned by the hook, so a caller
 * cannot accidentally replace the unwrapping and get the envelope back.
 */
type ListOpts<TItem> = Omit<
  UseQueryOptions<Paginated<TItem> | TItem[], ApiError, TItem[]>,
  'queryKey' | 'queryFn' | 'select'
>

/* ============================================================================
   Platform
   ========================================================================== */

export function useCapabilities(options?: Opts<Capabilities>) {
  return useQuery<Capabilities, ApiError>({
    queryKey: qk.capabilities,
    queryFn: () => api.get<Capabilities>(endpoints.capabilities()),
    staleTime: Infinity, // fixed for the life of a deployment
    ...options,
  })
}

export function useIdentity(options?: Opts<Identity>) {
  return useQuery<Identity, ApiError>({
    queryKey: qk.identity,
    queryFn: () => api.get<Identity>(endpoints.auth.me()),
    ...options,
  })
}

/* ============================================================================
   Dashboards
   ========================================================================== */

export function useAnalystDashboard(options?: Opts<AnalystDashboard>) {
  return useQuery<AnalystDashboard, ApiError>({
    queryKey: qk.dashboard.analyst,
    queryFn: () => api.get<AnalystDashboard>(endpoints.dashboard.analyst()),
    refetchInterval: POLL_LIVE,
    ...options,
  })
}

export function useEmployeeDashboard(options?: Opts<EmployeeDashboard>) {
  return useQuery<EmployeeDashboard, ApiError>({
    queryKey: qk.dashboard.employee,
    queryFn: () => api.get<EmployeeDashboard>(endpoints.dashboard.employee()),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useExecutiveDashboard(options?: Opts<ExecutiveDashboard>) {
  return useQuery<ExecutiveDashboard, ApiError>({
    queryKey: qk.dashboard.executive,
    queryFn: () => api.get<ExecutiveDashboard>(endpoints.dashboard.executive()),
    // The briefing costs a model call on the server; do not poll it aggressively.
    staleTime: 60_000,
    ...options,
  })
}

/* ============================================================================
   The loop
   ========================================================================== */

/**
 * Returns RunSummary rows — the loop plus enough of its threat to render a row.
 * The endpoint used to answer with a bare LoopRun, which carried no title, so
 * every caller invented its own join; `schemas.RunSummaryOut` now owns that
 * shape for both this route and the analyst dashboard.
 */
export function useLoops(status?: string, options?: Opts<RunSummary[]>) {
  return useQuery<RunSummary[], ApiError>({
    queryKey: qk.loops.list(status),
    queryFn: () => api.get<RunSummary[]>(endpoints.loops.list(status ? { status } : {})),
    refetchInterval: POLL_LIVE,
    ...options,
  })
}

export function useLoop(id: number | string | undefined, options?: Opts<LoopRunDetail>) {
  return useQuery<LoopRunDetail, ApiError>({
    queryKey: qk.loops.detail(id ?? 'none'),
    queryFn: () => api.get<LoopRunDetail>(endpoints.loops.detail(id!)),
    enabled: id !== undefined && id !== null && id !== '',
    refetchInterval: POLL_FAST,
    ...options,
  })
}

/* ============================================================================
   Approvals
   ========================================================================== */

export function useApprovalQueue(
  filters: { severity?: string; source?: string; sort?: string } = {},
  options?: ListOpts<ApprovalQueueItem>,
) {
  return useQuery<Paginated<ApprovalQueueItem> | ApprovalQueueItem[], ApiError, ApprovalQueueItem[]>({
    queryKey: qk.approvals.queue(filters),
    queryFn: () => api.get<Paginated<ApprovalQueueItem> | ApprovalQueueItem[]>(endpoints.approvals.queue(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useApproval(runId: number | string | undefined, options?: Opts<ApprovalDetail>) {
  return useQuery<ApprovalDetail, ApiError>({
    queryKey: qk.approvals.detail(runId ?? 'none'),
    queryFn: () => api.get<ApprovalDetail>(endpoints.approvals.detail(runId!)),
    enabled: runId !== undefined && runId !== null && runId !== '',
    ...options,
  })
}

/* ============================================================================
   Threats and reports
   ========================================================================== */

export function useThreats(options?: Opts<Threat[]>) {
  return useQuery<Threat[], ApiError>({
    queryKey: qk.threats.list(),
    queryFn: () => api.get<Threat[]>(endpoints.threats.list()),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useThreat(id: number | string | undefined, options?: Opts<Threat>) {
  return useQuery<Threat, ApiError>({
    queryKey: qk.threats.detail(id ?? 'none'),
    queryFn: () => api.get<Threat>(endpoints.threats.detail(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useReports(status?: string, options?: Opts<Report[]>) {
  return useQuery<Report[], ApiError>({
    queryKey: qk.reports.list(status),
    queryFn: () => api.get<Report[]>(endpoints.reports.list(status ? { status } : {})),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useMyReports(options?: Opts<Report[]>) {
  return useQuery<Report[], ApiError>({
    queryKey: qk.reports.mine(),
    queryFn: () => api.get<Report[]>(endpoints.reports.mine()),
    ...options,
  })
}

/* ============================================================================
   Training
   ========================================================================== */

export function useTrainingModules(status?: string, options?: Opts<TrainingModule[]>) {
  return useQuery<TrainingModule[], ApiError>({
    queryKey: qk.training.modules(status),
    queryFn: () => api.get<TrainingModule[]>(endpoints.training.modules(status ? { status } : {})),
    ...options,
  })
}

export function useTrainingModule(id: number | string | undefined, options?: Opts<TrainingModule>) {
  return useQuery<TrainingModule, ApiError>({
    queryKey: qk.training.module(id ?? 'none'),
    queryFn: () => api.get<TrainingModule>(endpoints.training.module(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useMyAssignments(options?: Opts<AssignmentDetail[]>) {
  return useQuery<AssignmentDetail[], ApiError>({
    queryKey: qk.training.mine(),
    queryFn: () => api.get<AssignmentDetail[]>(endpoints.training.mine()),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useAssignment(id: number | string | undefined, options?: Opts<AssignmentDetail>) {
  return useQuery<AssignmentDetail, ApiError>({
    queryKey: qk.training.assignment(id ?? 'none'),
    queryFn: () => api.get<AssignmentDetail>(endpoints.training.assignment(id!)),
    enabled: !!id,
    ...options,
  })
}

/* ============================================================================
   Simulations
   ========================================================================== */

export function useSimulations(options?: Opts<Simulation[]>) {
  return useQuery<Simulation[], ApiError>({
    queryKey: qk.simulations.list(),
    queryFn: () => api.get<Simulation[]>(endpoints.simulations.list()),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useSimulation(id: number | string | undefined, options?: Opts<SimulationDetail>) {
  return useQuery<SimulationDetail, ApiError>({
    queryKey: qk.simulations.detail(id ?? 'none'),
    queryFn: () => api.get<SimulationDetail>(endpoints.simulations.detail(id!)),
    enabled: !!id,
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useSimTemplates(options?: Opts<SimTemplate[]>) {
  return useQuery<SimTemplate[], ApiError>({
    queryKey: qk.simulations.templates(),
    queryFn: () => api.get<SimTemplate[]>(endpoints.simulations.templates()),
    staleTime: Infinity,
    ...options,
  })
}

/* ============================================================================
   People
   ========================================================================== */

export function useEmployees(
  filters: { department_id?: number; q?: string } = {},
  options?: Opts<Employee[]>,
) {
  return useQuery<Employee[], ApiError>({
    queryKey: qk.people.employees(filters),
    queryFn: () => api.get<Employee[]>(endpoints.employees.list(filters)),
    ...options,
  })
}

export function useEmployee(id: number | string | undefined, options?: Opts<EmployeeDetail>) {
  return useQuery<EmployeeDetail, ApiError>({
    queryKey: qk.people.employee(id ?? 'none'),
    queryFn: () => api.get<EmployeeDetail>(endpoints.employees.detail(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useMyProfile(options?: Opts<EmployeeDetail>) {
  return useQuery<EmployeeDetail, ApiError>({
    queryKey: qk.people.me(),
    queryFn: () => api.get<EmployeeDetail>(endpoints.employees.me()),
    ...options,
  })
}

export function useDepartments(options?: Opts<DepartmentRisk[]>) {
  return useQuery<DepartmentRisk[], ApiError>({
    queryKey: qk.people.departments(),
    queryFn: () => api.get<DepartmentRisk[]>(endpoints.departments.list()),
    ...options,
  })
}

/* ============================================================================
   Curated feed
   ========================================================================== */

export function useFeed(options?: Opts<FeedItem[]>) {
  return useQuery<FeedItem[], ApiError>({
    queryKey: qk.feed.list(),
    queryFn: () => api.get<FeedItem[]>(endpoints.feed.list()),
    ...options,
  })
}

/* ============================================================================
   Remediation
   ========================================================================== */

/** The plan queue. Paged envelope, unwrapped — `useRemediationStats` carries the
 *  totals, because a count taken from a page is a property of the page. */
export function useRemediationPlans(
  filters: { status?: string; limit?: number; offset?: number } = {},
  options?: ListOpts<RemediationPlan>,
) {
  return useQuery<Paginated<RemediationPlan> | RemediationPlan[], ApiError, RemediationPlan[]>({
    queryKey: qk.remediation.plans(filters),
    queryFn: () =>
      api.get<Paginated<RemediationPlan> | RemediationPlan[]>(endpoints.remediation.plans(filters)),
    select: (payload) => itemsOf(payload),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

export function useRemediationPlan(id: number | undefined, options?: Opts<RemediationPlan>) {
  return useQuery<RemediationPlan, ApiError>({
    queryKey: qk.remediation.plan(id ?? 'none'),
    queryFn: () => api.get<RemediationPlan>(endpoints.remediation.plan(id!)),
    enabled: id !== undefined,
    ...options,
  })
}

/** A learner's own plans. Scoped server-side by the session's employee id. */
export function useMyRemediationPlans(options?: Opts<RemediationPlan[]>) {
  return useQuery<RemediationPlan[], ApiError>({
    queryKey: qk.remediation.mine(),
    queryFn: () => api.get<RemediationPlan[]>(endpoints.remediation.mine()),
    ...options,
  })
}

/** The content roadmap: behaviours the catalogue could not answer. */
export function useCoverageGaps(options?: Opts<{ items: RemediationCoverageGap[]; total: number; covered_behaviours: string[]; note: string }>) {
  return useQuery({
    queryKey: qk.remediation.coverageGaps(),
    queryFn: () =>
      api.get<{ items: RemediationCoverageGap[]; total: number; covered_behaviours: string[]; note: string }>(
        endpoints.remediation.coverageGaps(),
      ),
    ...options,
  })
}

/** Where a control, not a module, is the fix. */
export function useControlGaps(options?: Opts<{ items: RemediationControlGap[]; total: number; note: string }>) {
  return useQuery({
    queryKey: qk.remediation.controlGaps(),
    queryFn: () =>
      api.get<{ items: RemediationControlGap[]; total: number; note: string }>(
        endpoints.remediation.controlGaps(),
      ),
    ...options,
  })
}

export function useRemediationStats(options?: Opts<RemediationStats>) {
  return useQuery<RemediationStats, ApiError>({
    queryKey: qk.remediation.stats(),
    queryFn: () => api.get<RemediationStats>(endpoints.remediation.stats()),
    refetchInterval: POLL_QUEUE,
    ...options,
  })
}

/* ============================================================================
   Sandbox
   ========================================================================== */

export function useSandboxCapabilities(options?: Opts<SandboxCapabilities>) {
  return useQuery<SandboxCapabilities, ApiError>({
    queryKey: qk.sandbox.capabilities(),
    queryFn: () => api.get<SandboxCapabilities>(endpoints.sandbox.capabilities()),
    staleTime: 5 * 60_000,
    ...options,
  })
}

/** The queue. The endpoint answers with a `{items,total,limit,offset}` envelope,
 *  and this hook hands back just the rows — use `useSandboxJobPage` when the
 *  total matters, which it does anywhere the UI writes "showing N of M". */
export function useSandboxJobs(
  filters: { status?: string; limit?: number; offset?: number } = {},
  options?: ListOpts<SandboxJobSummary>,
) {
  return useQuery<Paginated<SandboxJobSummary> | SandboxJobSummary[], ApiError, SandboxJobSummary[]>({
    queryKey: qk.sandbox.jobs(filters),
    queryFn: () =>
      api.get<Paginated<SandboxJobSummary> | SandboxJobSummary[]>(endpoints.sandbox.jobs(filters)),
    select: (payload) => itemsOf(payload),
    refetchInterval: POLL_LIVE,
    ...options,
  })
}

/** Counts over the whole table, not over a page of it.
 *
 *  A dashboard cannot be honest by paging: the page limit is smaller than the
 *  table will be, so a tile counted client-side from `useSandboxJobs` is a
 *  property of how many rows the last poll happened to fetch. */
export function useSandboxStats(options?: Opts<SandboxJobStats>) {
  return useQuery<SandboxJobStats, ApiError>({
    queryKey: qk.sandbox.stats(),
    queryFn: () => api.get<SandboxJobStats>(endpoints.sandbox.stats()),
    refetchInterval: POLL_LIVE,
    ...options,
  })
}

export function useSandboxJob(publicId: string | undefined, options?: Opts<SandboxJobDetail>) {
  return useQuery<SandboxJobDetail, ApiError>({
    queryKey: qk.sandbox.job(publicId ?? 'none'),
    queryFn: () => api.get<SandboxJobDetail>(endpoints.sandbox.job(publicId!)),
    enabled: !!publicId,
    // Stop polling once the job has settled — a completed report does not change.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'running' ? POLL_FAST : false
    },
    ...options,
  })
}

/* ============================================================================
   Policy intelligence
   ========================================================================== */

export function usePolicies(
  filters: { type?: string; status?: string; department?: string; q?: string } = {},
  options?: ListOpts<Policy>,
) {
  return useQuery<Paginated<Policy> | Policy[], ApiError, Policy[]>({
    queryKey: qk.policy.policies(filters),
    queryFn: () => api.get<Paginated<Policy> | Policy[]>(endpoints.policy.policies(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    ...options,
  })
}

export function usePolicy(id: number | string | undefined, options?: Opts<PolicyDetail>) {
  return useQuery<PolicyDetail, ApiError>({
    queryKey: qk.policy.policy(id ?? 'none'),
    queryFn: () => api.get<PolicyDetail>(endpoints.policy.policy(id!)),
    enabled: !!id,
    ...options,
  })
}

export function usePolicyFindings(
  filters: Record<string, string | number | undefined> = {},
  options?: ListOpts<PolicyFinding>,
) {
  return useQuery<Paginated<PolicyFinding> | PolicyFinding[], ApiError, PolicyFinding[]>({
    queryKey: qk.policy.findings(filters),
    queryFn: () => api.get<Paginated<PolicyFinding> | PolicyFinding[]>(endpoints.policy.findings(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    ...options,
  })
}

export function usePolicyFinding(id: number | string | undefined, options?: Opts<PolicyFinding>) {
  return useQuery<PolicyFinding, ApiError>({
    queryKey: qk.policy.finding(id ?? 'none'),
    queryFn: () => api.get<PolicyFinding>(endpoints.policy.finding(id!)),
    enabled: !!id,
    ...options,
  })
}

export function usePolicyStats(options?: Opts<Record<string, unknown>>) {
  return useQuery<Record<string, unknown>, ApiError>({
    queryKey: qk.policy.stats(),
    queryFn: () => api.get<Record<string, unknown>>(endpoints.policy.stats()),
    ...options,
  })
}

/* ============================================================================
   Threat intelligence
   ========================================================================== */

export function useIntelItems(
  filters: Record<string, string | undefined> = {},
  options?: ListOpts<IntelItem>,
) {
  return useQuery<Paginated<IntelItem> | IntelItem[], ApiError, IntelItem[]>({
    queryKey: qk.intel.items(filters),
    queryFn: () => api.get<Paginated<IntelItem> | IntelItem[]>(endpoints.intel.items(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    ...options,
  })
}

export function useIntelItem(id: number | string | undefined, options?: Opts<IntelItemDetail>) {
  return useQuery<IntelItemDetail, ApiError>({
    queryKey: qk.intel.item(id ?? 'none'),
    queryFn: () => api.get<IntelItemDetail>(endpoints.intel.item(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useIntelMatches(
  filters: { intel_item_id?: number } = {},
  options?: ListOpts<IntelMatch>,
) {
  return useQuery<Paginated<IntelMatch> | IntelMatch[], ApiError, IntelMatch[]>({
    queryKey: qk.intel.matches(filters),
    queryFn: () => api.get<Paginated<IntelMatch> | IntelMatch[]>(endpoints.intel.matches(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    ...options,
  })
}

/* ============================================================================
   Incident risks
   ========================================================================== */

export function useIncidentRisks(
  filters: Record<string, string | undefined> = {},
  options?: ListOpts<IncidentRisk>,
) {
  return useQuery<Paginated<IncidentRisk> | IncidentRisk[], ApiError, IncidentRisk[]>({
    queryKey: qk.incidentRisks.list(filters),
    queryFn: () => api.get<Paginated<IncidentRisk> | IncidentRisk[]>(endpoints.incidentRisks.list(filters)),
    // The newer routers answer with an {items,total,truncated} envelope;
    // unwrap here so every page works with rows, and read the envelope
    // through the matching *Page hook when truncation must be shown.
    select: (payload) => itemsOf(payload),
    ...options,
  })
}

export function useIncidentRisk(
  id: number | string | undefined,
  options?: Opts<IncidentRiskDetail>,
) {
  return useQuery<IncidentRiskDetail, ApiError>({
    queryKey: qk.incidentRisks.detail(id ?? 'none'),
    queryFn: () => api.get<IncidentRiskDetail>(endpoints.incidentRisks.detail(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useMyIncidentRisks(options?: Opts<MyIncidentRisk[]>) {
  return useQuery<MyIncidentRisk[], ApiError>({
    queryKey: qk.incidentRisks.mine(),
    queryFn: () => api.get<MyIncidentRisk[]>(endpoints.incidentRisks.mine()),
    ...options,
  })
}

/* ============================================================================
   Integrations
   ========================================================================== */

export function useIntegrations(options?: Opts<Integration[]>) {
  return useQuery<Integration[], ApiError>({
    queryKey: qk.integrations.list(),
    queryFn: () => api.get<Integration[]>(endpoints.integrations.list()),
    ...options,
  })
}

export function useIntegration(id: number | string | undefined, options?: Opts<Integration>) {
  return useQuery<Integration, ApiError>({
    queryKey: qk.integrations.detail(id ?? 'none'),
    queryFn: () => api.get<Integration>(endpoints.integrations.detail(id!)),
    enabled: !!id,
    ...options,
  })
}

export function useExternalCourses(
  integrationId: number | string | undefined,
  options?: Opts<ExternalCourse[]>,
) {
  return useQuery<ExternalCourse[], ApiError>({
    queryKey: qk.integrations.courses(integrationId ?? 'none'),
    queryFn: () => api.get<ExternalCourse[]>(endpoints.integrations.courses(integrationId!)),
    enabled: !!integrationId,
    ...options,
  })
}

/* ============================================================================
   Audit
   ========================================================================== */

export function useAuditLog(
  filters: Record<string, string | number | undefined> = {},
  options?: Opts<AuditPage | AuditEvent[]>,
) {
  return useQuery<AuditPage | AuditEvent[], ApiError>({
    queryKey: qk.audit.list(filters),
    queryFn: () => api.get<AuditPage | AuditEvent[]>(endpoints.audit.list(filters)),
    ...options,
  })
}

export function useAuditActions(options?: Opts<string[]>) {
  return useQuery<string[], ApiError>({
    queryKey: qk.audit.actions(),
    queryFn: () => api.get<string[]>(endpoints.audit.actions()),
    staleTime: 5 * 60_000,
    ...options,
  })
}

/** Assignments for the current employee, used by the portal's next-action strip. */
export type { Assignment }


/** Verified external resources, optionally narrowed to one attack type. */
export function useTrainingResources(topic?: string, options?: Opts<TrainingResource[]>) {
  return useQuery<TrainingResource[], ApiError>({
    queryKey: qk.training.resources(topic),
    queryFn: () =>
      api.get<TrainingResource[]>(endpoints.training.resources(topic ? { topic } : {})),
    ...options,
  })
}

/** Every attack the catalogue knows, including the ones it has nothing for. */
export function useTrainingResourceTopics(options?: Opts<TrainingResourceTopic[]>) {
  return useQuery<TrainingResourceTopic[], ApiError>({
    queryKey: qk.training.resourceTopics(),
    queryFn: () => api.get<TrainingResourceTopic[]>(endpoints.training.resourceTopics()),
    ...options,
  })
}

/** What a learner can watch after this module, matched on its channel. */
export function useModuleResources(
  id: number | string | undefined,
  options?: Opts<TrainingResource[]>,
) {
  return useQuery<TrainingResource[], ApiError>({
    queryKey: qk.training.moduleResources(id ?? 0),
    queryFn: () => api.get<TrainingResource[]>(endpoints.training.moduleResources(id!)),
    enabled: id !== undefined,
    ...options,
  })
}
