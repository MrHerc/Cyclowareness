"""Remediation API — the plans, the gaps, and the human gate on both.

Reading is analyst-only except for a learner's own plans, which they may read
and dispute. Approving is the human gate: nothing built here reaches anyone
until a named person says so, exactly as the loop's own approval gate works.

Two collections beside the plans are deliberately first-class here, because they
are the answers a buyer asks for and a "no results" screen would hide:
`/coverage-gaps` is the content roadmap, `/control-gaps` is the list of places
where training is the wrong fix.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, Role, User
from ..platform import models as platform_models
from ..remediation.catalogue import covered_behaviours
from ..remediation.models import (
    ControlGapFinding,
    CoverageGap,
    PlanStatus,
    RemediationPlan,
)
from ..security import get_current_user, require_analyst

router = APIRouter(prefix="/api/remediation", tags=["remediation"])

MAX_PAGE = 200


class PlanOut(BaseModel):
    id: int
    trigger_kind: str
    trigger_ref: str
    employee_id: int
    employee_name: str | None
    status: str
    source_kind: str
    asset_id: int | None
    framing: dict
    assessment: dict
    decision: dict
    urgency: str
    #: False means no model was involved — retrieval alone chose this. The UI
    #: must say so rather than letting a template read as AI.
    ai_ran: bool
    not_attached_reason: str
    validator_adjustments: list
    rejection_code: str
    confidence: float | None
    manager_visible: bool
    learner_disclosure: str

    #: The right of appeal, as state the UI can render. `disputed_at` set with an
    #: empty `dispute_resolution` is an OPEN dispute — the state both the learner
    #: and the analyst queue must be able to see.
    disputed_at: datetime | None
    dispute_note: str
    dispute_resolution: str
    dispute_resolved_by: str
    dispute_resolved_at: datetime | None

    approved_by: str
    approved_at: datetime | None
    created_at: datetime

    @classmethod
    def of(cls, plan: RemediationPlan, employee_name: str | None) -> "PlanOut":
        return cls(
            id=plan.id,
            trigger_kind=plan.trigger_kind,
            trigger_ref=plan.trigger_ref,
            employee_id=plan.employee_id,
            employee_name=employee_name,
            status=plan.status,
            source_kind=plan.source_kind,
            asset_id=plan.asset_id,
            framing=plan.framing or {},
            assessment=plan.assessment or {},
            decision=plan.decision or {},
            urgency=plan.urgency,
            ai_ran=plan.ai_ran,
            not_attached_reason=plan.not_attached_reason or "",
            validator_adjustments=plan.validator_adjustments or [],
            rejection_code=plan.rejection_code or "",
            confidence=plan.confidence,
            manager_visible=plan.manager_visible,
            learner_disclosure=plan.learner_disclosure or "",
            disputed_at=plan.disputed_at,
            dispute_note=plan.dispute_note or "",
            dispute_resolution=plan.dispute_resolution or "",
            dispute_resolved_by=plan.dispute_resolved_by or "",
            dispute_resolved_at=plan.dispute_resolved_at,
            approved_by=plan.approved_by or "",
            approved_at=plan.approved_at,
            created_at=plan.created_at,
        )


class PlanPage(BaseModel):
    items: list[PlanOut]
    total: int
    limit: int
    offset: int


class DecisionIn(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    note: str = ""


class DisputeIn(BaseModel):
    """The learner's own words, and nothing else.

    No status field: a person contesting a decision about them does not get to
    set the outcome, and the endpoint does not let them try. Length-capped
    because it is stored and re-rendered, not because anyone expects abuse.
    """

    note: str = Field(min_length=1, max_length=2000)


class DisputeResolutionIn(BaseModel):
    """A human's answer to a dispute. Analyst-only."""

    resolution: str = Field(min_length=1, max_length=2000)
    #: Withdrawing the plan is the outcome that must be reachable. A dispute
    #: process that can only ever say "upheld" is not one.
    withdraw: bool = False


@router.get("/plans", response_model=PlanPage)
def list_plans(
    status: str | None = Query(default=None, max_length=20, pattern=r"^[a-z_]+$"),
    limit: int = Query(default=50, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0, le=1_000_000_000),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    conditions = []
    if status:
        conditions.append(RemediationPlan.status == status)
    total = db.execute(
        select(func.count()).select_from(RemediationPlan).where(*conditions)
    ).scalar_one()
    rows = db.execute(
        select(RemediationPlan)
        .where(*conditions)
        .order_by(RemediationPlan.created_at.desc(), RemediationPlan.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    names = _names_for(db, rows)
    return PlanPage(
        items=[PlanOut.of(p, names.get(p.employee_id)) for p in rows],
        total=int(total or 0),
        limit=limit,
        offset=offset,
    )


@router.get("/plans/mine", response_model=list[PlanOut])
def my_plans(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """A learner's own plans, and only their own.

    Scoped in SQL by the session's employee id — never by a filter the client
    sends. Blocked plans are withheld: a plan that was refused was never
    delivered, and showing someone a remediation that does not exist for them
    would be alarming and untrue.

    One exception, and it is the point of the appeal route: a plan the learner
    DISPUTED stays visible after it is withdrawn. Otherwise winning an appeal
    looks identical to the row silently disappearing, and the person is never
    told what a human decided about the thing they contested.
    """
    if user.employee_id is None:
        return []
    rows = db.execute(
        select(RemediationPlan)
        .where(
            RemediationPlan.employee_id == user.employee_id,
            or_(
                RemediationPlan.status.in_((PlanStatus.APPROVED, PlanStatus.DELIVERED)),
                RemediationPlan.disputed_at.is_not(None),
            ),
            # A blocked plan was never delivered to anyone and stays withheld
            # even if the column somehow carries a dispute.
            RemediationPlan.status != PlanStatus.BLOCKED,
        )
        .order_by(RemediationPlan.created_at.desc())
    ).scalars().all()
    names = _names_for(db, rows)
    return [PlanOut.of(p, names.get(p.employee_id)) for p in rows]


@router.get("/plans/{plan_id}", response_model=PlanOut)
def get_plan(
    plan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    plan = db.get(RemediationPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Remediation plan not found")
    # An employee may read their own; anyone else must be an analyst.
    if user.role != Role.ANALYST and plan.employee_id != user.employee_id:
        raise HTTPException(status_code=403, detail="This plan belongs to someone else")
    employee = db.get(Employee, plan.employee_id)
    return PlanOut.of(plan, employee.name if employee else None)


@router.post("/plans/{plan_id}/dispute", response_model=PlanOut)
def dispute(
    plan_id: int,
    payload: DisputeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The learner contests a decision that a machine made about them.

    This endpoint exists because `learner_disclosure` promises it. The stored
    sentence tells every person "if you think this was assigned in error, use
    Dispute — that goes to a person, not to a system", and a promise of appeal
    with nothing behind it is worse than no promise at all. It is also the plain
    answer to a works council, and to the right to contest a decision taken
    about you by automated means.

    Three things it deliberately does NOT do.

    It does not change the plan's status. A dispute is a request for a human to
    look, not a self-service withdrawal — otherwise "dispute" becomes the button
    everyone presses to make training go away, and the signal is worthless.

    It does not accept an employee id. The plan is found by the session's own
    `employee_id`, so one person cannot dispute another's plan, or discover that
    someone else has one by probing ids: a plan belonging to somebody else
    answers 404 rather than 403, because 403 confirms the row exists.

    It does not let the learner dispute twice and overwrite the first note. What
    they said the first time is what the analyst must answer.
    """
    if user.employee_id is None:
        raise HTTPException(
            status_code=403, detail="Only the person a plan names can dispute it"
        )
    plan = db.get(RemediationPlan, plan_id)
    # 404, NOT 403: a wrong-owner 403 confirms the plan exists, which tells the
    # asker that a named colleague has a remediation plan. That is precisely the
    # disclosure `manager_visible=False` exists to prevent.
    if plan is None or plan.employee_id != user.employee_id:
        raise HTTPException(status_code=404, detail="Remediation plan not found")
    if plan.status not in (PlanStatus.APPROVED, PlanStatus.DELIVERED):
        raise HTTPException(
            status_code=409,
            detail="Nothing was assigned to you from this plan, so there is nothing to dispute",
        )
    if plan.disputed_at is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already disputed this. Someone is reviewing it.",
        )

    plan.disputed_at = datetime.now(timezone.utc)
    plan.dispute_note = payload.note.strip()
    platform_models.record(
        db,
        actor=user,
        action="remediation.disputed",
        object_type="remediation_plan",
        object_id=plan.id,
        object_label=plan.trigger_ref,
        # The learner's words are stored on the row and in the trail. What a
        # person said when contesting a decision about them has to survive the
        # plan being withdrawn.
        summary=plan.dispute_note[:500],
        after={"status": plan.status, "disputed": True},
    )
    db.commit()
    db.refresh(plan)
    employee = db.get(Employee, plan.employee_id)
    return PlanOut.of(plan, employee.name if employee else None)


@router.post("/plans/{plan_id}/dispute/resolution", response_model=PlanOut)
def resolve_dispute(
    plan_id: int,
    payload: DisputeResolutionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """A named human answers the dispute — and may withdraw the plan.

    `withdraw` is the outcome that makes this real. An appeal route whose only
    possible answer is "upheld" is theatre, so the analyst can rescind the
    assignment, and the learner's screen then says so.
    """
    plan = db.get(RemediationPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Remediation plan not found")
    if plan.disputed_at is None:
        raise HTTPException(status_code=409, detail="This plan was not disputed")
    if plan.dispute_resolution:
        raise HTTPException(status_code=409, detail="This dispute is already resolved")

    plan.dispute_resolution = payload.resolution.strip()
    plan.dispute_resolved_by = user.email
    plan.dispute_resolved_at = datetime.now(timezone.utc)
    if payload.withdraw:
        plan.status = PlanStatus.REJECTED
    platform_models.record(
        db,
        actor=user,
        action="remediation.dispute_resolved",
        object_type="remediation_plan",
        object_id=plan.id,
        object_label=plan.trigger_ref,
        summary=plan.dispute_resolution[:500],
        after={"status": plan.status, "withdrawn": payload.withdraw},
    )
    db.commit()
    db.refresh(plan)
    employee = db.get(Employee, plan.employee_id)
    return PlanOut.of(plan, employee.name if employee else None)


@router.post("/plans/{plan_id}/decision", response_model=PlanOut)
def decide(
    plan_id: int,
    payload: DecisionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The human gate. Nothing reaches a person until someone named approves it.

    A BLOCKED plan cannot be approved out of its rejection. The firewall's answer
    is final by design — an approval button that can override it is the same as
    not having one.
    """
    plan = db.get(RemediationPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Remediation plan not found")
    if plan.status == PlanStatus.BLOCKED:
        raise HTTPException(
            status_code=409,
            detail=(
                "This plan was refused by the output firewall and cannot be approved. "
                f"Reason: {plan.rejection_code}. Regenerate it instead."
            ),
        )
    if plan.status != PlanStatus.PROPOSED:
        raise HTTPException(
            status_code=409, detail=f"This plan has already been {plan.status}"
        )

    plan.status = (
        PlanStatus.APPROVED if payload.decision == "approve" else PlanStatus.REJECTED
    )
    plan.approved_by = user.email
    plan.approved_at = datetime.now(timezone.utc)
    platform_models.record(
        db,
        actor=user,
        action=f"remediation.{payload.decision}d",
        object_type="remediation_plan",
        object_id=plan.id,
        object_label=plan.trigger_ref,
        summary=payload.note or f"Plan {payload.decision}d at the human gate",
        after={"status": plan.status, "urgency": plan.urgency},
    )
    db.commit()
    db.refresh(plan)
    employee = db.get(Employee, plan.employee_id)
    return PlanOut.of(plan, employee.name if employee else None)


@router.get("/coverage-gaps")
def coverage_gaps(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """What the library cannot answer, ranked by how often it was needed.

    Presented as a roadmap rather than an error list. Each row is a behaviour
    the engine met and had nothing for — which is exactly the brief for the next
    piece of content.
    """
    rows = db.execute(
        select(CoverageGap).order_by(CoverageGap.times_hit.desc(), CoverageGap.last_seen_at.desc())
    ).scalars().all()
    return {
        "items": [
            {
                "id": g.id,
                "behaviour": g.behaviour,
                "trigger_kind": g.trigger_kind,
                "detail": g.detail,
                "times_hit": g.times_hit,
                "first_seen_at": g.first_seen_at,
                "last_seen_at": g.last_seen_at,
            }
            for g in rows
        ],
        "total": len(rows),
        "covered_behaviours": list(covered_behaviours()),
        "note": (
            "A gap is a result, not a failure: it records that the catalogue was "
            "searched and had nothing tagged for this behaviour, so nothing was "
            "attached. Ranked by how often each was needed."
        ),
    }


@router.get("/control-gaps")
def control_gaps(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Where the person is not the vulnerability and a control is the fix."""
    rows = db.execute(
        select(ControlGapFinding).order_by(ControlGapFinding.created_at.desc())
    ).scalars().all()
    return {
        "items": [
            {
                "id": f.id,
                "trigger_kind": f.trigger_kind,
                "trigger_ref": f.trigger_ref,
                "recommended_control": f.recommended_control,
                "rationale": f.rationale,
                "department_id": f.department_id,
                "status": f.status,
                "created_at": f.created_at,
            }
            for f in rows
        ],
        "total": len(rows),
        "note": (
            "These were not answered with training on purpose. An engine that can "
            "only produce training will produce training; each row here is a case "
            "where a control removes the exposure and a module would not."
        ),
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Counted in SQL over every plan, never over a page.

    `rejections_by_code` is a SECURITY metric. A spike in
    `destination_in_learner_facing_field` means somebody has found the product
    and is probing what it will write — intelligence worth having, and the
    reason blocked plans are persisted rather than dropped.
    """
    by_status = dict(
        db.execute(
            select(RemediationPlan.status, func.count()).group_by(RemediationPlan.status)
        ).all()
    )
    by_code = dict(
        db.execute(
            select(RemediationPlan.rejection_code, func.count())
            .where(RemediationPlan.rejection_code != "")
            .group_by(RemediationPlan.rejection_code)
        ).all()
    )
    ai_ran = db.execute(
        select(func.count()).select_from(RemediationPlan).where(RemediationPlan.ai_ran.is_(True))
    ).scalar_one()
    total = sum(by_status.values())
    # An OPEN dispute is disputed with nothing decided yet. It is a person
    # waiting on a human, which is a queue an analyst must be able to see —
    # and the one number that shames the product if it grows.
    disputes_open = db.execute(
        select(func.count())
        .select_from(RemediationPlan)
        .where(
            RemediationPlan.disputed_at.is_not(None),
            RemediationPlan.dispute_resolution == "",
        )
    ).scalar_one()
    disputes_total = db.execute(
        select(func.count())
        .select_from(RemediationPlan)
        .where(RemediationPlan.disputed_at.is_not(None))
    ).scalar_one()
    return {
        "total": total,
        "disputes_open": int(disputes_open or 0),
        "disputes_total": int(disputes_total or 0),
        "by_status": {s: int(n) for s, n in by_status.items()},
        "rejections_by_code": {c: int(n) for c, n in by_code.items()},
        "built_with_a_model": int(ai_ran or 0),
        "built_from_the_library": total - int(ai_ran or 0),
        "coverage_gaps": db.execute(select(func.count()).select_from(CoverageGap)).scalar_one(),
        "control_gaps": db.execute(
            select(func.count()).select_from(ControlGapFinding)
        ).scalar_one(),
    }


def _names_for(db: Session, plans: list[RemediationPlan]) -> dict[int, str]:
    ids = {p.employee_id for p in plans}
    if not ids:
        return {}
    rows = db.execute(
        select(Employee.id, Employee.name).where(Employee.id.in_(ids))
    ).all()
    return {i: n for i, n in rows}
