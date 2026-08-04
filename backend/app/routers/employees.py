from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..database import get_db
from ..models import Department, Employee, RiskEvent, User
from ..platform import models as platform_models
from ..schemas import DepartmentRisk, EmployeeDetail, EmployeeOut
from ..security import get_current_user, require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api", tags=["employees"])


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    return db.execute(
        select(Employee).order_by(Employee.current_risk_score.desc())
    ).scalars().all()


@router.get("/employees/me", response_model=EmployeeDetail)
def my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    return _detail(db, user.employee_id)


@router.get("/employees/{employee_id}", response_model=EmployeeDetail)
def employee_detail(
    employee_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    return _detail(db, employee_id)


@router.get("/departments", response_model=list[DepartmentRisk])
def department_risk(
    db: Session = Depends(get_db), user: User = Depends(require_analyst_or_exec)
):
    return risk_engine.department_rollups(db)


class ContestIn(BaseModel):
    """The employee's own words, and nothing else.

    No status field: a person contesting a record about them does not get to
    decide the outcome, and this endpoint does not let them try.
    """

    note: str = Field(min_length=1, max_length=2000)


class ContestResolutionIn(BaseModel):
    """A human's answer. Analyst-only."""

    resolution: str = Field(min_length=1, max_length=2000)
    #: Withdrawing the event is the outcome that makes this real. A contest
    #: process whose only possible answer is "upheld" is not one. The event is
    #: REVOKED, never deleted — "a claim was made and later withdrawn" is a
    #: different fact from "the claim never existed", and the score is recomputed
    #: so the number stops resting on it.
    revoke: bool = False


@router.post("/employees/me/risk-events/{event_id}/contest", response_model=EmployeeDetail)
def contest_risk_event(
    event_id: int,
    payload: ContestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The person a risk event is about says it is wrong.

    An analyst could already withdraw a bad batch. This is the route in the
    other direction, and it did not exist: these are the events that put "HIGH
    RISK" beside a named person on their own screen, and if one is wrong — a
    shared workstation, a mis-attributed simulation target — the score stood and
    the only recourse was knowing an analyst personally.

    Three things it deliberately does not do.

    It does not change the score. A contest asks a human to look; if filing one
    withdrew the event, "contest" becomes the button everyone presses and the
    number stops meaning anything.

    It takes no employee id. The event is found by the session's own
    `employee_id`, and one belonging to somebody else answers 404 rather than
    403 — a 403 confirms the row exists, which tells the asker that a named
    colleague has a risk event against them.

    It does not let the same event be contested twice. What they said the first
    time is what the analyst has to answer.
    """
    if user.employee_id is None:
        raise HTTPException(
            status_code=403, detail="Only the person an event is about can contest it"
        )
    event = db.get(RiskEvent, event_id)
    if event is None or event.employee_id != user.employee_id:
        raise HTTPException(status_code=404, detail="Risk event not found")
    if event.revoked_at is not None:
        raise HTTPException(
            status_code=409,
            detail="This event has already been withdrawn and no longer affects your score",
        )
    if event.contested_at is not None:
        raise HTTPException(
            status_code=409, detail="You have already contested this. Someone is reviewing it."
        )

    event.contested_at = datetime.now(timezone.utc)
    event.contest_note = payload.note.strip()
    platform_models.record(
        db,
        actor=user,
        action="risk_event.contested",
        object_type="risk_event",
        object_id=event.id,
        object_label=event.type,
        summary=event.contest_note[:500],
        after={"delta": event.delta, "contested": True},
    )
    db.commit()
    return _detail(db, user.employee_id)


@router.post("/employees/risk-events/{event_id}/contest/resolution", response_model=EmployeeDetail)
def resolve_risk_event_contest(
    event_id: int,
    payload: ContestResolutionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """A named human answers, and may withdraw the event.

    Revoking recomputes the score, so the number stops resting on a record the
    organisation has agreed was wrong. The event itself stays, marked as
    withdrawn: deleting it would erase the fact that it was ever claimed.
    """
    event = db.get(RiskEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Risk event not found")
    if event.contested_at is None:
        raise HTTPException(status_code=409, detail="This event was not contested")
    if event.contest_resolution:
        raise HTTPException(status_code=409, detail="This contest is already resolved")

    event.contest_resolution = payload.resolution.strip()
    event.contest_resolved_by = user.email
    event.contest_resolved_at = datetime.now(timezone.utc)
    if payload.revoke and event.revoked_at is None:
        event.revoked_at = event.contest_resolved_at
        event.revoked_reason = f"Contested by the employee and upheld: {event.contest_resolution}"

    employee = db.get(Employee, event.employee_id)
    platform_models.record(
        db,
        actor=user,
        action="risk_event.contest_resolved",
        object_type="risk_event",
        object_id=event.id,
        object_label=event.type,
        summary=event.contest_resolution[:500],
        after={"revoked": bool(payload.revoke)},
    )
    db.commit()
    if payload.revoke and employee is not None:
        # After the commit, so the recompute reads the withdrawal.
        risk_engine.recompute_score(db, employee)
        db.commit()
    return _detail(db, event.employee_id)


def _detail(db: Session, employee_id: int) -> EmployeeDetail:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    detail = EmployeeDetail.model_validate(employee)
    detail.department_name = employee.department.name if employee.department else ""
    detail.risk_breakdown = risk_engine.risk_breakdown(db, employee)
    events = db.execute(
        select(RiskEvent)
        .where(RiskEvent.employee_id == employee.id)
        .order_by(RiskEvent.created_at.desc())
        .limit(15)
    ).scalars().all()
    detail.recent_events = [
        {
            "id": e.id,
            "type": e.type,
            "delta": e.delta,
            "reason": e.reason,
            "loop_run_id": e.loop_run_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            # The contest state, so the screen can offer the route once and then
            # report what happened rather than offering it again.
            "contested_at": e.contested_at.isoformat() if e.contested_at else None,
            "contest_note": e.contest_note or "",
            "contest_resolution": e.contest_resolution or "",
            "revoked_at": e.revoked_at.isoformat() if e.revoked_at else None,
        }
        for e in events
    ]
    return detail
