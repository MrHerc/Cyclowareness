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

export interface NavItem {
  /** Stable id — used by the command palette and for analytics. */
  id: string
  label: string
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
    items: [
      {
        id: 'command-center',
        label: 'Command Center',
        to: '/command-center',
        icon: LayoutDashboard,
        permission: 'command_center.view',
        end: true,
        hint: 'Live operational picture',
      },
      {
        id: 'loops',
        label: 'Closed loops',
        to: '/loops',
        icon: Radar,
        permission: 'loops.view',
        hint: 'Every threat travelling the seven stages',
        badge: 'runs',
      },
      {
        id: 'threats',
        label: 'Threat intake',
        to: '/threats',
        icon: Inbox,
        permission: 'threats.view',
        hint: 'What entered the platform, and from where',
        badge: 'threats',
      },
      {
        id: 'approvals',
        label: 'Approval gate',
        to: '/approvals',
        icon: BadgeCheck,
        permission: 'approvals.view',
        hint: 'Nothing reaches an employee without a human here',
        badge: 'approvals',
      },
    ],
  },
  {
    id: 'programme',
    label: 'Programme',
    items: [
      {
        id: 'simulations',
        label: 'Simulations',
        to: '/simulations',
        icon: Send,
        permission: 'simulations.view',
        hint: 'Safe campaigns built from real threats',
      },
      {
        id: 'training',
        label: 'Training Studio',
        to: '/training',
        icon: GraduationCap,
        permission: 'training.view',
        hint: 'Author, review and version training content',
      },
      {
        id: 'sandbox',
        label: 'Sandbox',
        to: '/sandbox',
        icon: Boxes,
        permission: 'sandbox.view',
        hint: 'Static and behavioural analysis of files and URLs',
      },
    ],
  },
  {
    id: 'people',
    label: 'People & risk',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        to: '/employees',
        icon: Users,
        permission: 'employees.view',
        hint: 'Individual behaviour and risk history',
      },
      {
        id: 'departments',
        label: 'Departments',
        to: '/departments',
        icon: Building2,
        permission: 'departments.view',
        hint: 'Where the risk concentrates',
      },
      {
        id: 'risk-profiles',
        label: 'Risk profiles',
        to: '/risk-profiles',
        icon: GaugeCircle,
        permission: 'risk.view',
        hint: 'How every score was actually derived',
      },
      {
        id: 'remediation',
        label: 'Remediation',
        to: '/remediation',
        icon: LifeBuoy,
        permission: 'remediation.view',
        hint: 'What gets attached to a person, and what deliberately does not',
      },
      {
        id: 'incident-risks',
        label: 'Incident risks',
        to: '/incident-risks',
        icon: ShieldAlert,
        permission: 'incident_risks.view',
        hint: 'Risk raised by incident response against people',
        badge: 'incidents',
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    items: [
      {
        id: 'policy',
        label: 'Policy intelligence',
        to: '/policy-intelligence',
        icon: Landmark,
        permission: 'policy.view',
        hint: 'Policies, extracted rules and drift findings',
      },
      {
        id: 'intel',
        label: 'Threat intelligence',
        to: '/threat-intelligence',
        icon: Activity,
        permission: 'intel.view',
        hint: 'External advisories matched to what we run',
      },
      {
        id: 'reports',
        label: 'Reports',
        to: '/reports',
        icon: FileText,
        permission: 'reports.view',
        hint: 'Evidence packs and exports',
      },
      {
        id: 'executive',
        label: 'Executive view',
        to: '/executive',
        icon: FileSearch,
        permission: 'executive.view',
        hint: 'The one-screen posture read',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'integrations',
        label: 'Integrations',
        to: '/integrations',
        icon: Link2,
        permission: 'integrations.view',
        hint: 'LMS, SSO and identity connections',
      },
      {
        id: 'audit',
        label: 'Audit log',
        to: '/audit-log',
        icon: ScrollText,
        permission: 'audit.view',
        hint: 'Every material change, and who made it',
      },
    ],
  },
]

/** The employee's much smaller world. */
export const EMPLOYEE_NAV: NavItem[] = [
  {
    id: 'portal',
    label: 'My security',
    to: '/portal',
    icon: GraduationCap,
    permission: 'portal.view',
    end: true,
    hint: 'Your assigned training and your risk score',
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
