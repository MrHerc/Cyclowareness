"""The person a risk event is about can now say it is wrong.

An analyst could already withdraw a bad batch — `risk_engine.revoke_events` —
and `revoked_at` exists so "a claim was made and later withdrawn" stays a
different fact from "the claim never existed". The route in the other direction
did not exist at all.

These are the events that put HIGH RISK beside a named person on their own
screen. If one is wrong — a shared workstation, a mis-attributed simulation
target, a click recorded against the wrong person — the score stood, the label
stayed, and the only recourse was knowing an analyst personally.

The same three properties the remediation-plan appeal has to hold, because they
are the same argument: only the person it names can file, filing does not
decide, and the outcome — including a withdrawal — reaches them.
"""
from __future__ import annotations

import pytest

from app.core import risk_engine
from app.models import Department, Employee, RiskEvent, User


@pytest.fixture
def my_event(db):
    """A risk event belonging to the demo employee."""
    user = db.query(User).filter(User.email == "rashad.mammadov@caspiandynamics.az").one()
    assert user.employee_id is not None
    employee = db.get(Employee, user.employee_id)
    before = employee.current_risk_score

    # THROUGH `apply_event`, not by inserting a row. A hand-built RiskEvent never
    # touches `current_risk_score`, so the score would not contain the event and
    # "revoking it lowers the score" would pass or fail for the wrong reason.
    # The point of the test is that a real contribution can be withdrawn.
    event = risk_engine.apply_event(
        db,
        employee,
        "simulated_phish_click",
        reason='Clicked lure in simulation "Contest fixture"',
    )
    db.commit()
    db.refresh(event)
    yield event

    db.query(RiskEvent).filter(RiskEvent.id == event.id).delete()
    db.commit()
    employee = db.get(Employee, user.employee_id)
    employee.current_risk_score = before
    db.add(employee)
    db.commit()


@pytest.fixture
def someone_elses_event(db):
    department = db.query(Department).first()
    other = Employee(
        name="Kamran Testov",
        email="kamran.testov@example.test",
        department_id=department.id,
        role_title="Analyst",
        role_sensitivity=0.5,
    )
    db.add(other)
    db.commit()
    event = RiskEvent(
        employee_id=other.id, type="simulated_phish_click", delta=12.0, reason="Not yours"
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    yield event
    db.query(RiskEvent).filter(RiskEvent.id == event.id).delete()
    db.query(Employee).filter(Employee.id == other.id).delete()
    db.commit()


# --- who may file -------------------------------------------------------------
def test_the_person_an_event_is_about_can_contest_it(client, employee_headers, my_event):
    r = client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "That was not me — the machine is shared with the front desk."},
        headers=employee_headers,
    )
    assert r.status_code == 200, r.text
    events = {e["id"]: e for e in r.json()["recent_events"]}
    assert events[my_event.id]["contested_at"] is not None
    assert "front desk" in events[my_event.id]["contest_note"]


def test_contesting_someone_elses_event_answers_404_not_403(
    client, employee_headers, someone_elses_event
):
    """404 deliberately.

    A 403 confirms the row exists, which tells the asker that a named colleague
    has a risk event against them. Probing ids must not be a way to learn who
    the organisation considers risky.
    """
    r = client.post(
        f"/api/employees/me/risk-events/{someone_elses_event.id}/contest",
        json={"note": "not mine"},
        headers=employee_headers,
    )
    assert r.status_code == 404, r.text


def test_an_analyst_cannot_file_on_someones_behalf(client, analyst_headers, my_event):
    """A contest filed by the people who assigned the score is not a contest."""
    r = client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "filing for them"},
        headers=analyst_headers,
    )
    assert r.status_code in (403, 404), r.text


# --- what filing does, and does not do ----------------------------------------
def test_filing_does_not_move_the_score(client, employee_headers, my_event, db):
    """A contest asks a human to look, not a self-service reversal.

    If filing one withdrew the event, "contest" becomes the button everyone
    presses and the number stops meaning anything.
    """
    employee = db.get(Employee, my_event.employee_id)
    before = employee.current_risk_score

    r = client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "I dispute this."},
        headers=employee_headers,
    )
    assert r.status_code == 200
    db.expire_all()
    assert db.get(Employee, my_event.employee_id).current_risk_score == before
    assert db.get(RiskEvent, my_event.id).revoked_at is None


def test_a_second_contest_cannot_overwrite_the_first(client, employee_headers, my_event):
    first = client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "the original words"},
        headers=employee_headers,
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "different words"},
        headers=employee_headers,
    )
    assert second.status_code == 409


# --- the answer ---------------------------------------------------------------
def test_upholding_the_contest_withdraws_the_event_and_moves_the_score(
    client, employee_headers, analyst_headers, my_event, db
):
    """The outcome that makes the route real.

    A process whose only possible answer is "upheld against you" is not a
    contest. Revoking recomputes the score so the number stops resting on a
    record the organisation has agreed was wrong.
    """
    employee = db.get(Employee, my_event.employee_id)
    before = employee.current_risk_score

    client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "Shared machine — the click was not mine."},
        headers=employee_headers,
    )
    answered = client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "Checked the session log — you are right.", "revoke": True},
        headers=analyst_headers,
    )
    assert answered.status_code == 200, answered.text

    db.expire_all()
    event = db.get(RiskEvent, my_event.id)
    assert event.revoked_at is not None, "the event was not withdrawn"
    assert event.contest_resolved_by == "analyst@caspiandynamics.az"
    after = db.get(Employee, my_event.employee_id).current_risk_score
    assert after < before, f"the score did not move: {before} -> {after}"


def test_the_event_is_withdrawn_never_deleted(
    client, employee_headers, analyst_headers, my_event, db
):
    """"A claim was made and later withdrawn" is a different fact from "the
    claim never existed", and the audit trail owes the employee the first."""
    client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "Not me."},
        headers=employee_headers,
    )
    client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "Upheld.", "revoke": True},
        headers=analyst_headers,
    )
    db.expire_all()
    assert db.get(RiskEvent, my_event.id) is not None, "the event row was deleted"


def test_a_contest_can_be_answered_without_withdrawing(
    client, employee_headers, analyst_headers, my_event, db
):
    """Upholding the record is a legitimate answer, and must not move the score."""
    employee = db.get(Employee, my_event.employee_id)
    before = employee.current_risk_score

    client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "I do not remember this."},
        headers=employee_headers,
    )
    r = client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "The click came from your session on your own device.", "revoke": False},
        headers=analyst_headers,
    )
    assert r.status_code == 200
    db.expire_all()
    assert db.get(RiskEvent, my_event.id).revoked_at is None
    assert db.get(Employee, my_event.employee_id).current_risk_score == before


def test_the_employee_reads_the_answer_on_their_own_profile(
    client, employee_headers, analyst_headers, my_event
):
    client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "Shared machine."},
        headers=employee_headers,
    )
    client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "Checked the log — you are right.", "revoke": True},
        headers=analyst_headers,
    )
    mine = client.get("/api/employees/me", headers=employee_headers).json()
    row = next(e for e in mine["recent_events"] if e["id"] == my_event.id)
    assert "you are right" in row["contest_resolution"]
    assert row["revoked_at"] is not None


def test_an_employee_cannot_answer_their_own_contest(client, employee_headers, my_event):
    client.post(
        f"/api/employees/me/risk-events/{my_event.id}/contest",
        json={"note": "Not me."},
        headers=employee_headers,
    )
    r = client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "I agree with myself.", "revoke": True},
        headers=employee_headers,
    )
    assert r.status_code == 403


def test_an_uncontested_event_cannot_be_resolved(client, analyst_headers, my_event):
    r = client.post(
        f"/api/employees/risk-events/{my_event.id}/contest/resolution",
        json={"resolution": "answering nothing", "revoke": True},
        headers=analyst_headers,
    )
    assert r.status_code == 409
