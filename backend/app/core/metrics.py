"""Outcome metrics (spec §6.7) — the proof the loop works.

Four first-class metrics, computed from raw events and snapshotted daily so
the dashboard can chart before/after trends:

* phishing click-rate   — clicks / targets across simulations (last 30 days)
* report rate           — reported / targets ("human sensor" strength)
* average risk score    — org-wide mean of employee scores
* training completion   — completed / assigned (last 30 days)
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import (
    AssignmentStatus,
    Employee,
    MetricSnapshot,
    SimOutcome,
    SimulationTarget,
    TrainingAssignment,
)

WINDOW_DAYS = 30


def compute_current_metrics(db: Session) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)

    targets = db.execute(
        select(SimulationTarget).where(SimulationTarget.outcome != SimOutcome.PENDING)
    ).scalars().all()
    recent = [t for t in targets if t.outcome_at and _aware(t.outcome_at) >= since]
    pool = recent if recent else targets
    clicks = sum(1 for t in pool if t.outcome == SimOutcome.CLICKED)
    reports = sum(1 for t in pool if t.outcome == SimOutcome.REPORTED)

    avg_risk = db.execute(select(func.avg(Employee.current_risk_score))).scalar() or 0.0

    assignments = db.execute(select(TrainingAssignment)).scalars().all()
    recent_assignments = [a for a in assignments if _aware(a.assigned_at) >= since]
    pool_a = recent_assignments if recent_assignments else assignments
    completed = sum(1 for a in pool_a if a.status == AssignmentStatus.COMPLETED)

    return {
        "phishing_click_rate": round(clicks / len(pool), 3) if pool else 0.0,
        "report_rate": round(reports / len(pool), 3) if pool else 0.0,
        "avg_risk_score": round(float(avg_risk), 1),
        "training_completion_rate": round(completed / len(pool_a), 3) if pool_a else 0.0,
    }


def upsert_today_snapshot(db: Session) -> MetricSnapshot:
    """Write/update today's snapshot — called by the loop's FEEDBACK stage."""
    today = datetime.now(timezone.utc).date()
    existing = db.execute(select(MetricSnapshot)).scalars().all()
    snapshot = next((s for s in existing if _aware(s.date).date() == today), None)
    values = compute_current_metrics(db)
    if snapshot is None:
        snapshot = MetricSnapshot(date=datetime.now(timezone.utc), **values)
    else:
        for key, value in values.items():
            setattr(snapshot, key, value)
    db.add(snapshot)
    return snapshot


def trend(db: Session, days: int = 180) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    snapshots = db.execute(
        select(MetricSnapshot).order_by(MetricSnapshot.date)
    ).scalars().all()
    return [
        {
            "date": _aware(s.date).date().isoformat(),
            "phishing_click_rate": s.phishing_click_rate,
            "report_rate": s.report_rate,
            "avg_risk_score": s.avg_risk_score,
            "training_completion_rate": s.training_completion_rate,
        }
        for s in snapshots
        if _aware(s.date) >= since
    ]


def _aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; normalise to UTC-aware."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
