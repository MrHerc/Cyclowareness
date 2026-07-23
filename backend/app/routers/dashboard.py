from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..ai.ai_service import executive_briefing
from ..core import metrics, risk_engine
from ..database import get_db
from ..models import (
    AssignmentStatus,
    Department,
    Employee,
    LoopRun,
    LoopStatus,
    PhishingReport,
    PhishingSimulation,
    ReportStatus,
    RiskEvent,
    SimOutcome,
    SimulationStatus,
    SimulationTarget,
    TrainingAssignment,
    User,
)
from ..security import get_current_user, require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _loops_closed(db: Session) -> int:
    """Runs that actually completed the cycle the number claims.

    Both dashboards caption this "threats → training → measured", but a run
    whose artifact came back benign closes at CONVERT — no module, nobody
    trained, nothing measured — and still lands on status COMPLETED. Counting
    those inflated the headline figure the product uses as its proof of work,
    so the measurement itself is now the condition.
    """
    return db.execute(
        select(func.count(LoopRun.id)).where(
            LoopRun.status == LoopStatus.COMPLETED,
            LoopRun.measure_summary.is_not(None),
        )
    ).scalar() or 0


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
            # Counted in SQL, not from the truncated recent_runs list — that
            # list is capped at 10, so deriving the total from it silently
            # saturated and contradicted the executive view.
            "loops_closed": _loops_closed(db)
            or 0,
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

    # Gamification (spec §6.4): points, streak, leaderboard, badges, team standings
    points = sum(50 + int((a.score or 0) / 2) for a in completed)
    streak = _streak(completed)
    leaderboard = _leaderboard(db)

    reports = db.execute(
        select(PhishingReport).where(PhishingReport.employee_id == employee.id)
    ).scalars().all()
    events = employee.risk_events
    sim_clicks = sum(1 for e in events if e.type == "simulated_phish_click")
    best_score = max((a.score or 0 for a in completed), default=0)
    # "Faced a simulation" = was a resolved target, regardless of outcome, so
    # an employee who only ever *ignored* lures still counts (ignores emit no
    # risk event, so we must query the targets directly).
    faced_sims = db.execute(
        select(func.count(SimulationTarget.id)).where(
            SimulationTarget.employee_id == employee.id,
            SimulationTarget.outcome != SimOutcome.PENDING,
        )
    ).scalar() or 0

    badges = _badges(
        completed=len(completed),
        reports=len(reports),
        streak=streak,
        best_score=best_score,
        sim_clicks=sim_clicks,
        faced_sims=faced_sims,
        risk_score=employee.current_risk_score,
    )

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
            "reports_submitted": len(reports),
            "leaderboard": leaderboard,
            "rank": next((i + 1 for i, row in enumerate(leaderboard) if row["employee_id"] == employee.id), None),
            "badges": badges,
            "team_leaderboard": _team_leaderboard(db, employee.department_id),
        },
    }


@router.get("/executive")
async def executive_dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_analyst_or_exec)
):
    current = metrics.compute_current_metrics(db)
    trend = metrics.trend(db, days=180)
    departments = risk_engine.department_rollups(db)
    briefing, briefing_source = await executive_briefing(
        {"current": current, "trend": trend[-12:], "departments": departments}
    )
    return {
        "metrics": current,
        "trend": trend,
        "departments": departments,
        "loops_closed": _loops_closed(db),
        "briefing": briefing,
        # Which engine wrote the paragraph above. The executive is the reader
        # least equipped to tell a model's analysis from a template's.
        "briefing_source": briefing_source,
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


# Badge catalogue — each has a threshold and a progress fraction so the UI
# can show "locked" badges filling up. Icons are lucide-react names.
_BADGE_DEFS = [
    {"id": "first_report", "name": "First Sighting", "icon": "Eye",
     "description": "Report your first suspicious message", "signal": "reports", "target": 1},
    {"id": "sharp_eye", "name": "Sharp Eye", "icon": "ScanEye",
     "description": "Report 5 suspicious messages", "signal": "reports", "target": 5},
    {"id": "perfect_score", "name": "Perfect Score", "icon": "Target",
     "description": "Ace a training quiz (100%)", "signal": "best_score", "target": 100},
    {"id": "streak_keeper", "name": "Streak Keeper", "icon": "Flame",
     "description": "Pass 3 modules in a row", "signal": "streak", "target": 3},
    {"id": "fast_learner", "name": "Fast Learner", "icon": "GraduationCap",
     "description": "Complete 5 training modules", "signal": "completed", "target": 5},
    {"id": "unclickable", "name": "Unclickable", "icon": "ShieldCheck",
     "description": "Face simulations without ever clicking a lure", "signal": "unclickable", "target": 1},
]


def _badges(**signals) -> list[dict]:
    values = {
        "reports": signals["reports"],
        "best_score": signals["best_score"],
        "streak": signals["streak"],
        "completed": signals["completed"],
        # Earned once the employee has faced ≥1 simulation and never clicked.
        "unclickable": 1 if (signals["faced_sims"] > 0 and signals["sim_clicks"] == 0) else 0,
    }
    out = []
    for b in _BADGE_DEFS:
        value = values.get(b["signal"], 0)
        earned = value >= b["target"]
        out.append({
            "id": b["id"],
            "name": b["name"],
            "icon": b["icon"],
            "description": b["description"],
            "earned": earned,
            "progress": round(min(1.0, value / b["target"]), 2),
        })
    return out


def _team_leaderboard(db: Session, my_department_id: int) -> list[dict]:
    """Department standings: average risk score (lower = safer) with points."""
    departments = db.execute(select(Department)).scalars().all()
    rows = []
    for dept in departments:
        employees = db.execute(
            select(Employee).where(Employee.department_id == dept.id)
        ).scalars().all()
        if not employees:
            continue
        avg_risk = sum(e.current_risk_score for e in employees) / len(employees)
        points = 0
        for emp in employees:
            completed = [a for a in emp.assignments if a.status == AssignmentStatus.COMPLETED]
            points += sum(50 + int((a.score or 0) / 2) for a in completed)
        rows.append({
            "department_id": dept.id,
            "name": dept.name,
            "avg_risk": round(avg_risk, 1),
            "points": points,
            "is_mine": dept.id == my_department_id,
        })
    # Safest team first (lowest average risk).
    rows.sort(key=lambda r: r["avg_risk"])
    return rows
