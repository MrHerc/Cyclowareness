/**
 * The evidence packs this product describes, and the one it can actually emit.
 *
 * A reports screen is where a security product is most tempted to lie. The
 * cheapest version offers eight handsome cards with a Generate button behind
 * each, and seven of them do nothing — which nobody discovers until an auditor
 * asks for the file. So this table separates two facts that are usually blurred:
 * what a pack would *contain*, and whether this deployment can *produce* it.
 *
 * Only the sandbox exports are produced here. They have real routes
 * (`endpoints.sandbox.export*`) that return real bytes. Everything else in this
 * table names the records it would be built from, counts them from the live
 * API so the coverage claim is checkable, and then says plainly what is
 * missing — rather than offering a button that would produce nothing.
 */

import { Building2, Landmark, Radar, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { Permission } from '../../lib/auth/permissions'

/** Whether the measurement window scopes the pack, or it is a point-in-time read. */
export type ReportScoping = 'range' | 'snapshot'

export interface ReportType {
  id: string
  title: string
  icon: LucideIcon
  /**
   * What a reader needs to be allowed to see before the coverage can be
   * counted. An executive can open this page and cannot read loop runs, and a
   * count they are not entitled to is not a count worth faking.
   */
  permission: Permission
  /** Who reads it and what question it answers. */
  purpose: string
  /** The sections it would carry, each one traceable to a record that exists. */
  contains: string[]
  scoping: ReportScoping
  /** Plural noun for the denominator: "closed loops", "open findings". */
  sampleNoun: string
  /** What would put records behind it, shown when the count is zero. */
  emptyHint: string
  /** The live screen holding the same records today — never a dead end. */
  surface: { to: string; label: string }
  /** Exactly which capability is absent. Named, not hedged. */
  missing: string
}

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'closed-loop-evidence',
    title: 'Closed-loop evidence pack',
    icon: Radar,
    permission: 'loops.view',
    purpose:
      'The document a regulator or an insurer asks for: proof that a real threat reached a real person and that something measurable happened afterwards.',
    contains: [
      'Every stage of each run with its start and completion time',
      'The originating threat, its sandbox verdict and the extracted indicators',
      'The approval decision, the analyst who made it and the comment they left',
      'Why each person was targeted, in the risk engine’s own words',
      'Completion, quiz score and the risk delta recorded per person',
    ],
    scoping: 'range',
    sampleNoun: 'loop runs closed in the window',
    emptyHint:
      'A run appears here once it passes measurement. Push a threat through the loop and approve it to start the count.',
    surface: { to: '/loops', label: 'Open Closed Loops' },
    missing:
      'The platform has no report-generation route. The records exist and are served by /api/loop-runs, but nothing renders them into a signed, timestamped document.',
  },
  {
    id: 'department-risk',
    title: 'Department risk report',
    icon: Building2,
    permission: 'departments.view',
    purpose:
      'Where the human risk concentrates, for a leadership review — the rollup an executive is asked to act on quarterly.',
    contains: [
      'Average risk score per department with its headcount',
      'How many people in each sit in the high band',
      'The factors contributing to each score, from the risk engine breakdown',
      'Movement since the previous review, where two periods were measured',
    ],
    scoping: 'snapshot',
    sampleNoun: 'departments in the organisation',
    emptyHint:
      'Departments appear once the organisation is loaded. An empty organisation has no risk to roll up.',
    surface: { to: '/departments', label: 'Open Departments' },
    missing:
      'No export route exists for the department rollup. It is also a point-in-time read: the platform stores today’s scores, not a per-day history it could re-derive a past quarter from.',
  },
  {
    id: 'policy-exposure',
    title: 'Policy exposure report',
    icon: Landmark,
    permission: 'policy.view',
    purpose:
      'Every place the world has moved away from a rule this organisation wrote down, with the passage each rule came from.',
    contains: [
      'Each finding with its severity, status and the technology it concerns',
      'The policy and the extracted rule it contradicts, quoted',
      'The advisory or intelligence item that raised it, with its source reference',
      'Departments and people in scope, and any training already assigned',
    ],
    scoping: 'range',
    sampleNoun: 'findings detected in the window',
    emptyHint:
      'A finding is raised when intelligence matches an extracted policy rule, or when an analyst records one directly.',
    surface: { to: '/policy-intelligence/findings', label: 'Open Findings' },
    missing:
      'No export route exists under /api/policy. Findings are readable and filterable through the API; nothing serialises them into a pack.',
  },
  {
    id: 'incident-remediation',
    title: 'Incident-risk remediation report',
    icon: ShieldAlert,
    permission: 'incident_risks.view',
    purpose:
      'What incident response asked of named people, and whether it was completed to the standard that was set.',
    contains: [
      'Each incident risk with its reference, type, severity and closure criteria',
      'The people it was raised against, redacted by confidentiality where required',
      'Assigned remediation, the minimum score demanded and the score achieved',
      'The reviewer decision per subject, and the closure note',
    ],
    scoping: 'range',
    sampleNoun: 'incident risks raised in the window',
    emptyHint:
      'An incident risk appears when incident response records one against a person or a department.',
    surface: { to: '/incident-risks', label: 'Open Incident Risks' },
    missing:
      'No export route exists under /api/incident-risks. This pack would also need a redaction projection — the subject records carry restricted detail that must not leave the platform unfiltered.',
  },
]

/* ============================================================================
   Windowing
   ========================================================================== */

/**
 * Whether a backend timestamp falls inside an inclusive calendar window.
 *
 * The server stores UTC, so the day is taken from the timestamp's own prefix
 * rather than from a local-time conversion. That keeps the count stable no
 * matter which timezone the screen is being read in — a report whose coverage
 * changes with the viewer's laptop clock is not evidence of anything.
 */
export function inRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return false
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}
