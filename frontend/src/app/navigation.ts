/**
 * The navigation model — one table that the router, the sidebar and the command
 * palette all read.
 *
 * They read the same source deliberately: a menu item that points at a route
 * nobody registered is the most common way a demo dies, and the only reliable
 * cure is to make it structurally impossible to have one without the other.
 * If it is in this list it has a route, a permission and an icon; if it is not,
 * it does not appear anywhere.
 */

import {
  Activity,
  BadgeCheck,
  Boxes,
  Building2,
  FileSearch,
  FileText,
  GaugeCircle,
  GraduationCap,
  Inbox,
  Landmark,
  LayoutDashboard,
  Link2,
  Radar,
  ScrollText,
  Send,
  LifeBuoy,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '../lib/auth/permissions'
import type { MessageKey } from '../lib/i18n'

export interface NavItem {
  /** Stable id — used by the command palette and for analytics. */
  id: string
  /** English label. Kept as the source string, and what renders under `en`. */
  label: string
  /** Message key for the same label. Every item has one, so a locale cannot
   *  silently fall back to English for part of the menu. */
  labelKey: MessageKey
  /** Message key for `hint`. */
  hintKey?: MessageKey
  to: string
  icon: LucideIcon
  permission: Permission
  /** Only matches when the URL is exactly `to` (used for index routes). */
  end?: boolean
  /** Short line shown in the command palette and collapsed-rail tooltip. */
  hint?: string
  /** Renders a live count badge from the analyst dashboard payload. */
  badge?: 'approvals' | 'threats' | 'runs' | 'incidents'
}

export interface NavSection {
  id: string
  label: string
  labelKey: MessageKey
  items: NavItem[]
}

// Sentence case, matching each destination's own <h1>. The sidebar said
// "Approval Gate" while the page it opens says "Approval gate" — the same item
// in two casings, a few hundred pixels apart. "Command Center" and "Training
// Studio" keep their capitals because their pages do: they read as names of
// surfaces rather than as descriptions of them.
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operate',
    label: 'Operate',
    labelKey: 'nav.section.operate',
    items: [
      {
        id: 'command-center',
        label: 'Command Center',
        labelKey: 'nav.command-center',
        to: '/command-center',
        icon: LayoutDashboard,
        permission: 'command_center.view',
        end: true,
        hint: 'Live operational picture',
        hintKey: 'nav.command-center.hint',
      },
      {
        id: 'loops',
        label: 'Closed loops',
        labelKey: 'nav.loops',
        to: '/loops',
        icon: Radar,
        permission: 'loops.view',
        hint: 'Every threat travelling the seven stages',
        hintKey: 'nav.loops.hint',
        badge: 'runs',
      },
      {
        id: 'threats',
        label: 'Threat intake',
        labelKey: 'nav.threats',
        to: '/threats',
        icon: Inbox,
        permission: 'threats.view',
        hint: 'What entered the platform, and from where',
        hintKey: 'nav.threats.hint',
        badge: 'threats',
      },
      {
        id: 'approvals',
        label: 'Approval gate',
        labelKey: 'nav.approvals',
        to: '/approvals',
        icon: BadgeCheck,
        permission: 'approvals.view',
        hint: 'Nothing reaches an employee without a human here',
        hintKey: 'nav.approvals.hint',
        badge: 'approvals',
      },
    ],
  },
  {
    id: 'programme',
    label: 'Programme',
    labelKey: 'nav.section.programme',
    items: [
      {
        id: 'simulations',
        label: 'Simulations',
        labelKey: 'nav.simulations',
        to: '/simulations',
        icon: Send,
        permission: 'simulations.view',
        hint: 'Safe campaigns built from real threats',
        hintKey: 'nav.simulations.hint',
      },
      {
        id: 'training',
        label: 'Training Studio',
        labelKey: 'nav.training',
        to: '/training',
        icon: GraduationCap,
        permission: 'training.view',
        hint: 'Author, review and version training content',
        hintKey: 'nav.training.hint',
      },
      {
        id: 'sandbox',
        label: 'Sandbox',
        labelKey: 'nav.sandbox',
        to: '/sandbox',
        icon: Boxes,
        permission: 'sandbox.view',
        hint: 'Static and behavioural analysis of files and URLs',
        hintKey: 'nav.sandbox.hint',
      },
    ],
  },
  {
    id: 'people',
    label: 'People & risk',
    labelKey: 'nav.section.people',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        labelKey: 'nav.employees',
        to: '/employees',
        icon: Users,
        permission: 'employees.view',
        hint: 'Individual behaviour and risk history',
        hintKey: 'nav.employees.hint',
      },
      {
        id: 'departments',
        label: 'Departments',
        labelKey: 'nav.departments',
        to: '/departments',
        icon: Building2,
        permission: 'departments.view',
        hint: 'Where the risk concentrates',
        hintKey: 'nav.departments.hint',
      },
      {
        id: 'risk-profiles',
        label: 'Risk profiles',
        labelKey: 'nav.risk-profiles',
        to: '/risk-profiles',
        icon: GaugeCircle,
        permission: 'risk.view',
        hint: 'How every score was actually derived',
        hintKey: 'nav.risk-profiles.hint',
      },
      {
        id: 'remediation',
        label: 'Remediation',
        labelKey: 'nav.remediation',
        to: '/remediation',
        icon: LifeBuoy,
        permission: 'remediation.view',
        hint: 'What gets attached to a person, and what deliberately does not',
        hintKey: 'nav.remediation.hint',
      },
      {
        id: 'incident-risks',
        label: 'Incident risks',
        labelKey: 'nav.incident-risks',
        to: '/incident-risks',
        icon: ShieldAlert,
        permission: 'incident_risks.view',
        hint: 'Risk raised by incident response against people',
        hintKey: 'nav.incident-risks.hint',
        badge: 'incidents',
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    labelKey: 'nav.section.governance',
    items: [
      {
        id: 'policy',
        label: 'Policy intelligence',
        labelKey: 'nav.policy',
        to: '/policy-intelligence',
        icon: Landmark,
        permission: 'policy.view',
        hint: 'Policies, extracted rules and drift findings',
        hintKey: 'nav.policy.hint',
      },
      {
        id: 'intel',
        label: 'Threat intelligence',
        labelKey: 'nav.intel',
        to: '/threat-intelligence',
        icon: Activity,
        permission: 'intel.view',
        hint: 'External advisories matched to what we run',
        hintKey: 'nav.intel.hint',
      },
      {
        id: 'reports',
        label: 'Reports',
        labelKey: 'nav.reports',
        to: '/reports',
        icon: FileText,
        permission: 'reports.view',
        hint: 'Evidence packs and exports',
        hintKey: 'nav.reports.hint',
      },
      {
        id: 'executive',
        label: 'Executive view',
        labelKey: 'nav.executive',
        to: '/executive',
        icon: FileSearch,
        permission: 'executive.view',
        hint: 'The one-screen posture read',
        hintKey: 'nav.executive.hint',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    labelKey: 'nav.section.system',
    items: [
      {
        id: 'integrations',
        label: 'Integrations',
        labelKey: 'nav.integrations',
        to: '/integrations',
        icon: Link2,
        permission: 'integrations.view',
        hint: 'LMS, SSO and identity connections',
        hintKey: 'nav.integrations.hint',
      },
      {
        id: 'audit',
        label: 'Audit log',
        labelKey: 'nav.audit',
        to: '/audit-log',
        icon: ScrollText,
        permission: 'audit.view',
        hint: 'Every material change, and who made it',
        hintKey: 'nav.audit.hint',
      },
    ],
  },
]

/** The employee's much smaller world. */
export const EMPLOYEE_NAV: NavItem[] = [
  {
    id: 'portal',
    label: 'My security',
    labelKey: 'nav.portal',
    to: '/portal',
    icon: GraduationCap,
    permission: 'portal.view',
    end: true,
    hint: 'Your assigned training and your risk score',
    hintKey: 'nav.portal.hint',
  },
]

/** Flattened, for the command palette and for route generation. */
export function allNavItems(): NavItem[] {
  return [...NAV_SECTIONS.flatMap((section) => section.items), ...EMPLOYEE_NAV]
}

/** The sections a given role can actually see, with empty sections removed. */
export function visibleSections(canDo: (permission: Permission) => boolean): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canDo(item.permission)),
  })).filter((section) => section.items.length > 0)
}
