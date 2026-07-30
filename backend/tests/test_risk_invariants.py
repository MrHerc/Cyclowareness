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


# --- the three defects found while designing the Remediation Engine ------------


def test_being_mailed_a_threat_cannot_move_your_score(db):
    """An outsider must not have a write primitive on the risk heatmap.

    Regression: `real_threat_exposure` carried +8.0 and was charged to everyone
    the artifact "reached", which included merely receiving it and merely working
    in an exposed department. Mailing a chosen employee six times drove them to
    the top of the heatmap having done nothing, and one BEC mail to finance
    charged +8 to every person in the department.

    The event is still recorded — it explains why they were selected for
    training — but it no longer accuses them of anything.
    """
    emp = db.execute(select(Employee)).scalars().first()
    before = emp.current_risk_score
    try:
        for _ in range(6):
            risk_engine.apply_event(
                db, emp, "real_threat_exposure", reason="Exposed to a real threat"
            )
        db.flush()
        assert emp.current_risk_score == before, (
            f"six deliveries moved the score {before} -> {emp.current_risk_score}"
        )
        assert risk_engine.WEIGHTS["real_threat_exposure"] == 0.0
    finally:
        db.rollback()


def test_a_bad_batch_can_be_revoked_and_the_score_recomputed(db):
    """Regression: nothing could withdraw a risk event.

    `apply_event` moved the score incrementally with no path back, so one
    misconfigured connector was permanent. A number nobody can withdraw is a
    number nobody should trust.
    """
    emp = db.execute(select(Employee)).scalars().first()
    original = emp.current_risk_score
    try:
        event = risk_engine.apply_event(
            db, emp, "simulated_phish_click", reason="poisoned batch"
        )
        event.source_id = "connector:test:batch-1"
        db.flush()
        assert emp.current_risk_score > original, "setup failed — score did not move"

        affected = risk_engine.revoke_events(
            db, source_id="connector:test:batch-1", reason="connector misconfigured"
        )
        db.flush()

        assert [e.id for e in affected] == [emp.id]
        assert emp.current_risk_score == original, "score did not return after revocation"
        # Revoked, not deleted: the trail still shows the claim was made.
        assert event.revoked_at is not None
        assert event.revoked_reason == "connector misconfigured"
    finally:
        db.rollback()


def test_revoked_events_leave_the_breakdown(db):
    """The explainable breakdown must agree with the score after a revocation."""
    emp = db.execute(select(Employee)).scalars().first()
    try:
        event = risk_engine.apply_event(
            db, emp, "simulated_phish_click", reason="poisoned"
        )
        event.source_id = "connector:test:batch-2"
        db.flush()
        risk_engine.revoke_events(db, source_id="connector:test:batch-2", reason="x")
        db.flush()

        breakdown = risk_engine.risk_breakdown(db, emp)
        explained = round(sum(item["contribution"] for item in breakdown), 2)
        assert abs(explained - emp.current_risk_score) < 0.05, (
            f"breakdown {explained} != score {emp.current_risk_score} after revocation"
        )
    finally:
        db.rollback()


def test_departed_employees_are_not_targeted(db):
    """Regression: `Employee` had no lifecycle, so someone who left in March was
    still assigned training in July and still averaged into the heatmap."""
    from app.models import EmployeeStatus

    emp = db.execute(select(Employee)).scalars().first()
    try:
        emp.status = EmployeeStatus.LEFT
        db.flush()
        targets = risk_engine.select_targets(
            db,
            threat_type="phishing",
            artifact_meta={"recipients": [emp.email]},
            reporter_id=None,
        )
        assert all(t["employee_id"] != emp.id for t in targets), (
            "a departed employee was selected for training"
        )
    finally:
        db.rollback()


def test_departed_employees_leave_the_department_heatmap(db):
    from app.models import EmployeeStatus

    emp = db.execute(select(Employee)).scalars().first()
    dept_id = emp.department_id
    before = next(d for d in risk_engine.department_rollups(db) if d["id"] == dept_id)
    try:
        emp.status = EmployeeStatus.LEFT
        db.flush()
        after = next(d for d in risk_engine.department_rollups(db) if d["id"] == dept_id)
        assert after["employee_count"] == before["employee_count"] - 1
    finally:
        db.rollback()
