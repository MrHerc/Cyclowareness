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


# --- the floor applies on every screen, not only the command centre -----------
def test_a_campaign_rate_is_withheld_below_the_platforms_own_floor(
    client, analyst_headers, db
):
    """A percentage of three people is not a percentage of the organisation.

    `metrics.MIN_SAMPLE` is 5 and the command centre says so in words — "a rate
    is withheld below 5 resolved events". The simulation screen computed one
    from any non-zero sample, so a campaign with three outcomes showed a click
    rate a few pixels from the sentence promising it would not. An analyst who
    can see both learns that the honesty language is decorative.
    """
    from app.core import metrics
    from app.models import Department, Employee

    # ITS OWN PEOPLE, not the seed's. Recording an outcome for a seeded employee
    # writes risk events and a remediation plan against a row other tests assert
    # on, and the `db` fixture does not reset between tests — borrowing
    # employees 1-6 here made a policy-router assertion fail three files later.
    department = db.query(Department).first()
    people = [
        Employee(
            name=f"Sample Floor {n}",
            email=f"sample.floor.{n}@example.test",
            department_id=department.id,
            role_title="Tester",
            role_sensitivity=0.4,
        )
        for n in range(metrics.MIN_SAMPLE + 1)
    ]
    db.add_all(people)
    db.commit()

    created = client.post(
        "/api/simulations",
        json={"name": "Sample floor", "target_employee_ids": [p.id for p in people]},
        headers=analyst_headers,
    ).json()
    client.post(f"/api/simulations/{created['id']}/launch", headers=analyst_headers)
    detail = client.get(f"/api/simulations/{created['id']}", headers=analyst_headers).json()

    # Below the floor: resolve one fewer than MIN_SAMPLE.
    for target in detail["targets"][: metrics.MIN_SAMPLE - 1]:
        client.post(
            f"/api/simulations/{created['id']}/targets/{target['id']}/outcome",
            json={"outcome": "clicked"},
            headers=analyst_headers,
        )
    below = client.get(f"/api/simulations/{created['id']}", headers=analyst_headers).json()
    assert below["stats"]["resolved"] == metrics.MIN_SAMPLE - 1
    assert below["stats"]["click_rate"] is None, (
        f"a rate was published from {below['stats']['resolved']} resolved targets, "
        f"below the platform's own floor of {metrics.MIN_SAMPLE}"
    )
    assert below["stats"]["clicked"] == metrics.MIN_SAMPLE - 1, "the COUNT is still reported"

    # One more crosses it, so the floor is a floor and not a mute button.
    client.post(
        f"/api/simulations/{created['id']}/targets/{detail['targets'][metrics.MIN_SAMPLE - 1]['id']}/outcome",
        json={"outcome": "reported"},
        headers=analyst_headers,
    )
    at = client.get(f"/api/simulations/{created['id']}", headers=analyst_headers).json()
    assert at["stats"]["resolved"] == metrics.MIN_SAMPLE
    assert at["stats"]["click_rate"] is not None
    assert at["stats"]["min_sample"] == metrics.MIN_SAMPLE

    for person in people:
        db.query(Employee).filter(Employee.id == person.id).delete()
    db.commit()


def test_the_trend_says_which_points_were_seeded(client, analyst_headers):
    """The executive view differences the live current value against a snapshot.

    A snapshot the demo seed drew and one the loop measured are both floats, so
    without `source` the page cannot tell them apart — and it differenced a live
    reading against a hand-written curve and captioned the result "an
    improvement". `avg_behaviour_risk` read "30.0, -23.7 — an improvement"
    against a fabricated 53.7 on the deployment, which is the most quotable
    number on the page.

    The client refuses the comparison when the baseline is seeded. That refusal
    is only possible while every point carries its provenance, so this asserts
    the field never quietly disappears from the payload.
    """
    body = client.get("/api/dashboard/executive", headers=analyst_headers).json()
    trend = body["trend"]
    assert trend, "no snapshots at all — the assertion below would be vacuous"

    for point in trend:
        assert "source" in point, (
            f"snapshot {point.get('date')} carries no source, so the executive "
            f"view cannot tell a measurement from seeded demo data"
        )
        assert point["source"] in ("measured", "seeded"), point["source"]
