/**
 * Roles and what they may do.
 *
 * The server is the authority — every one of these permissions is also enforced
 * by a FastAPI dependency, and this table exists to stop the UI *offering* an
 * action that would come back 403. A permission check here is a courtesy to the
 * user, never a security control, and nothing in this file should ever be the
 * only thing standing between a caller and an operation.
 */

import type { RoleName } from '../../domain/types'

export type Permission =
  // operational surfaces
  | 'command_center.view'
  | 'loops.view'
  | 'threats.view'
  | 'threats.submit'
  | 'approvals.view'
  | 'approvals.decide'
  | 'simulations.view'
  | 'simulations.manage'
  | 'training.view'
  | 'training.author'
  | 'sandbox.view'
  | 'sandbox.submit'
  // people and risk
  | 'employees.view'
  | 'departments.view'
  | 'risk.view'
  // governance
  | 'incident_risks.view'
  | 'incident_risks.manage'
  | 'policy.view'
  | 'policy.manage'
  | 'intel.view'
  | 'intel.manage'
  | 'integrations.view'
  | 'integrations.manage'
  | 'audit.view'
  | 'reports.view'
  // read-only leadership
  | 'executive.view'
  // the employee's own surfaces
  | 'portal.view'
  | 'portal.report'
  // demo affordances
  | 'demo.reset'

const ANALYST: Permission[] = [
  'command_center.view',
  'loops.view',
  'threats.view',
  'threats.submit',
  'approvals.view',
  'approvals.decide',
  'simulations.view',
  'simulations.manage',
  'training.view',
  'training.author',
  'sandbox.view',
  'sandbox.submit',
  'employees.view',
  'departments.view',
  'risk.view',
  'incident_risks.view',
  'incident_risks.manage',
  'policy.view',
  'policy.manage',
  'intel.view',
  'intel.manage',
  'integrations.view',
  'integrations.manage',
  'audit.view',
  'reports.view',
  'executive.view',
  // NOT `portal.view` / `portal.report`. The employee portal is scoped to the
  // session's `employee_id`, and an analyst account has none — every query
  // behind it answers 403. Holding the permission put "My Security" in the
  // command palette and let the route guard pass, so selecting it rendered a
  // page header over a full-width error.
  //
  // This file's own docstring says it "exists to stop the UI *offering* an
  // action that would come back 403". This was the one entry doing the opposite.
  //
  // An analyst who is ALSO an employee is a real case, and the fix for it is a
  // session that carries an employee_id — not a permission granted to the role.
  'demo.reset',
]

const EXECUTIVE: Permission[] = ['executive.view', 'departments.view', 'reports.view']

const EMPLOYEE: Permission[] = ['portal.view', 'portal.report']

const MATRIX: Record<RoleName, Permission[]> = {
  analyst: ANALYST,
  executive: EXECUTIVE,
  employee: EMPLOYEE,
}

export function permissionsFor(role: RoleName | undefined): Set<Permission> {
  return new Set(role ? MATRIX[role] : [])
}

export function can(role: RoleName | undefined, permission: Permission): boolean {
  return permissionsFor(role).has(permission)
}

/** Where each role lands after signing in. */
export function homeFor(role: RoleName | undefined): string {
  if (role === 'analyst') return '/command-center'
  if (role === 'executive') return '/executive'
  if (role === 'employee') return '/portal'
  return '/login'
}

export const ROLE_LABEL: Record<RoleName, string> = {
  analyst: 'Security analyst',
  employee: 'Employee',
  executive: 'Executive',
}
