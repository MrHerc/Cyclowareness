/**
 * Which parts of the product are backed by a real endpoint, and which are not.
 *
 * This file is the reason a viewer can trust anything on the screen. Every
 * surface declares its backing, the UI renders a badge from that declaration,
 * and there is exactly one place to look when someone asks "is this number
 * real?". A surface that is not listed here is assumed LIVE — so adding a
 * demo-backed screen without declaring it is a mistake that shows up as an
 * unlabelled claim, which is the failure mode this table exists to prevent.
 *
 * The rule: demonstration data may fill a surface whose backend does not exist
 * yet. It may NEVER be blended into a live organisational metric — a chart that
 * mixes measured and invented points is worse than an empty chart.
 */

export type Backing =
  /** A real endpoint answers this, with real (seeded or production) data. */
  | 'live'
  /** A real endpoint answers, but the demo world is seeded — labelled in demo mode. */
  | 'seeded'
  /** No backend yet: the screen is a designed demonstration and says so. */
  | 'demo'
  /** The capability genuinely does not exist here; the screen says so plainly. */
  | 'unavailable'

export interface SurfaceBacking {
  id: string
  label: string
  backing: Backing
  /** Shown in the badge tooltip. Say what is real and what is not. */
  note: string
}

export const SURFACES: Record<string, SurfaceBacking> = {
  'command-center': {
    id: 'command-center',
    label: 'Command Center',
    backing: 'live',
    note: 'Every figure is served by the platform API from the working database.',
  },
  loops: {
    id: 'loops',
    label: 'Closed Loops',
    backing: 'live',
    note: 'Real LoopRun records. The stages you see are the stages that executed.',
  },
  threats: {
    id: 'threats',
    label: 'Threat Intake',
    backing: 'live',
    note: 'Real Threat records from reports, the curated feed and analyst submissions.',
  },
  approvals: {
    id: 'approvals',
    label: 'Approval Gate',
    backing: 'live',
    note: 'The queue is derived from loop runs actually waiting for a human decision.',
  },
  sandbox: {
    id: 'sandbox',
    label: 'Sandbox',
    backing: 'live',
    note: 'ZORBOX performs real static analysis. Dynamic detonation runs off-host and is reported as not run.',
  },
  simulations: {
    id: 'simulations',
    label: 'Simulations',
    backing: 'live',
    note: 'Campaign records and outcomes come from the platform. Delivery is not wired to a mail gateway.',
  },
  training: {
    id: 'training',
    label: 'Training',
    backing: 'live',
    note: 'Modules, assignments and quiz results are real records.',
  },
  employees: {
    id: 'employees',
    label: 'Employees',
    backing: 'seeded',
    note: 'A fictional organisation (Caspian Dynamics) is seeded for demonstration. The risk model operating on it is the real one.',
  },
  'policy-intelligence': {
    id: 'policy-intelligence',
    label: 'Policy Intelligence',
    backing: 'seeded',
    note: 'Policies, extracted rules and findings are seeded demonstration records served by the real API.',
  },
  'threat-intelligence': {
    id: 'threat-intelligence',
    label: 'Threat Intelligence',
    backing: 'seeded',
    note: 'Advisories are seeded. No external feed is connected — refreshing reports that honestly rather than inventing items.',
  },
  'incident-risks': {
    id: 'incident-risks',
    label: 'Incident Risks',
    backing: 'seeded',
    note: 'Seeded incident-response findings served by the real API, including the redaction path.',
  },
  integrations: {
    id: 'integrations',
    label: 'Integrations',
    backing: 'unavailable',
    note: 'No external LMS or SSO provider is connected. Connection states are real; course data is demonstration data.',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    backing: 'live',
    note: 'Exports are generated from the same records the screens read.',
  },
  audit: {
    id: 'audit',
    label: 'Audit Log',
    backing: 'live',
    note: 'Written by the API on every material change.',
  },
}

export function backingFor(surfaceId: string): SurfaceBacking {
  return (
    SURFACES[surfaceId] ?? {
      id: surfaceId,
      label: surfaceId,
      backing: 'live',
      note: 'Served by the platform API.',
    }
  )
}

/** Product name is configurable so a pilot can white-label the demo. */
export const PRODUCT_NAME: string =
  (import.meta.env.VITE_PRODUCT_NAME as string | undefined) ?? 'Cyclowareness'

/**
 * Seeded demo accounts, shown on the sign-in screen only when the deployment
 * reports `demo_mode`. In a production build these buttons would 401 on every
 * click, so the UI asks the server first rather than rendering them blindly.
 */
export const DEMO_ACCOUNTS = [
  {
    role: 'Security analyst',
    email: 'analyst@caspiandynamics.az',
    password: 'analyst123',
    description: 'The operational command centre and every governance surface',
  },
  {
    role: 'Employee — Finance',
    email: 'leyla.aliyeva@caspiandynamics.az',
    password: 'demo123',
    description: 'A targeted employee with assigned training',
  },
  {
    role: 'Employee — high risk',
    email: 'rashad.mammadov@caspiandynamics.az',
    password: 'demo123',
    description: 'Repeated simulation failures and a raised risk score',
  },
  {
    role: 'Executive',
    email: 'exec@caspiandynamics.az',
    password: 'exec123',
    description: 'Read-only posture view',
  },
] as const
