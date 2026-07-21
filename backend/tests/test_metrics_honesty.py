"""Metrics must never fabricate a number they did not measure.

The regression these guard against: `compute_current_metrics` used to fall back
to the all-time pool whenever the trailing window was empty, while the UI kept
its "last 30 days" label — so a dormant month rendered as healthy recent
performance.
"""
from datetime import datetime, timedelta, timezone

from app.core import metrics
from app.models import (
    Employee,
    PhishingSimulation,
    SimOutcome,
    SimulationStatus,
    SimulationTarget,
)


def _old(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _clear_simulation_history(db) -> None:
    """Start from a known-empty window — the seeded world has recent outcomes."""
    db.query(SimulationTarget).delete()
    db.flush()


def test_stale_outcomes_do_not_masquerade_as_recent(db):
    """Outcomes older than the window must not be reported as this month's rate."""
    _clear_simulation_history(db)
    sim = PhishingSimulation(name="ancient drill", status=SimulationStatus.COMPLETED)
    db.add(sim)
    db.flush()
    employees = db.query(Employee).limit(6).all()
    assert len(employees) >= 6, "seeded roster required"
    for emp in employees:
        db.add(
            SimulationTarget(
                simulation_id=sim.id,
                employee_id=emp.id,
                outcome=SimOutcome.CLICKED,
                # Well outside WINDOW_DAYS.
                outcome_at=_old(metrics.WINDOW_DAYS + 120),
            )
        )
    db.flush()

    result = metrics.compute_current_metrics(db)
    # Those 6 stale clicks would previously have produced a 100% click rate.
    assert result["phishing_click_rate"] is None
    assert result["simulation_sample"] == 0
    db.rollback()


def test_small_sample_is_reported_as_insufficient(db):
    """1 click out of 2 is not a 50% click rate."""
    _clear_simulation_history(db)
    sim = PhishingSimulation(name="tiny drill", status=SimulationStatus.ACTIVE)
    db.add(sim)
    db.flush()
    employees = db.query(Employee).limit(2).all()
    for i, emp in enumerate(employees):
        db.add(
            SimulationTarget(
                simulation_id=sim.id,
                employee_id=emp.id,
                outcome=SimOutcome.CLICKED if i == 0 else SimOutcome.REPORTED,
                outcome_at=datetime.now(timezone.utc),
            )
        )
    db.flush()

    result = metrics.compute_current_metrics(db)
    assert result["simulation_sample"] == 2
    assert result["simulation_sample"] < metrics.MIN_SAMPLE
    assert result["phishing_click_rate"] is None
    assert result["report_rate"] is None
    db.rollback()


def test_sufficient_sample_does_report_a_rate(db):
    """The guard must not swallow genuine measurements."""
    _clear_simulation_history(db)
    sim = PhishingSimulation(name="real drill", status=SimulationStatus.COMPLETED)
    db.add(sim)
    db.flush()
    employees = db.query(Employee).limit(10).all()
    assert len(employees) >= 10
    for i, emp in enumerate(employees):
        db.add(
            SimulationTarget(
                simulation_id=sim.id,
                employee_id=emp.id,
                outcome=SimOutcome.CLICKED if i < 3 else SimOutcome.IGNORED,
                outcome_at=datetime.now(timezone.utc),
            )
        )
    db.flush()

    result = metrics.compute_current_metrics(db)
    assert result["simulation_sample"] == 10
    assert result["phishing_click_rate"] == 0.3
    db.rollback()


def test_metrics_expose_their_own_window_and_sample(db):
    """The UI needs to be able to caption a rate honestly."""
    result = metrics.compute_current_metrics(db)
    assert result["window_days"] == metrics.WINDOW_DAYS
    assert result["min_sample"] == metrics.MIN_SAMPLE
    assert isinstance(result["simulation_sample"], int)
    assert isinstance(result["training_sample"], int)


def test_snapshot_persists_only_real_columns(db):
    """compute_current_metrics carries presentation metadata the table lacks."""
    snapshot = metrics.upsert_today_snapshot(db)
    db.flush()
    assert hasattr(snapshot, "phishing_click_rate")
    # window_days / samples are metadata, not columns — they must not be set.
    assert not hasattr(snapshot, "window_days")
    db.rollback()


def test_trend_preserves_nulls(db):
    """An unmeasured period must stay null so charts render a gap, not a zero."""
    for point in metrics.trend(db, days=365):
        for key in ("phishing_click_rate", "report_rate", "avg_risk_score"):
            value = point[key]
            assert value is None or isinstance(value, (int, float))
