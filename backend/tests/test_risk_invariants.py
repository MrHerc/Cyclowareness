"""Invariants for the number the product sells.

The risk score is marketed as transparent and explainable: "every number traces
back to concrete events". These tests hold that claim to its word, and each one
reproduces a defect that shipped.
"""
import pytest
from sqlalchemy import func, select

from app.core import risk_engine
from app.models import Employee, RiskEvent


def _explained(db, emp: Employee) -> float:
    total = db.execute(
        select(func.sum(RiskEvent.delta)).where(RiskEvent.employee_id == emp.id)
    ).scalar()
    return round(risk_engine.baseline_for(emp) + float(total or 0.0), 2)


def test_every_seeded_score_is_derivable_from_its_own_audit_trail(db):
    """baseline + sum(events) == the score shown above the breakdown.

    Regression: the seeded roster assigned each employee a hand-picked score
    while writing RiskEvents independently, so the employee drawer showed a
    "Score breakdown (explainable)" that summed to a different number than the
    "Current risk score" printed directly above it — for all 26 employees.
    """
    employees = db.execute(select(Employee)).scalars().all()
    assert employees, "seed produced no employees"
    mismatches = [
        (e.name, e.current_risk_score, _explained(db, e))
        for e in employees
        if abs(_explained(db, e) - e.current_risk_score) > 0.05
    ]
    assert not mismatches, f"score does not equal baseline + events for: {mismatches}"


def test_clamped_delta_is_recorded_at_the_value_actually_applied(db):
    """A weight absorbed by the 0/100 rail must not be logged at full value.

    Regression: apply_event() persisted the requested delta and separately
    clamped the score, so an employee already at 100 who clicked again got a
    +12 event that moved nothing — permanently breaking the invariant above.
    """
    emp = db.execute(select(Employee)).scalars().first()
    original = emp.current_risk_score
    try:
        emp.current_risk_score = 97.0
        event = risk_engine.apply_event(db, emp, "simulated_phish_click", reason="test clamp")
        db.flush()

        assert emp.current_risk_score == 100.0
        assert event.delta == pytest.approx(3.0), (
            f"logged {event.delta} but the score only moved 3.0"
        )
    finally:
        db.rollback()
        emp = db.get(Employee, emp.id)
        emp.current_risk_score = original
        db.commit()


def test_exposure_is_only_claimed_for_people_the_artifact_reached(db):
    """`exposed` gates the +8 'Exposed to real threat' event.

    Regression: TARGET charged every selected employee a real_threat_exposure
    penalty, including those selected purely because their score was already
    high. That asserted an exposure that never happened, and made the score
    self-amplifying — a high score selected you, the selection raised it, and
    the higher score selected you again on the next unrelated threat.
    """
    targets = risk_engine.select_targets(
        db, threat_type="bec", artifact_meta={}, reporter_id=None
    )
    assert targets, "no targets selected for a BEC threat"

    for t in targets:
        expected = any(r in risk_engine.EXPOSURE_REASONS for r in t["reasons"])
        assert t["exposed"] is expected, f"{t['name']}: exposed={t['exposed']} for {t['reasons']}"

    # Someone pulled in only by a prior must not be marked exposed.
    prior_only = [t for t in targets if not t["exposed"]]
    for t in prior_only:
        assert all(r not in risk_engine.EXPOSURE_REASONS for r in t["reasons"])


def test_direct_recipients_are_marked_exposed(db):
    """The other half of the same rule: a named recipient IS exposed."""
    emp = db.execute(select(Employee)).scalars().first()
    targets = risk_engine.select_targets(
        db,
        threat_type="phishing",
        artifact_meta={"recipients": [emp.email]},
        reporter_id=None,
    )
    mine = next((t for t in targets if t["employee_id"] == emp.id), None)
    assert mine is not None, "a named recipient was not selected"
    assert mine["exposed"] is True
    assert "Received this artifact" in mine["reasons"]
