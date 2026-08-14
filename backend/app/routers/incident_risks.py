"""Incident-risk API — the obligations incident response charges to named people.

This is the one part of the platform that makes a demand of an employee on
another team's authority, and three things follow from that.

**The employee view is a different model, not a filtered field list.**
``GET /my`` returns ``IncidentRiskEmployeeView``, which withholds the narrative
and the evidence above ``internal`` confidentiality — an investigation routinely
names other people — and says in words that it withheld them and who to ask.
Redaction implemented as an ``if`` in one route is redaction that leaks the
first time a new route forgets it.

**An obligation nobody can discharge is not an obligation.** ``POST /assign``
reports every requirement the incident declared, fulfilled or not. A risk that
asks for a sandbox exercise gets told, in the response, that nothing in this
deployment can assign one — rather than quietly producing three assignments and
letting the closure criteria fail four days later for a reason nobody recorded.

**Closing and reopening cost a sentence.** Both take a mandatory note, and
neither is reachable through ``PATCH``: a status field that could reach
``closed`` would let a caller discharge an obligation against a named person
without stating why.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    AssignmentStatus,
    Department,
    Employee,
    EmployeeStatus,
    ModuleStatus,
    TrainingAssignment,
    TrainingModule,
    User,
)
from ..platform.models import (
    AuditEvent,
    Confidentiality,
    IncidentRisk,
    IncidentRiskStatus,
    IncidentRiskSubject,
    IncidentRiskType,
    ReviewerDecision,
    Severity,
    SubjectStatus,
    record,
)
from ..platform.schemas import (
    AssignedSubject,
    IncidentRiskAssign,
    IncidentRiskAssignRequest,
    IncidentRiskAssignResult,
    IncidentRiskClose,
    IncidentRiskCreate,
    IncidentRiskDetail,
    IncidentRiskEmployeeView,
    IncidentRiskOut,
    IncidentRiskPage,
    IncidentRiskReopen,
    IncidentRiskSubjectDetail,
    IncidentRiskSubjectReview,
    IncidentRiskTimelineEntry,
    IncidentRiskUpdate,
    RequirementOutcome,
    SkippedSubject,
)
from ..schemas import AutoTrainResource, AutoTrainResult
from ..training import pipeline as training_pipeline
from ..security import get_current_user, require_analyst

router = APIRouter(prefix="/api/incident-risks", tags=["incident-risk"])

MAX_LIMIT = 200

_SEVERITIES = frozenset(
    {Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO}
)
_CONFIDENTIALITIES = frozenset(
    {
        Confidentiality.PUBLIC,
        Confidentiality.INTERNAL,
        Confidentiality.RESTRICTED,
        Confidentiality.SECRET,
    }
)
_RISK_TYPES = frozenset(
    {
        IncidentRiskType.USER_ACTION,
        IncidentRiskType.PRIVILEGED_EXPOSURE,
        IncidentRiskType.DATA_MISHANDLING,
        IncidentRiskType.PROCEDURE_FAILURE,
        IncidentRiskType.ALERT_FATIGUE,
        IncidentRiskType.KNOWLEDGE_GAP,
    }
)

#: Which status moves ``PATCH`` will make. ``closed`` and ``reopened`` are
#: absent from every target set on purpose — they belong to the endpoints that
#: demand a written reason.
_TRANSITIONS: dict[str, frozenset[str]] = {
    IncidentRiskStatus.DRAFT: frozenset({IncidentRiskStatus.OPEN}),
    IncidentRiskStatus.OPEN: frozenset(
        {IncidentRiskStatus.ASSIGNED, IncidentRiskStatus.IN_PROGRESS}
    ),
    IncidentRiskStatus.ASSIGNED: frozenset(
        {IncidentRiskStatus.IN_PROGRESS, IncidentRiskStatus.AWAITING_REVIEW}
    ),
    IncidentRiskStatus.IN_PROGRESS: frozenset(
        {IncidentRiskStatus.ASSIGNED, IncidentRiskStatus.AWAITING_REVIEW}
    ),
    IncidentRiskStatus.AWAITING_REVIEW: frozenset({IncidentRiskStatus.IN_PROGRESS}),
    IncidentRiskStatus.REOPENED: frozenset(
        {
            IncidentRiskStatus.ASSIGNED,
            IncidentRiskStatus.IN_PROGRESS,
            IncidentRiskStatus.AWAITING_REVIEW,
        }
    ),
    IncidentRiskStatus.CLOSED: frozenset(),
}

#: Statuses from which assigning is still meaningful, and which assigning moves
#: on to ``assigned``.
_PRE_ASSIGNMENT = (
    IncidentRiskStatus.DRAFT,
    IncidentRiskStatus.OPEN,
    IncidentRiskStatus.REOPENED,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _request_context(request: Request) -> dict[str, str | None]:
    """IP and user agent for the audit entry.

    Recorded because "who changed this" is only half an answer when several
    people share a role account, and because a change made from an unexpected
    address is the first thing anyone looks for afterwards.
    """
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": (request.headers.get("user-agent") or "")[:255] or None,
    }


def _risk_or_404(db: Session, risk_id: int) -> IncidentRisk:
    risk = db.get(IncidentRisk, risk_id)
    if risk is None:
        raise HTTPException(status_code=404, detail="Incident risk not found")
    return risk


def _employee_for(user: User, db: Session) -> Employee:
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    employee = db.get(Employee, user.employee_id)
    if employee is None:
        raise HTTPException(status_code=403, detail="Employee profile not found")
    return employee


def _label(risk: IncidentRisk) -> str:
    return (risk.incident_ref or risk.title)[:255]


def _completion(risk: IncidentRisk) -> dict:
    """Where the incident's subjects actually stand.

    ``avg_score`` is ``None`` rather than ``0.0`` when nobody has scored yet:
    an average of zero and "nobody has taken it" render identically on a card
    and mean opposite things.
    """
    subjects = list(risk.subjects or [])
    by_status: dict[str, int] = {}
    by_decision: dict[str, int] = {}
    for subject in subjects:
        by_status[subject.status] = by_status.get(subject.status, 0) + 1
        by_decision[subject.reviewer_decision] = by_decision.get(subject.reviewer_decision, 0) + 1
    scores = [s.score for s in subjects if s.score is not None]
    outstanding = [
        s
        for s in subjects
        if s.status in (SubjectStatus.ASSIGNED, SubjectStatus.IN_PROGRESS)
        or s.reviewer_decision == ReviewerDecision.PENDING
    ]
    summary = {
        "subjects": len(subjects),
        "by_status": by_status,
        "by_reviewer_decision": by_decision,
        "outstanding": len(outstanding),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
        "scored_subjects": len(scores),
        "pass_mark": risk.min_score,
        "unassigned": sum(1 for s in subjects if s.assignment_id is None),
    }
    if not scores:
        summary["score_note"] = "No subject has recorded a score yet."
    if risk.min_score is not None:
        summary["below_pass_mark"] = sum(1 for s in scores if s < risk.min_score)
        summary["pass_mark_note"] = (
            f"The {risk.min_score}% bar on this incident is applied by the reviewer at "
            "/subjects/{id}/review. The quiz engine's own pass mark is separate and lower."
        )
    return summary


def _subject_details(db: Session, risk: IncidentRisk) -> list[IncidentRiskSubjectDetail]:
    subjects = list(risk.subjects or [])
    if not subjects:
        return []
    employees = {
        e.id: e
        for e in db.execute(
            select(Employee).where(Employee.id.in_([s.employee_id for s in subjects]))
        ).scalars()
    }
    departments = {d.id: d.name for d in db.execute(select(Department)).scalars()}
    out = []
    for subject in subjects:
        detail = IncidentRiskSubjectDetail.model_validate(subject)
        employee = employees.get(subject.employee_id)
        if employee is not None:
            detail.employee_name = employee.name
            detail.employee_email = employee.email
            detail.department_name = departments.get(employee.department_id, "")
        out.append(detail)
    return out


def _timeline(db: Session, risk: IncidentRisk) -> list[IncidentRiskTimelineEntry]:
    """The audited history of this risk, oldest first.

    Read out of ``audit_events`` rather than kept as a second history on the
    risk: a timeline maintained beside the audit trail is a timeline that can
    disagree with it, and the trail is the one an auditor reads.

    Subject-level entries are matched by id, plus — for rows written before a
    subject id was available to the writer — by the ``"<incident ref> / <name>"``
    label convention.
    """
    subject_ids = [s.id for s in (risk.subjects or [])]
    clauses = [(AuditEvent.object_type == "incident_risk") & (AuditEvent.object_id == risk.id)]
    if subject_ids:
        clauses.append(
            (AuditEvent.object_type == "incident_risk_subject")
            & (AuditEvent.object_id.in_(subject_ids))
        )
    if risk.incident_ref:
        clauses.append(
            (AuditEvent.object_type == "incident_risk_subject")
            & (AuditEvent.object_id.is_(None))
            & (AuditEvent.object_label.startswith(f"{risk.incident_ref} / "))
        )
    rows = db.execute(
        select(AuditEvent).where(or_(*clauses)).order_by(AuditEvent.at.asc(), AuditEvent.id.asc())
    ).scalars().all()
    return [IncidentRiskTimelineEntry.model_validate(r, from_attributes=True) for r in rows]


# --- Employee view -----------------------------------------------------------
# Registered before /{risk_id} so "my" is never parsed as an id.


@router.get("/my", response_model=list[IncidentRiskEmployeeView])
def my_incident_risks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The caller's own obligations, redacted by the incident's confidentiality.

    Only rows where the caller is the subject. Drafts are excluded: a risk
    nobody has opened yet is not something to put in front of the person it
    names.

    Not paginated on purpose — a cap here would hide an obligation, and an
    employee with more of these than a page holds has a bigger problem than
    scrolling.
    """
    employee = _employee_for(user, db)
    rows = db.execute(
        select(IncidentRiskSubject, IncidentRisk)
        .join(IncidentRisk, IncidentRisk.id == IncidentRiskSubject.incident_risk_id)
        .where(
            IncidentRiskSubject.employee_id == employee.id,
            IncidentRisk.status != IncidentRiskStatus.DRAFT,
        )
        .order_by(IncidentRisk.created_at.desc(), IncidentRisk.id.desc())
    ).all()
    return [IncidentRiskEmployeeView.of(risk, subject) for subject, risk in rows]


# --- Analyst: list, create, read ---------------------------------------------


@router.get("", response_model=IncidentRiskPage)
def list_incident_risks(
    status: str | None = None,
    severity: str | None = None,
    risk_type: str | None = None,
    department_id: int | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Newest first. ``total`` and ``truncated`` say what the page left behind.

    An unknown ``department_id`` is a 404 rather than an empty page: "there are
    no incidents for that department" and "that department does not exist" are
    different answers, and only one of them is reassuring.
    """
    if department_id is not None and db.get(Department, department_id) is None:
        raise HTTPException(status_code=404, detail=f"Department {department_id} not found")

    filters = []
    if status:
        filters.append(IncidentRisk.status == status)
    if severity:
        filters.append(IncidentRisk.severity == severity)
    if risk_type:
        filters.append(IncidentRisk.risk_type == risk_type)
    if department_id is not None:
        filters.append(IncidentRisk.affected_department_id == department_id)
    if q:
        needle = f"%{q.strip()}%"
        filters.append(
            or_(
                IncidentRisk.title.ilike(needle),
                IncidentRisk.incident_ref.ilike(needle),
                IncidentRisk.description.ilike(needle),
            )
        )

    total = db.execute(
        select(func.count(IncidentRisk.id)).where(*filters)
    ).scalar_one()
    items = db.execute(
        select(IncidentRisk)
        .where(*filters)
        .order_by(IncidentRisk.created_at.desc(), IncidentRisk.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    return IncidentRiskPage(
        items=[IncidentRiskOut.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(items) < total,
    )


@router.post("", response_model=IncidentRiskDetail, status_code=201)
def create_incident_risk(
    payload: IncidentRiskCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Open a risk. It starts as a draft — nobody is on the hook until it is
    assigned, and a record created by accident should not read as a demand."""
    if payload.severity not in _SEVERITIES:
        raise HTTPException(status_code=422, detail=f"Unknown severity: {payload.severity}")
    if payload.confidentiality not in _CONFIDENTIALITIES:
        raise HTTPException(
            status_code=422, detail=f"Unknown confidentiality: {payload.confidentiality}"
        )
    if payload.risk_type not in _RISK_TYPES:
        raise HTTPException(status_code=422, detail=f"Unknown risk type: {payload.risk_type}")
    if payload.affected_department_id is not None and (
        db.get(Department, payload.affected_department_id) is None
    ):
        raise HTTPException(
            status_code=404, detail=f"Department {payload.affected_department_id} not found"
        )

    risk = IncidentRisk(
        **payload.model_dump(),
        status=IncidentRiskStatus.DRAFT,
        created_by=user.email,
    )
    db.add(risk)
    db.flush()
    record(
        db,
        actor=user,
        action="incident_risk.create",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=(
            f'Opened "{risk.title}" as a draft. Classified {risk.confidentiality}, '
            f"severity {risk.severity}."
        ),
        before=None,
        after={
            "status": risk.status,
            "severity": risk.severity,
            "confidentiality": risk.confidentiality,
        },
        **_request_context(request),
    )
    db.commit()
    return _detail(db, risk)


@router.get("/{risk_id}", response_model=IncidentRiskDetail)
def get_incident_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    return _detail(db, _risk_or_404(db, risk_id))


def _detail(db: Session, risk: IncidentRisk) -> IncidentRiskDetail:
    detail = IncidentRiskDetail.model_validate(risk)
    if risk.affected_department_id is not None:
        department = db.get(Department, risk.affected_department_id)
        detail.department_name = department.name if department else ""
    detail.subjects = _subject_details(db, risk)
    detail.completion = _completion(risk)
    detail.timeline = _timeline(db, risk)
    return detail


# --- Analyst: update ----------------------------------------------------------


@router.patch("/{risk_id}", response_model=IncidentRiskDetail)
def update_incident_risk(
    risk_id: int,
    payload: IncidentRiskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Edit fields and move the status along.

    409 names the current state on an illegal move. ``closed`` and ``reopened``
    are refused here with a pointer to the endpoint that demands a reason —
    silently accepting them would let an obligation be discharged with no
    stated justification, which is the one thing this record exists to prevent.
    """
    risk = _risk_or_404(db, risk_id)
    changes = payload.model_dump(exclude_unset=True, exclude={"note"})
    changes = {k: v for k, v in changes.items() if v is not None}
    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")

    if "severity" in changes and changes["severity"] not in _SEVERITIES:
        raise HTTPException(status_code=422, detail=f"Unknown severity: {changes['severity']}")
    if "confidentiality" in changes and changes["confidentiality"] not in _CONFIDENTIALITIES:
        raise HTTPException(
            status_code=422, detail=f"Unknown confidentiality: {changes['confidentiality']}"
        )

    new_status = changes.get("status")
    if new_status is not None:
        if new_status in (IncidentRiskStatus.CLOSED, IncidentRiskStatus.REOPENED):
            raise HTTPException(
                status_code=409,
                detail=(
                    f'"{new_status}" is not set here: use POST /{risk.id}/'
                    f"{'close' if new_status == IncidentRiskStatus.CLOSED else 'reopen'}, "
                    "which requires a written reason."
                ),
            )
        allowed = _TRANSITIONS.get(risk.status, frozenset())
        if new_status != risk.status and new_status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot move this risk from {risk.status} to {new_status}. "
                    f"Allowed from {risk.status}: {', '.join(sorted(allowed)) or 'nothing'}."
                ),
            )

    before = {k: getattr(risk, k) for k in changes}
    for field, value in changes.items():
        setattr(risk, field, value)
    db.add(risk)

    parts = []
    if new_status is not None and before.get("status") != new_status:
        parts.append(f"Status {before['status']} → {new_status}.")
    if "confidentiality" in changes and before["confidentiality"] != changes["confidentiality"]:
        # Called out by name: lowering it un-redacts the narrative and the
        # evidence for every subject the moment they next open their view.
        parts.append(
            f"Confidentiality {before['confidentiality']} → {changes['confidentiality']} "
            "(changes what the subjects can see)."
        )
    other = sorted(set(changes) - {"status", "confidentiality"})
    if other:
        parts.append("Updated " + ", ".join(other) + ".")
    if payload.note:
        parts.append(payload.note)

    record(
        db,
        actor=user,
        action=(
            "incident_risk.status"
            if new_status is not None and before.get("status") != new_status
            else "incident_risk.update"
        ),
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=" ".join(parts),
        before=_jsonable(before),
        after=_jsonable(changes),
        **_request_context(request),
    )
    db.commit()
    return _detail(db, risk)


def _jsonable(values: dict) -> dict:
    """Datetimes to ISO strings so the JSON column round-trips identically."""
    return {
        k: (v.isoformat() if isinstance(v, datetime) else v)
        for k, v in values.items()
    }


# --- Analyst: subjects --------------------------------------------------------


@router.post("/{risk_id}/subjects", response_model=IncidentRiskDetail)
def add_subjects(
    risk_id: int,
    payload: IncidentRiskAssign,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Attach named employees to the risk.

    Additive only. An employee already attached is left exactly as they are —
    re-posting the list must never reset somebody who already completed — and
    the audit entry names who was skipped for that reason rather than reporting
    a count that quietly disagrees with the request.
    """
    risk = _risk_or_404(db, risk_id)
    if risk.status == IncidentRiskStatus.CLOSED:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} is closed; reopen it before attaching more people.",
        )
    if not payload.employee_ids:
        raise HTTPException(status_code=422, detail="employee_ids must name at least one employee")

    wanted = list(dict.fromkeys(payload.employee_ids))
    employees = {
        e.id: e
        for e in db.execute(select(Employee).where(Employee.id.in_(wanted))).scalars()
    }
    missing = [eid for eid in wanted if eid not in employees]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Employee(s) not found: {', '.join(str(m) for m in missing)}",
        )

    existing = {s.employee_id for s in (risk.subjects or [])}
    added, already = [], []
    for emp_id in wanted:
        if emp_id in existing:
            already.append(employees[emp_id].name)
            continue
        db.add(IncidentRiskSubject(incident_risk_id=risk.id, employee_id=emp_id))
        added.append(employees[emp_id].name)

    summary = f"Attached {len(added)} subject(s): {', '.join(added)}." if added else "No new subjects."
    if already:
        summary += f" Already attached, left untouched: {', '.join(already)}."
    if payload.note:
        summary += f" {payload.note}"

    record(
        db,
        actor=user,
        action="incident_risk.subjects.add",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=summary,
        before={"subjects": len(existing)},
        after={"subjects": len(existing) + len(added)},
        **_request_context(request),
    )
    db.commit()
    db.refresh(risk)
    return _detail(db, risk)


@router.post("/{risk_id}/auto-train", response_model=AutoTrainResult)
async def auto_train_risk(
    risk_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The pipeline for an IR finding: match the catalogue, else generate.

    The employees are the risk's attached subjects. When an approved module
    matches the risk's topic it is assigned immediately and each subject row
    is linked to its assignment; when nothing matches, a module is generated
    and queued for review, and the approval click completes the assignment
    and the subject links.
    """
    risk = _risk_or_404(db, risk_id)
    if risk.status == IncidentRiskStatus.CLOSED:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} is closed; reopen it before assigning anything.",
        )
    subjects = list(risk.subjects or [])
    if not subjects:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} has no subjects attached; POST /{risk.id}/subjects first.",
        )
    employee_ids = [s.employee_id for s in subjects]

    outcome = await training_pipeline.auto_train(
        db,
        kind="incident_risk",
        ref_id=risk.id,
        title=risk.title,
        description=risk.description or "",
        severity=risk.severity,
        type_value=risk.risk_type,
        required_action=risk.required_action or "",
        employee_ids=employee_ids,
    )
    module = outcome["module"]
    if outcome["assigned"]:
        by_employee = {a["employee_id"]: a["assignment_id"] for a in outcome["assigned"]}
        for subject in subjects:
            if subject.employee_id in by_employee and subject.assignment_id is None:
                subject.assignment_id = by_employee[subject.employee_id]
        if risk.status in (
            IncidentRiskStatus.DRAFT,
            IncidentRiskStatus.OPEN,
            IncidentRiskStatus.REOPENED,
        ):
            risk.status = IncidentRiskStatus.ASSIGNED

    record(
        db,
        actor=user,
        action="incident_risk.auto_train",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=risk.title[:120],
        summary=(
            f"Auto-train ({outcome['path']}): module '{module.title}' — "
            f"{len(outcome['assigned'])} assigned, {len(outcome['skipped'])} skipped"
        ),
        after={
            "path": outcome["path"],
            "topic": outcome["topic"],
            "module_id": module.id,
            "assignment_ids": [a["assignment_id"] for a in outcome["assigned"]],
            "risk_status": risk.status,
        },
        **_request_context(request),
    )
    db.commit()
    db.refresh(module)
    return AutoTrainResult(
        path=outcome["path"],
        topic=outcome["topic"],
        module_id=module.id,
        module_title=module.title,
        module_status=module.status,
        generation_source=outcome["generation_source"],
        assigned=outcome["assigned"],
        skipped=outcome["skipped"],
        resources=[AutoTrainResource(**r) for r in outcome["resources"]],
        note=outcome["note"],
    )


@router.post("/{risk_id}/assign", response_model=IncidentRiskAssignResult)
def assign_required_training(
    risk_id: int,
    payload: IncidentRiskAssignRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Turn the incident's requirements into real training assignments.

    Uses the platform's existing ``TrainingAssignment`` machinery — the same
    rows the employee's training list, the quiz grader and the risk engine
    already read — with ``loop_run_id`` left null, because this assignment came
    from an incident rather than from a loop run.

    Every requirement the incident declared comes back in ``requirements``,
    fulfilled or not. Three of them cannot be carried by this deployment's
    machinery, and the response says so instead of letting the closure criteria
    fail later for a reason nobody wrote down.
    """
    risk = _risk_or_404(db, risk_id)
    if risk.status == IncidentRiskStatus.CLOSED:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} is closed; reopen it before assigning anything.",
        )

    subjects = list(risk.subjects or [])
    already_held = sum(1 for s in subjects if s.assignment_id is not None)
    if payload.subject_ids is not None:
        by_id = {s.id: s for s in subjects}
        unknown = [sid for sid in payload.subject_ids if sid not in by_id]
        if unknown:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Subject(s) {', '.join(str(u) for u in unknown)} are not attached to "
                    f"risk {risk.id}."
                ),
            )
        subjects = [by_id[sid] for sid in payload.subject_ids]
    if not subjects:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} has no subjects attached; POST /{risk.id}/subjects first.",
        )

    module: TrainingModule | None = None
    if payload.module_id is not None:
        module = db.get(TrainingModule, payload.module_id)
        if module is None:
            raise HTTPException(status_code=404, detail=f"Module {payload.module_id} not found")
        if module.status != ModuleStatus.APPROVED:
            # The human gate exists precisely so unreviewed content never
            # reaches an employee. An incident is not a way around it.
            raise HTTPException(
                status_code=409,
                detail=(
                    f'Module {module.id} is "{module.status}". Only an approved module may be '
                    "assigned to a named person."
                ),
            )

    requirements = _requirement_outcomes(risk, module)

    assigned: list[AssignedSubject] = []
    skipped: list[SkippedSubject] = []
    employees = {
        e.id: e
        for e in db.execute(
            select(Employee).where(Employee.id.in_([s.employee_id for s in subjects]))
        ).scalars()
    }
    reasons = [f"Required by incident {risk.incident_ref or risk.id}: {risk.title}"]
    if risk.deadline is not None:
        reasons.append(f"Due {risk.deadline.date().isoformat()}")

    for subject in subjects:
        employee = employees.get(subject.employee_id)
        name = employee.name if employee else f"employee {subject.employee_id}"
        reason = _skip_reason(risk, subject, employee, module)
        if reason:
            skipped.append(
                SkippedSubject(
                    subject_id=subject.id,
                    employee_id=subject.employee_id,
                    employee_name=name,
                    reason=reason,
                )
            )
            continue
        assignment = TrainingAssignment(
            module_id=module.id,
            employee_id=subject.employee_id,
            loop_run_id=None,
            status=AssignmentStatus.ASSIGNED,
            targeting_reasons=list(reasons),
        )
        db.add(assignment)
        db.flush()
        subject.assignment_id = assignment.id
        subject.status = SubjectStatus.ASSIGNED
        db.add(subject)
        assigned.append(
            AssignedSubject(
                subject_id=subject.id,
                employee_id=subject.employee_id,
                employee_name=name,
                assignment_id=assignment.id,
            )
        )

    before_status = risk.status
    if assigned and risk.status in _PRE_ASSIGNMENT:
        risk.status = IncidentRiskStatus.ASSIGNED
        db.add(risk)

    unmet = [r for r in requirements if not r.fulfilled]
    detail = (
        f"{len(assigned)} assigned, {len(skipped)} skipped."
        if assigned or skipped
        else "Nothing assigned."
    )
    if unmet:
        detail += (
            " "
            + str(len(unmet))
            + " of this incident's requirements are not carried by an assignment: "
            + ", ".join(r.requirement for r in unmet)
            + ". See `requirements` for what each one needs instead."
        )

    record(
        db,
        actor=user,
        action="incident_risk.assign",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=(
            (f'Assigned "{module.title}" to {len(assigned)} subject(s). ' if module else "")
            + detail
            + (f" {payload.note}" if payload.note else "")
        ),
        before={"status": before_status, "subjects_with_assignment": already_held},
        after={
            "status": risk.status,
            "module_id": module.id if module else None,
            "subjects_with_assignment": already_held + len(assigned),
            "assigned": len(assigned),
            "skipped": len(skipped),
            "unmet_requirements": [r.requirement for r in unmet],
        },
        **_request_context(request),
    )
    db.commit()
    return IncidentRiskAssignResult(
        incident_risk_id=risk.id,
        module_id=module.id if module else None,
        module_title=module.title if module else "",
        assigned=assigned,
        skipped=skipped,
        requirements=requirements,
        status=risk.status,
        detail=detail,
    )


def _skip_reason(
    risk: IncidentRisk,
    subject: IncidentRiskSubject,
    employee: Employee | None,
    module: TrainingModule | None,
) -> str:
    """Why this subject was not assigned, or "" when they were.

    A sentence rather than a flag, because the caller shows it back to the
    analyst: "3 of 5 assigned" without the other two named is a number nobody
    can act on.
    """
    if subject.assignment_id is not None:
        return (
            f"Already holds training assignment {subject.assignment_id}; left untouched so a "
            "completed attempt is not reset."
        )
    if employee is None or employee.status != EmployeeStatus.ACTIVE:
        state = employee.status if employee else "no employee record"
        return (
            f"Not assignable ({state}). An expiry against somebody who has left or is on leave "
            "reads as ignored training and is charged as such."
        )
    if module is None:
        return (
            "No module was named, so there was nothing to assign."
            if risk.requires_training
            else "This incident does not require training and no module was named — "
            "there was nothing to assign."
        )
    return ""


def _requirement_outcomes(
    risk: IncidentRisk, module: TrainingModule | None
) -> list[RequirementOutcome]:
    """What this deployment can and cannot carry for one incident.

    Three of these are honest "no"s, and each is a real gap rather than a
    missing feature flag:

    * **quiz** — the module has to contain one. A module with no questions
      cannot evidence comprehension however many people complete it.
    * **sandbox** — nothing here assigns a detonation exercise to an employee.
      Sandbox submission is analyst-only by design (it accepts hostile input),
      so an incident that requires one needs a human to arrange it.
    * **min_score** — a ``TrainingAssignment`` has no per-incident pass mark.
      The quiz grader passes at its own fixed threshold; the incident's bar is
      applied afterwards, by the reviewer, when they accept or reject.
    """
    out: list[RequirementOutcome] = []

    if risk.requires_training:
        if module is None:
            out.append(
                RequirementOutcome(
                    requirement="training",
                    fulfilled=False,
                    mechanism="",
                    detail=(
                        "This incident requires training but no module_id was supplied, so no "
                        "assignment was created. Name an approved module to fulfil it."
                    ),
                )
            )
        else:
            out.append(
                RequirementOutcome(
                    requirement="training",
                    fulfilled=True,
                    mechanism="training assignment",
                    detail=f'Assigned as module {module.id}, "{module.title}".',
                )
            )

    if risk.requires_quiz:
        questions = len(module.quiz or []) if module else 0
        out.append(
            RequirementOutcome(
                requirement="quiz",
                fulfilled=questions > 0,
                mechanism="training assignment" if questions else "",
                detail=(
                    f"The assigned module carries {questions} question(s); a score is recorded "
                    "when the subject submits."
                    if questions
                    else (
                        "This incident requires a quiz. "
                        + (
                            f'Module {module.id} has no questions, so completing it evidences '
                            "nothing about comprehension."
                            if module
                            else "No module was assigned, so no quiz will be taken."
                        )
                    )
                ),
            )
        )

    if risk.requires_sandbox:
        out.append(
            RequirementOutcome(
                requirement="sandbox",
                fulfilled=False,
                mechanism="",
                detail=(
                    "Nothing in this deployment assigns a sandbox exercise to an employee. "
                    "Sandbox submission is analyst-only because it accepts hostile input by "
                    "design. Record the exercise against the subject by hand, or drop the "
                    "requirement — it will not be satisfied by anything above."
                ),
            )
        )

    if risk.min_score is not None:
        out.append(
            RequirementOutcome(
                requirement="min_score",
                fulfilled=False,
                mechanism="reviewer decision",
                detail=(
                    f"A training assignment carries no per-incident pass mark. The quiz grader "
                    f"uses its own fixed threshold, so a subject can be marked complete below "
                    f"{risk.min_score}%. The bar is applied by the reviewer at "
                    f"POST /{risk.id}/subjects/{{subject_id}}/review."
                ),
            )
        )

    return out


@router.post("/{risk_id}/subjects/{subject_id}/review", response_model=IncidentRiskDetail)
def review_subject(
    risk_id: int,
    subject_id: int,
    payload: IncidentRiskSubjectReview,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """A reviewer accepts or rejects one subject's completion.

    This is where the incident's own pass mark is actually applied — the quiz
    grader does not know about it. A rejection requires a note: telling someone
    their work was not accepted without saying why is how an awareness
    programme turns into resentment.
    """
    risk = _risk_or_404(db, risk_id)
    subject = db.get(IncidentRiskSubject, subject_id)
    if subject is None or subject.incident_risk_id != risk.id:
        raise HTTPException(
            status_code=404, detail=f"Subject {subject_id} is not attached to risk {risk.id}"
        )
    if payload.decision not in (ReviewerDecision.ACCEPTED, ReviewerDecision.REJECTED):
        raise HTTPException(status_code=422, detail="decision must be accepted or rejected")
    if payload.decision == ReviewerDecision.REJECTED and not payload.note.strip():
        raise HTTPException(
            status_code=422,
            detail="A rejection needs a note saying what was short of the bar.",
        )
    if subject.status == SubjectStatus.ASSIGNED:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Subject {subject.id} has not started the required action "
                f"(status: {subject.status}); there is nothing to review yet."
            ),
        )

    employee = db.get(Employee, subject.employee_id)
    before = {"status": subject.status, "reviewer_decision": subject.reviewer_decision}
    subject.reviewer_decision = payload.decision
    subject.reviewer_note = payload.note or None
    subject.reviewed_by = user.email
    subject.reviewed_at = _now()
    subject.status = (
        SubjectStatus.REVIEWED
        if payload.decision == ReviewerDecision.ACCEPTED
        else SubjectStatus.FAILED
    )
    db.add(subject)

    score_text = f" Score {subject.score:.0f}%." if subject.score is not None else " No score recorded."
    if risk.min_score is not None and subject.score is not None and subject.score < risk.min_score:
        score_text += f" Below this incident's {risk.min_score}% bar."
    record(
        db,
        actor=user,
        action="incident_risk.subject.review",
        object_type="incident_risk_subject",
        object_id=subject.id,
        object_label=f"{risk.incident_ref or risk.id} / {employee.name if employee else subject.employee_id}"[:255],
        summary=f"{payload.decision.capitalize()}.{score_text} {payload.note}".strip(),
        before=before,
        after={"status": subject.status, "reviewer_decision": subject.reviewer_decision},
        **_request_context(request),
    )
    db.commit()
    db.refresh(risk)
    return _detail(db, risk)


# --- Analyst: close and reopen ------------------------------------------------


@router.post("/{risk_id}/close", response_model=IncidentRiskDetail)
def close_incident_risk(
    risk_id: int,
    payload: IncidentRiskClose,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Close the risk. The note is where somebody states the closure criteria
    were met, and it is mandatory: a risk that vanished without a stated reason
    is indistinguishable from one that was quietly deleted.

    Closing over outstanding subjects is allowed and recorded — sometimes an
    incident is closed on other grounds — but the audit summary names how many
    were still outstanding, so the decision is visible rather than implied.
    """
    risk = _risk_or_404(db, risk_id)
    if not payload.closure_note.strip():
        raise HTTPException(
            status_code=422,
            detail="closure_note is required: state how the closure criteria were met.",
        )
    if risk.status == IncidentRiskStatus.CLOSED:
        raise HTTPException(status_code=409, detail=f"Risk {risk.id} is already closed.")
    if risk.status == IncidentRiskStatus.DRAFT:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Risk {risk.id} is still a draft; nothing has been asked of anyone. "
                "Open it first, or leave it as a draft."
            ),
        )

    outstanding = _completion(risk)["outstanding"]
    before = {"status": risk.status, "outstanding_subjects": outstanding}
    risk.status = IncidentRiskStatus.CLOSED
    risk.closed_at = _now()
    risk.closure_note = payload.closure_note.strip()
    db.add(risk)
    record(
        db,
        actor=user,
        action="incident_risk.close",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=(
            f"Closed. {risk.closure_note}"
            + (
                f" {outstanding} subject(s) were still outstanding at closure."
                if outstanding
                else ""
            )
        ),
        before=before,
        after={"status": risk.status, "closed_at": risk.closed_at.isoformat()},
        **_request_context(request),
    )
    db.commit()
    return _detail(db, risk)


@router.post("/{risk_id}/reopen", response_model=IncidentRiskDetail)
def reopen_incident_risk(
    risk_id: int,
    payload: IncidentRiskReopen,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Reopen a closed risk with a stated reason.

    ``closed_at`` and ``closure_note`` are cleared, because a reopened risk that
    still carries "closed on the 8th" renders as closed on every card that reads
    those fields. Nothing is lost: both are preserved in this event's ``before``
    snapshot, which is where the history belongs.

    ``reopened_count`` is incremented rather than overwritten — a risk closed
    and reopened twice is a different story from one closed once.
    """
    risk = _risk_or_404(db, risk_id)
    if not payload.reason.strip():
        raise HTTPException(
            status_code=422, detail="reason is required: state why the closure did not hold."
        )
    if risk.status != IncidentRiskStatus.CLOSED:
        raise HTTPException(
            status_code=409,
            detail=f"Risk {risk.id} is not closed (status: {risk.status}); there is nothing to reopen.",
        )

    before = {
        "status": risk.status,
        "closed_at": risk.closed_at.isoformat() if risk.closed_at else None,
        "closure_note": risk.closure_note,
        "reopened_count": risk.reopened_count,
    }
    risk.status = IncidentRiskStatus.REOPENED
    risk.closed_at = None
    risk.closure_note = None
    risk.reopened_count = risk.reopened_count + 1
    db.add(risk)
    record(
        db,
        actor=user,
        action="incident_risk.reopen",
        object_type="incident_risk",
        object_id=risk.id,
        object_label=_label(risk),
        summary=f"Reopened (reopen #{risk.reopened_count}). {payload.reason.strip()}",
        before=before,
        after={"status": risk.status, "reopened_count": risk.reopened_count},
        **_request_context(request),
    )
    db.commit()
    return _detail(db, risk)
