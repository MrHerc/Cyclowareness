from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai.ai_service import executive_briefing
from ..core import metrics, risk_engine
from ..database import get_db
from ..models import (
    AssignmentStatus,
    Employee,
    LoopRun,
    LoopStatus,
    PhishingReport,
    PhishingSimulation,
    ReportStatus,
    RiskEvent,
    SimulationStatus,
    TrainingAssignment,
    User,
)
from ..security import get_current_user, require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/analyst")
def analyst_dashboard(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    active_runs = db.execute(
        select(LoopRun)
        .where(LoopRun.status.in_([LoopStatus.RUNNING, LoopStatus.AWAITING_APPROVAL, LoopStatus.AWAITING_TRAINING]))
        .order_by(LoopRun.created_at.desc())
        .limit(20)
    ).scalars().all()
    recent_completed = db.execute(
        select(LoopRun)
        .where(LoopRun.status.in_([LoopStatus.COMPLETED, LoopStatus.FAILED]))
        .order_by(LoopRun.created_at.desc())
        .limit(10)
    ).scalars().all()

    new_reports = db.execute(
        select(PhishingReport).where(PhishingReport.status == ReportStatus.NEW)
    ).scalars().all()
    active_sims = db.execute(
        select(PhishingSimulation).where(PhishingSimulation.status == SimulationStatus.ACTIVE)
    ).scalars().all()

    recent_events = db.execute(
        select(RiskEvent).order_by(RiskEvent.created_at.desc()).limit(12)
    ).scalars().all()

    return {
        "metrics": metrics.compute_current_metrics(db),
        "trend": metrics.trend(db, days=180),
        "departments": risk_engine.department_rollups(db),
        "active_runs": [_run_summary(db, r) for r in active_runs],
        "recent_runs": [_run_summary(db, r) for r in recent_completed],
        "counts": {
            "new_reports": len(new_reports),
            "awaiting_approval": sum(1 for r in active_runs if r.status == LoopStatus.AWAITING_APPROVAL),
            "active_simulations": len(active_sims),
            "active_runs": len(active_runs),
        },
        "recent_events": [
            {
                "id": e.id,
                "employee_name": e.employee.name if e.employee else "?",
                "type": e.type,
                "delta": e.delta,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in recent_events
        ],
    }


@router.get("/employee")
def employee_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    employee = db.get(Employee, user.employee_id)

    assignments = db.execute(
        select(TrainingAssignment)
        .where(TrainingAssignment.employee_id == employee.id)
        .order_by(TrainingAssignment.assigned_at.desc())
    ).scalars().all()
    completed = [a for a in assignments if a.status == AssignmentStatus.COMPLETED]

    # Gamification (spec §6.4): points, streak, leaderboard
    points = sum(50 + int((a.score or 0) / 2) for a in completed)
    streak = _streak(completed)
    leaderboard = _leaderboard(db)

    reports_count = db.execute(
        select(PhishingReport).where(PhishingReport.employee_id == employee.id)
    ).scalars().all()

    return {
        "employee": {
            "id": employee.id,
            "name": employee.name,
            "department": employee.department.name if employee.department else "",
            "role_title": employee.role_title,
            "risk_score": employee.current_risk_score,
        },
        "risk_breakdown": risk_engine.risk_breakdown(db, employee),
        "assignments": {
            "pending": sum(1 for a in assignments if a.status in (AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS)),
            "completed": len(completed),
            "avg_score": round(sum(a.score or 0 for a in completed) / len(completed), 1) if completed else None,
        },
        "gamification": {
            "points": points,
            "streak": streak,
            "reports_submitted": len(reports_count),
            "leaderboard": leaderboard,
            "rank": next((i + 1 for i, row in enumerate(leaderboard) if row["employee_id"] == employee.id), None),
        },
    }


@router.get("/executive")
async def executive_dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_analyst_or_exec)
):
    current = metrics.compute_current_metrics(db)
    trend = metrics.trend(db, days=180)
    departments = risk_engine.department_rollups(db)
    completed_runs = db.execute(
        select(LoopRun).where(LoopRun.status == LoopStatus.COMPLETED)
    ).scalars().all()
    briefing = await executive_briefing(
        {"current": current, "trend": trend[-12:], "departments": departments}
    )
    return {
        "metrics": current,
        "trend": trend,
        "departments": departments,
        "loops_closed": len(completed_runs),
        "briefing": briefing,
    }


def _run_summary(db: Session, run: LoopRun) -> dict:
    threat = run.threat
    return {
        "id": run.id,
        "status": run.status,
        "current_stage": run.current_stage,
        "stage_history": run.stage_history,
        "threat_title": threat.title if threat else "?",
        "threat_type": threat.threat_type if threat else None,
        "verdict": threat.verdict if threat else None,
        "source": threat.source if threat else None,
        "targets": len(run.targeting or []),
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


def _streak(completed: list[TrainingAssignment]) -> int:
    """Consecutive completed assignments with passing scores, newest first."""
    streak = 0
    for a in sorted(completed, key=lambda x: x.completed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True):
        if (a.score or 0) >= 60:
            streak += 1
        else:
            break
    return streak


def _leaderboard(db: Session) -> list[dict]:
    employees = db.execute(select(Employee)).scalars().all()
    rows = []
    for emp in employees:
        completed = [a for a in emp.assignments if a.status == AssignmentStatus.COMPLETED]
        points = sum(50 + int((a.score or 0) / 2) for a in completed)
        if points:
            rows.append({"employee_id": emp.id, "name": emp.name, "points": points})
    rows.sort(key=lambda r: -r["points"])
    return rows[:8]
