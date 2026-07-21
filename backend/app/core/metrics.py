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


# Below this many resolved events a rate is statistically meaningless — 1 click
# out of 2 is not a "50% click rate". Report it as insufficient rather than
# printing a number a CISO might repeat to their board.
MIN_SAMPLE = 5


def compute_current_metrics(db: Session) -> dict:
    """Outcome metrics over the trailing window — strictly that window.

    Rates are returned as ``None`` with an explicit sample size when the window
    holds too little data. An earlier version silently substituted the all-time
    figure whenever the window was empty, while the UI kept the "last 30 days"
    label — so a dormant month rendered as healthy recent performance. A metric
    that quietly changes its own denominator is worse than a missing one.
    """
    since = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)

    targets = db.execute(
        select(SimulationTarget).where(SimulationTarget.outcome != SimOutcome.PENDING)
    ).scalars().all()
    recent = [t for t in targets if t.outcome_at and _aware(t.outcome_at) >= since]
    clicks = sum(1 for t in recent if t.outcome == SimOutcome.CLICKED)
    reports = sum(1 for t in recent if t.outcome == SimOutcome.REPORTED)
    sim_n = len(recent)
    sim_ok = sim_n >= MIN_SAMPLE

    avg_risk = db.execute(select(func.avg(Employee.current_risk_score))).scalar()

    assignments = db.execute(select(TrainingAssignment)).scalars().all()
    recent_assignments = [a for a in assignments if _aware(a.assigned_at) >= since]
    completed = sum(1 for a in recent_assignments if a.status == AssignmentStatus.COMPLETED)
    train_n = len(recent_assignments)
    train_ok = train_n >= MIN_SAMPLE

    return {
        "window_days": WINDOW_DAYS,
        "min_sample": MIN_SAMPLE,
        "phishing_click_rate": round(clicks / sim_n, 3) if sim_ok else None,
        "report_rate": round(reports / sim_n, 3) if sim_ok else None,
        "simulation_sample": sim_n,
        # Risk is a point-in-time property of the roster, not a windowed rate —
        # it is always well-defined as long as employees exist.
        "avg_risk_score": round(float(avg_risk), 1) if avg_risk is not None else None,
        "training_completion_rate": round(completed / train_n, 3) if train_ok else None,
        "training_sample": train_n,
    }


# Only these keys are persisted columns; the rest of compute_current_metrics()
# is presentation metadata (window size, sample counts).
_SNAPSHOT_FIELDS = (
    "phishing_click_rate",
    "report_rate",
    "avg_risk_score",
    "training_completion_rate",
)


def upsert_today_snapshot(db: Session) -> MetricSnapshot:
    """Write/update today's snapshot — called by the loop's FEEDBACK stage.

    A rate with too small a sample is stored as NULL rather than 0.0: a quiet
    month is "no measurement", not "nobody clicked". Charting a fabricated zero
    would bend the trend line the product uses as its proof of efficacy.
    """
    today = datetime.now(timezone.utc).date()
    existing = db.execute(select(MetricSnapshot)).scalars().all()
    snapshot = next((s for s in existing if _aware(s.date).date() == today), None)
    metrics = compute_current_metrics(db)
    values = {k: metrics[k] for k in _SNAPSHOT_FIELDS}
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
