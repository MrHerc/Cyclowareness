"""The circular-measurement defect, and the property that closes it.

`training_completed` is -4.0 and `training_comprehension` is -6.0, so completing
an assigned module subtracts ten points from the composite score. That composite
was also the line the dashboard charted as proof the training worked — so
assigning more training moved the line down, and the product reported an
improvement it had manufactured. Nobody had to behave differently.

The property below is the whole fix, stated once: **finishing training must not
move behaviour risk.** Everything else here guards the arithmetic around it.

See docs/REMEDIATION-ENGINE.md §10.
"""
from __future__ import annotations

import pytest

from app.core import metrics, risk_engine
from app.models import Employee, EmployeeStatus


@pytest.fixture
def person(db):
    """A throwaway employee on the shared demo roster."""
    from app.models import Department

    department = db.query(Department).first()
    employee = Employee(
        name="Split Subject",
        email="split.subject@example.test",
        department_id=department.id,
        role_title="Analyst",
        role_sensitivity=0.5,
    )
    db.add(employee)
    db.flush()
    risk_engine.recompute_score(db, employee)
    db.commit()
    yield employee
    db.query(Employee).filter(Employee.id == employee.id).delete()
    db.commit()


def test_completing_training_does_not_move_behaviour_risk(db, person):
    """THE POINT OF THE SPLIT.

    If this ever passes by accident — because both numbers moved — the product
    is back to proving its own efficacy by assigning homework.
    """
    before = person.behaviour_risk

    risk_engine.apply_event(db, person, "training_completed", "finished the module")
    risk_engine.apply_event(db, person, "training_comprehension", "scored 100%", scale=1.0)
    db.commit()

    assert person.behaviour_risk == before, "training moved the efficacy number"
    assert person.training_credit < 0, "training earned no credit"
    # The composite still falls — that is intended, and is why it must never be
    # the number an efficacy claim is read from.
    assert person.current_risk_score < before


def test_clicking_a_lure_does_move_behaviour_risk(db, person):
    """The mirror. A split that never moves is not a measurement."""
    before = person.behaviour_risk
    risk_engine.apply_event(db, person, "simulated_phish_click", "clicked the lure")
    db.commit()
    assert person.behaviour_risk > before


def test_reporting_lowers_behaviour_risk(db, person):
    """Reporting is behaviour, and good behaviour is the only honest way down."""
    risk_engine.apply_event(db, person, "simulated_phish_click", "clicked")
    db.commit()
    after_click = person.behaviour_risk

    risk_engine.apply_event(db, person, "simulated_phish_report", "reported the next one")
    db.commit()
    assert person.behaviour_risk < after_click


def test_the_two_halves_reconcile_with_the_composite(db, person):
    """`behaviour + engagement` must equal what the same screen shows.

    Not decoration: the audit trail is the product's claim to being explainable,
    and two numbers that do not add up to the third make every screen showing
    them arguable.
    """
    risk_engine.apply_event(db, person, "simulated_phish_click", "clicked")
    risk_engine.apply_event(db, person, "training_completed", "finished")
    db.commit()
    risk_engine.recompute_score(db, person)
    db.commit()

    expected = risk_engine.clamp(person.behaviour_risk + person.training_credit)
    assert person.current_risk_score == pytest.approx(expected, abs=0.05)


def test_recompute_rebuilds_both_halves_from_the_trail(db, person):
    """The split must be derivable from history, not only maintained forward.

    Otherwise a deployment that already had events could never be given a true
    behaviour score, and the migration that backfills one would be guessing.
    """
    risk_engine.apply_event(db, person, "simulated_phish_click", "clicked")
    risk_engine.apply_event(db, person, "training_completed", "finished")
    db.commit()
    behaviour, credit = person.behaviour_risk, person.training_credit

    # Corrupt both, then rebuild from the events alone.
    person.behaviour_risk = 0.0
    person.training_credit = 999.0
    db.commit()
    risk_engine.recompute_score(db, person)
    db.commit()

    assert person.behaviour_risk == pytest.approx(behaviour, abs=0.05)
    assert person.training_credit == pytest.approx(credit, abs=0.05)


def test_an_unclassified_event_cannot_move_the_efficacy_number(db, person):
    """A signal nobody has classified defaults to engagement, deliberately.

    The alternative — defaulting to behaviour — means any new event type added
    in a hurry silently gains the power to move the one number the product
    stakes its efficacy claim on.
    """
    assert risk_engine.component_of("some_future_signal") == "engagement"
    before = person.behaviour_risk
    risk_engine.apply_event(
        db, person, "some_future_signal", "a signal nobody classified", delta_override=15.0
    )
    db.commit()
    assert person.behaviour_risk == before


def test_the_org_average_excludes_people_who_have_left(db):
    """A leaver's frozen score must stop pulling the organisation's number.

    `Employee.status` exists for exactly this, and `select_targets` and
    `department_rollups` already honoured it; the metrics query did not.
    """
    from app.models import Department

    department = db.query(Department).first()
    leaver = Employee(
        name="Departed Person",
        email="departed@example.test",
        department_id=department.id,
        role_sensitivity=1.0,
        status=EmployeeStatus.LEFT,
        current_risk_score=100.0,
        behaviour_risk=100.0,
    )
    db.add(leaver)
    db.commit()
    try:
        with_leaver = metrics.compute_current_metrics(db)["avg_behaviour_risk"]
        leaver.status = EmployeeStatus.ACTIVE
        db.commit()
        with_active = metrics.compute_current_metrics(db)["avg_behaviour_risk"]
        assert with_active > with_leaver, "a 100-risk person changed nothing when made active"
    finally:
        db.query(Employee).filter(Employee.id == leaver.id).delete()
        db.commit()


def test_the_efficacy_series_is_stored_on_every_snapshot(db):
    """The chart cannot draw a line the snapshot never recorded."""
    snapshot = metrics.upsert_today_snapshot(db)
    db.commit()
    assert hasattr(snapshot, "avg_behaviour_risk")
    assert "avg_behaviour_risk" in metrics._SNAPSHOT_FIELDS
    series = metrics.trend(db, days=365)
    assert series, "no snapshots to check"
    assert "avg_behaviour_risk" in series[-1]
