/**
 * Attributing the dashboard's recent risk events to people and departments.
 *
 * This is the only per-person history the product can show without one request
 * per row: `/api/dashboard/analyst` returns the tail of the risk-event log, and
 * everything derived here is that tail rearranged. It is a small window — a
 * dozen events organisation-wide — so every surface that renders it states the
 * sample size next to it.
 *
 * The payload identifies a person by NAME and carries no id. A name shared by
 * two people is therefore genuinely ambiguous, and those events are dropped
 * rather than charged to whichever row sorted first. `unattributed` counts them,
 * so a screen can say how much of the tail it could not place.
 */

import type { AnalystDashboard, DepartmentRisk, Employee } from '../../domain/types'

export interface DeltaEvent {
  delta: number
  created_at: string
}

export interface Attribution {
  /** Events per employee id, newest first — the order the API returned them. */
  byEmployee: Map<number, DeltaEvent[]>
  /** Change each department's average risk took from those events. */
  byDepartment: Map<number, number>
  /** Events that could be placed on exactly one person. */
  attributed: number
  /** Events whose name matched nobody, or matched more than one person. */
  unattributed: number
}

const EMPTY: Attribution = {
  byEmployee: new Map(),
  byDepartment: new Map(),
  attributed: 0,
  unattributed: 0,
}

export function attributeRecentEvents(
  employees: Employee[] | undefined,
  departments: DepartmentRisk[] | undefined,
  events: AnalystDashboard['recent_events'] | undefined,
): Attribution {
  if (!employees || employees.length === 0 || !events || events.length === 0) return EMPTY

  const nameCounts = new Map<string, number>()
  for (const person of employees) {
    nameCounts.set(person.name, (nameCounts.get(person.name) ?? 0) + 1)
  }
  const idByName = new Map<string, number>()
  const departmentOf = new Map<number, number>()
  for (const person of employees) {
    if (nameCounts.get(person.name) === 1) idByName.set(person.name, person.id)
    departmentOf.set(person.id, person.department_id)
  }

  const byEmployee = new Map<number, DeltaEvent[]>()
  const departmentDeltaSum = new Map<number, number>()
  let attributed = 0
  let unattributed = 0

  for (const event of events) {
    const employeeId = idByName.get(event.employee_name)
    if (employeeId === undefined) {
      unattributed += 1
      continue
    }
    attributed += 1

    const list = byEmployee.get(employeeId) ?? []
    list.push({ delta: event.delta, created_at: event.created_at })
    byEmployee.set(employeeId, list)

    const departmentId = departmentOf.get(employeeId)
    if (departmentId !== undefined) {
      departmentDeltaSum.set(departmentId, (departmentDeltaSum.get(departmentId) ?? 0) + event.delta)
    }
  }

  // A department's average moves by the sum of its people's deltas divided by
  // its headcount — the same denominator the server used for `avg_risk`.
  const headcount = new Map<number, number>()
  for (const department of departments ?? []) headcount.set(department.id, department.employee_count)

  const byDepartment = new Map<number, number>()
  for (const [departmentId, sum] of departmentDeltaSum) {
    const people = headcount.get(departmentId)
    if (!people || people <= 0) continue
    byDepartment.set(departmentId, Math.round((sum / people) * 10) / 10)
  }

  return { byEmployee, byDepartment, attributed, unattributed }
}
