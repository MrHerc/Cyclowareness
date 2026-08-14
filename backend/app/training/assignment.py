"""Shared assignment mechanics for the finding→training pipeline.

Both auto-train endpoints and the module-review origin hook create the same
rows the same way, so the loop lives here once. The rules it enforces are the
ones the hand-assignment endpoints already state: only ACTIVE employees, no
duplicate open assignment for the same module, every skip named with its
reason.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    AssignmentStatus,
    Employee,
    EmployeeStatus,
    TrainingAssignment,
    TrainingModule,
)


def assign_module_to_employees(
    db: Session,
    module: TrainingModule,
    employee_ids: list[int],
    reason: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Create assignments; return (assigned, skipped), both fully explained."""
    requested = list(dict.fromkeys(e for e in employee_ids if isinstance(e, int)))
    employees = {
        e.id: e
        for e in db.execute(select(Employee).where(Employee.id.in_(requested))).scalars().all()
    }
    already_open = {
        a.employee_id
        for a in db.execute(
            select(TrainingAssignment).where(
                TrainingAssignment.module_id == module.id,
                TrainingAssignment.employee_id.in_(requested),
                TrainingAssignment.status.in_(
                    [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                ),
            )
        ).scalars().all()
    }

    assigned: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for employee_id in requested:
        employee = employees.get(employee_id)
        if employee is None:
            skipped.append({"employee_id": employee_id, "reason": "No such employee record"})
            continue
        if employee.status != EmployeeStatus.ACTIVE:
            skipped.append(
                {
                    "employee_id": employee_id,
                    "name": employee.name,
                    "reason": f"Employment status is {employee.status}",
                }
            )
            continue
        if employee_id in already_open:
            skipped.append(
                {
                    "employee_id": employee_id,
                    "name": employee.name,
                    "reason": "Already has an open assignment for this module",
                }
            )
            continue
        assignment = TrainingAssignment(
            module_id=module.id,
            employee_id=employee_id,
            loop_run_id=None,
            targeting_reasons=[reason],
        )
        db.add(assignment)
        db.flush()
        assigned.append(
            {"employee_id": employee_id, "name": employee.name, "assignment_id": assignment.id}
        )
    return assigned, skipped
