/**
 * Every URL the product knows, in one table.
 *
 * Nothing else in the codebase may contain a path string. When the API moves,
 * it moves here — and a route that does not exist server-side is visible as a
 * missing entry rather than as a 404 discovered in a demo.
 *
 * Paths are relative; `client.ts` prefixes `API_BASE_URL`, which is empty in
 * the single-origin deployment and set for a split one.
 */

const qs = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ''
}

export const endpoints = {
  /* --- platform ---------------------------------------------------------- */
  health: () => '/api/health',
  capabilities: () => '/api/capabilities',

  /* --- auth -------------------------------------------------------------- */
  auth: {
    login: () => '/api/auth/login',
    me: () => '/api/auth/me',
  },

  /* --- dashboards -------------------------------------------------------- */
  dashboard: {
    analyst: () => '/api/dashboard/analyst',
    employee: () => '/api/dashboard/employee',
    executive: () => '/api/dashboard/executive',
  },

  /* --- the loop ---------------------------------------------------------- */
  loops: {
    list: (params: { status?: string } = {}) => `/api/loop-runs${qs(params)}`,
    detail: (id: number | string) => `/api/loop-runs/${id}`,
    approve: (id: number | string) => `/api/loop-runs/${id}/approve`,
    reject: (id: number | string) => `/api/loop-runs/${id}/reject`,
    forceMeasure: (id: number | string) => `/api/loop-runs/${id}/force-measure`,
  },

  /* --- the human approval gate ------------------------------------------- */
  approvals: {
    queue: (params: { severity?: string; source?: string; sort?: string } = {}) =>
      `/api/approvals${qs(params)}`,
    detail: (runId: number | string) => `/api/approvals/${runId}`,
    decide: (runId: number | string) => `/api/approvals/${runId}/decision`,
    history: (runId: number | string) => `/api/approvals/${runId}/history`,
  },

  /* --- threats ----------------------------------------------------------- */
  threats: {
    list: () => '/api/threats',
    create: () => '/api/threats',
    detail: (id: number | string) => `/api/threats/${id}`,
  },

  /* --- human sensor reports ---------------------------------------------- */
  reports: {
    list: (params: { status?: string } = {}) => `/api/reports${qs(params)}`,
    mine: () => '/api/reports/my',
    create: () => '/api/reports',
    pushToLoop: (id: number | string) => `/api/reports/${id}/push-to-loop`,
    dismiss: (id: number | string) => `/api/reports/${id}/dismiss`,
  },

  /* --- training ---------------------------------------------------------- */
  training: {
    modules: (params: { status?: string } = {}) => `/api/training/modules${qs(params)}`,
    createModule: () => '/api/training/modules',
    module: (id: number | string) => `/api/training/modules/${id}`,
    updateModule: (id: number | string) => `/api/training/modules/${id}`,
    mine: () => '/api/training/my',
    assignment: (id: number | string) => `/api/training/assignments/${id}`,
    start: (id: number | string) => `/api/training/assignments/${id}/start`,
    complete: (id: number | string) => `/api/training/assignments/${id}/complete`,
    resources: (params: { topic?: string; channel?: string } = {}) =>
      `/api/training/resources${qs(params)}`,
    resourceTopics: () => '/api/training/resources/topics',
    moduleResources: (id: number | string) => `/api/training/modules/${id}/resources`,
    importResources: () => '/api/training/resources/import',
    reviewModule: (id: number | string) => `/api/training/modules/${id}/review`,
  },

  /* --- simulations ------------------------------------------------------- */
  simulations: {
    list: () => '/api/simulations',
    create: () => '/api/simulations',
    templates: () => '/api/simulations/templates',
    detail: (id: number | string) => `/api/simulations/${id}`,
    launch: (id: number | string) => `/api/simulations/${id}/launch`,
    complete: (id: number | string) => `/api/simulations/${id}/complete`,
    autoOutcomes: (id: number | string) => `/api/simulations/${id}/auto-outcomes`,
    targetOutcome: (simId: number | string, targetId: number | string) =>
      `/api/simulations/${simId}/targets/${targetId}/outcome`,
  },

  /* --- people ------------------------------------------------------------ */
  employees: {
    list: (params: { department_id?: number; q?: string } = {}) => `/api/employees${qs(params)}`,
    detail: (id: number | string) => `/api/employees/${id}`,
    me: () => '/api/employees/me',
    contestRiskEvent: (eventId: number | string) =>
      `/api/employees/me/risk-events/${eventId}/contest`,
  },
  departments: {
    list: () => '/api/departments',
  },

  /* --- curated intel feed (loop input) ----------------------------------- */
  feed: {
    list: () => '/api/feed',
    pushToLoop: (id: number | string) => `/api/feed/${id}/push-to-loop`,
  },

  /* --- Cyclowareness Sandbox --------------------------------------------- */
  sandbox: {
    capabilities: () => '/api/sandbox/capabilities',
    jobs: (params: { status?: string; limit?: number; offset?: number } = {}) =>
      `/api/sandbox/jobs${qs(params)}`,
    stats: () => '/api/sandbox/jobs/stats',
    job: (publicId: string) => `/api/sandbox/jobs/${publicId}`,
    upload: () => '/api/sandbox/upload',
    submitUrl: () => '/api/sandbox/url',
    password: (publicId: string) => `/api/sandbox/jobs/${publicId}/password`,
    reanalyze: (publicId: string) => `/api/sandbox/jobs/${publicId}/reanalyze`,
    feedback: (publicId: string) => `/api/sandbox/jobs/${publicId}/feedback`,
    exportJson: (publicId: string) => `/api/sandbox/jobs/${publicId}/export.json`,
    exportStix: (publicId: string) => `/api/sandbox/jobs/${publicId}/export.stix`,
    exportPdf: (publicId: string) => `/api/sandbox/jobs/${publicId}/export.pdf`,
    /** The technical facts sorted into the fields a NIS2 Article 23 early
     *  warning asks for. Explicitly a draft, never a filing. */
    exportIncident: (publicId: string) => `/api/sandbox/jobs/${publicId}/export.incident`,
    /** Canonical bytes plus a detached signature, for a recipient who does not
     *  trust this deployment. Produced in full even when unsigned. */
    exportSigned: (publicId: string) => `/api/sandbox/jobs/${publicId}/export.signed`,
  },

  /* --- remediation -------------------------------------------------------- */
  remediation: {
    plans: (params: { status?: string; limit?: number; offset?: number } = {}) =>
      `/api/remediation/plans${qs(params)}`,
    plan: (id: number | string) => `/api/remediation/plans/${id}`,
    mine: () => '/api/remediation/plans/mine',
    decision: (id: number | string) => `/api/remediation/plans/${id}/decision`,
    dispute: (id: number | string) => `/api/remediation/plans/${id}/dispute`,
    disputeResolution: (id: number | string) =>
      `/api/remediation/plans/${id}/dispute/resolution`,
    coverageGaps: () => '/api/remediation/coverage-gaps',
    controlGaps: () => '/api/remediation/control-gaps',
    stats: () => '/api/remediation/stats',
  },

  /* --- policy intelligence ----------------------------------------------- */
  policy: {
    policies: (params: { type?: string; status?: string; department?: string; q?: string } = {}) =>
      `/api/policy/policies${qs(params)}`,
    createPolicy: () => '/api/policy/policies',
    policy: (id: number | string) => `/api/policy/policies/${id}`,
    updatePolicy: (id: number | string) => `/api/policy/policies/${id}`,
    rules: (id: number | string) => `/api/policy/policies/${id}/rules`,
    extract: (id: number | string) => `/api/policy/policies/${id}/extract`,
    reviewRule: (ruleId: number | string) => `/api/policy/rules/${ruleId}/review`,
    versions: (id: number | string) => `/api/policy/policies/${id}/versions`,
    findings: (
      params: {
        severity?: string
        status?: string
        policy_id?: number
        department?: string
        technology?: string
        source?: string
        owner?: string
        due_before?: string
      } = {},
    ) => `/api/policy/findings${qs(params)}`,
    createFinding: () => '/api/policy/findings',
    finding: (id: number | string) => `/api/policy/findings/${id}`,
    updateFinding: (id: number | string) => `/api/policy/findings/${id}`,
    assignTraining: (id: number | string) => `/api/policy/findings/${id}/assign-training`,
    autoTrain: (id: number | string) => `/api/policy/findings/${id}/auto-train`,
    watch: () => '/api/policy/watch',
    watchRun: () => '/api/policy/watch/run',
    stats: () => '/api/policy/stats',
  },

  /* --- threat intelligence ----------------------------------------------- */
  intel: {
    items: (
      params: {
        source?: string
        intel_type?: string
        severity?: string
        relevance?: string
        q?: string
        since?: string
      } = {},
    ) => `/api/intel/items${qs(params)}`,
    item: (id: number | string) => `/api/intel/items/${id}`,
    assess: (id: number | string) => `/api/intel/items/${id}/assess`,
    dismiss: (id: number | string) => `/api/intel/items/${id}/dismiss`,
    createFinding: (id: number | string) => `/api/intel/items/${id}/create-finding`,
    matches: (params: { intel_item_id?: number } = {}) => `/api/intel/matches${qs(params)}`,
    refresh: () => '/api/intel/refresh',
    stats: () => '/api/intel/stats',
  },

  /* --- incident risks ---------------------------------------------------- */
  incidentRisks: {
    list: (params: { status?: string; severity?: string; risk_type?: string; q?: string } = {}) =>
      `/api/incident-risks${qs(params)}`,
    create: () => '/api/incident-risks',
    detail: (id: number | string) => `/api/incident-risks/${id}`,
    update: (id: number | string) => `/api/incident-risks/${id}`,
    addSubjects: (id: number | string) => `/api/incident-risks/${id}/subjects`,
    assign: (id: number | string) => `/api/incident-risks/${id}/assign`,
    autoTrain: (id: number | string) => `/api/incident-risks/${id}/auto-train`,
    reviewSubject: (id: number | string, subjectId: number | string) =>
      `/api/incident-risks/${id}/subjects/${subjectId}/review`,
    close: (id: number | string) => `/api/incident-risks/${id}/close`,
    reopen: (id: number | string) => `/api/incident-risks/${id}/reopen`,
    mine: () => '/api/incident-risks/my',
  },

  /* --- the Cyber AI assistant --------------------------------------------- */
  assistant: {
    chat: () => '/api/assistant/chat',
  },

  /* --- integrations ------------------------------------------------------ */
  integrations: {
    list: () => '/api/integrations',
    detail: (id: number | string) => `/api/integrations/${id}`,
    configure: (id: number | string) => `/api/integrations/${id}/configure`,
    sync: (id: number | string) => `/api/integrations/${id}/sync`,
    disable: (id: number | string) => `/api/integrations/${id}/disable`,
    courses: (id: number | string) => `/api/integrations/${id}/courses`,
    mapCourse: (courseId: number | string) => `/api/integrations/courses/${courseId}/map`,
  },

  /* --- audit ------------------------------------------------------------- */
  audit: {
    list: (
      params: {
        actor?: string
        action?: string
        object_type?: string
        object_id?: string
        since?: string
        until?: string
        q?: string
        limit?: number
      } = {},
    ) => `/api/audit${qs(params)}`,
    actions: () => '/api/audit/actions',
  },

  /* --- demo-only --------------------------------------------------------- */
  admin: {
    resetDemo: () => '/api/admin/reset-demo',
  },
} as const

/** The live loop stream. Same origin, token presented in the first frame. */
export function loopStreamUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (base) {
    const url = new URL(base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/api/ws'
    return url.toString()
  }
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/api/ws`
}
