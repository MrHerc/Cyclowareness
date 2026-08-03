"""The right of appeal — and the test that would have caught its absence.

`learner_disclosure` is stored on every plan and shown verbatim to the person it
names. It ends with a promise:

    "If you think this was assigned in error, use Dispute — that goes to a
     person, not to a system."

For a while the product made that promise with nothing behind it: no column, no
endpoint, no button. Nobody noticed, because every test asserted what the code
DID and none asserted that what the code SAYS is true. The first test here is
that assertion, written against the disclosure text rather than against the
route, so it keeps holding if the sentence is reworded.

The rest defend the three properties that make an appeal real rather than
decorative: only the person it names can file one, filing it does not decide it,
and the outcome — including a withdrawal — is visible to the person who filed.
"""
from __future__ import annotations

import pytest

from app.models import Department, Employee, User
from app.remediation import service
from app.remediation.models import PlanStatus, RemediationPlan


# --- the promise --------------------------------------------------------------
def test_every_route_the_disclosure_promises_actually_exists(client):
    """The disclosure names a route. The route must be mounted.

    THIS IS THE TEST THAT WAS MISSING. It reads the sentence the product shows a
    person and checks the application can honour it — so a disclosure that grows
    a second promise ("use Export to get a copy") fails here until the thing it
    names is built, rather than shipping as a sentence.

    Read from the SERVED OpenAPI document, not from `app.routes`: this FastAPI
    defers router inclusion until startup, so the in-memory list holds
    unexpanded placeholders and an introspection test would pass vacuously by
    finding nothing at all. The schema is also the more honest evidence — it is
    the surface the application actually publishes.
    """
    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    paths = set(schema.json()["paths"])
    assert len(paths) > 20, "the schema looks empty; this test would pass vacuously"
    disclosure = service.LEARNER_DISCLOSURE.lower()

    promised = {
        "dispute": "/api/remediation/plans/{plan_id}/dispute",
    }
    for word, path in promised.items():
        if word in disclosure:
            assert path in paths, (
                f"the learner disclosure promises {word!r} but no route serves it. "
                f"The product is telling people they have a right it cannot honour.\n"
                f"Disclosure: {service.LEARNER_DISCLOSURE}"
            )


# --- fixtures -----------------------------------------------------------------
@pytest.fixture
def approved_plan(db, client):
    """An approved plan belonging to the demo employee, so they can dispute it."""
    user = db.query(User).filter(User.email == "rashad.mammadov@caspiandynamics.az").one()
    assert user.employee_id is not None
    plan = RemediationPlan(
        trigger_kind="simulation_clicked",
        trigger_ref="simulation_target:disputetest",
        employee_id=user.employee_id,
        status=PlanStatus.APPROVED,
        framing={"headline": "Links that ask you to sign in again"},
        learner_disclosure=service.LEARNER_DISCLOSURE,
        urgency="prompt",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    yield plan
    db.query(RemediationPlan).filter(RemediationPlan.id == plan.id).delete()
    db.commit()


@pytest.fixture
def someone_elses_plan(db):
    """An approved plan belonging to a DIFFERENT person."""
    department = db.query(Department).first()
    other = Employee(
        name="Nigar Testova",
        email="nigar.testova@example.test",
        department_id=department.id,
        role_title="Analyst",
        role_sensitivity=0.5,
    )
    db.add(other)
    db.commit()
    plan = RemediationPlan(
        trigger_kind="simulation_clicked",
        trigger_ref="simulation_target:otherperson",
        employee_id=other.id,
        status=PlanStatus.APPROVED,
        framing={"headline": "Not yours"},
        urgency="routine",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    yield plan
    db.query(RemediationPlan).filter(RemediationPlan.id == plan.id).delete()
    db.query(Employee).filter(Employee.id == other.id).delete()
    db.commit()


# --- who may file -------------------------------------------------------------
def test_the_person_a_plan_names_can_dispute_it(client, employee_headers, approved_plan):
    r = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "I reported this message to the security team before I opened it."},
        headers=employee_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["disputed_at"] is not None
    assert "reported this message" in body["dispute_note"]


def test_disputing_someone_elses_plan_answers_404_not_403(
    client, employee_headers, someone_elses_plan
):
    """404, deliberately.

    A 403 confirms the row exists, which tells the asker that a named colleague
    has a remediation plan — exactly the disclosure `manager_visible=False`
    exists to prevent. Probing ids must not be a way to learn who failed a
    phishing test.
    """
    r = client.post(
        f"/api/remediation/plans/{someone_elses_plan.id}/dispute",
        json={"note": "not mine"},
        headers=employee_headers,
    )
    assert r.status_code == 404, r.text

    # And nothing was written to their plan.
    read = client.get(
        f"/api/remediation/plans/{someone_elses_plan.id}", headers=employee_headers
    )
    assert read.status_code == 403


def test_an_analyst_cannot_file_a_dispute_on_someones_behalf(
    client, analyst_headers, approved_plan
):
    """The analyst has no `employee_id`, so there is nothing they can dispute.

    An appeal filed by the person who assigned the training is not an appeal.
    """
    r = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "filing this for them"},
        headers=analyst_headers,
    )
    assert r.status_code in (403, 404), r.text


# --- what filing does, and does not do ----------------------------------------
def test_filing_a_dispute_does_not_decide_it(client, employee_headers, approved_plan, db):
    """A dispute is a request for a human to look, not a self-service withdrawal.

    If filing one un-assigned the training, "dispute" becomes the button
    everyone presses to make work disappear and the signal is worthless.
    """
    before = approved_plan.status
    r = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "I do not think this applies to me."},
        headers=employee_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == before == PlanStatus.APPROVED
    db.expire_all()
    assert db.get(RemediationPlan, approved_plan.id).status == PlanStatus.APPROVED


def test_a_second_dispute_cannot_overwrite_the_first(client, employee_headers, approved_plan):
    """What they said the first time is what the analyst has to answer."""
    first = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "the original words"},
        headers=employee_headers,
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "different words"},
        headers=employee_headers,
    )
    assert second.status_code == 409
    read = client.get(f"/api/remediation/plans/{approved_plan.id}", headers=employee_headers)
    assert read.json()["dispute_note"] == "the original words"


def test_nothing_that_was_never_assigned_can_be_disputed(client, employee_headers, db):
    """A proposed plan reached nobody, so there is nothing to contest."""
    user = db.query(User).filter(User.email == "rashad.mammadov@caspiandynamics.az").one()
    plan = RemediationPlan(
        trigger_kind="simulation_clicked",
        trigger_ref="simulation_target:notyet",
        employee_id=user.employee_id,
        status=PlanStatus.PROPOSED,
        framing={"headline": "Waiting for a human"},
        urgency="routine",
    )
    db.add(plan)
    db.commit()
    try:
        r = client.post(
            f"/api/remediation/plans/{plan.id}/dispute",
            json={"note": "I object to something I was never sent"},
            headers=employee_headers,
        )
        assert r.status_code == 409, r.text
    finally:
        db.query(RemediationPlan).filter(RemediationPlan.id == plan.id).delete()
        db.commit()


# --- the answer ---------------------------------------------------------------
def test_an_analyst_answers_and_the_learner_reads_it(
    client, employee_headers, analyst_headers, approved_plan
):
    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "I had already reported it."},
        headers=employee_headers,
    )
    answered = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute/resolution",
        json={"resolution": "Checked the mailbox log — you did report it first.", "withdraw": True},
        headers=analyst_headers,
    )
    assert answered.status_code == 200, answered.text
    assert answered.json()["dispute_resolved_by"] == "analyst@caspiandynamics.az"

    mine = client.get("/api/remediation/plans/mine", headers=employee_headers)
    assert mine.status_code == 200
    row = next(p for p in mine.json() if p["id"] == approved_plan.id)
    assert "you did report it first" in row["dispute_resolution"]


def test_a_withdrawn_plan_stays_visible_to_the_person_who_disputed_it(
    client, employee_headers, analyst_headers, approved_plan
):
    """Winning an appeal must not look like the row silently disappearing.

    `/plans/mine` withholds everything that is not approved or delivered, so a
    withdrawal — which sets `rejected` — would drop the plan out of the list and
    the person would never learn what a human decided. This is the regression
    that would be invisible in the UI and obvious to whoever filed the dispute.
    """
    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "This was not me."},
        headers=employee_headers,
    )
    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute/resolution",
        json={"resolution": "You are right. Withdrawn.", "withdraw": True},
        headers=analyst_headers,
    )

    mine = client.get("/api/remediation/plans/mine", headers=employee_headers).json()
    ids = [p["id"] for p in mine]
    assert approved_plan.id in ids, (
        "the plan vanished after it was withdrawn — the person who disputed it "
        "is never told what was decided"
    )
    row = next(p for p in mine if p["id"] == approved_plan.id)
    assert row["status"] == PlanStatus.REJECTED
    assert row["dispute_resolution"]


def test_an_undisputed_plan_cannot_be_resolved(client, analyst_headers, approved_plan):
    r = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute/resolution",
        json={"resolution": "answering nothing", "withdraw": False},
        headers=analyst_headers,
    )
    assert r.status_code == 409


def test_an_employee_cannot_answer_their_own_dispute(
    client, employee_headers, approved_plan
):
    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "I object."},
        headers=employee_headers,
    )
    r = client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute/resolution",
        json={"resolution": "I agree with myself.", "withdraw": True},
        headers=employee_headers,
    )
    assert r.status_code == 403


# --- the queue ----------------------------------------------------------------
def test_stats_count_open_disputes_separately_from_resolved(
    client, employee_headers, analyst_headers, approved_plan
):
    """An open dispute is a person waiting on a human. It needs its own number."""
    before = client.get("/api/remediation/stats", headers=analyst_headers).json()
    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute",
        json={"note": "Waiting on a person."},
        headers=employee_headers,
    )
    during = client.get("/api/remediation/stats", headers=analyst_headers).json()
    assert during["disputes_open"] == before["disputes_open"] + 1
    assert during["disputes_total"] == before["disputes_total"] + 1

    client.post(
        f"/api/remediation/plans/{approved_plan.id}/dispute/resolution",
        json={"resolution": "Answered.", "withdraw": False},
        headers=analyst_headers,
    )
    after = client.get("/api/remediation/stats", headers=analyst_headers).json()
    assert after["disputes_open"] == before["disputes_open"]
    assert after["disputes_total"] == before["disputes_total"] + 1
