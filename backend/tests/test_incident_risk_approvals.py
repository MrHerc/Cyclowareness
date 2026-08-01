"""The claims the incident-risk, audit and approval routers make about themselves.

Not coverage for its own sake — each test pins one promise that would be
expensive to discover was broken:

* the employee view withholds a restricted investigation, and says that it did;
* an incident requirement nothing can carry comes back stated, not missing;
* the approval gate needs two *different* people when somebody asks for two;
* ``request_revision`` returns generated content to the queue without moving
  the loop one step;
* a safety check that could not run never renders as a check that passed.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.models import (
    ArtifactType,
    LoopRun,
    LoopStatus,
    ModuleStatus,
    Role,
    Threat,
    ThreatSource,
    TrainingModule,
    User,
)
from app.platform.models import Confidentiality, IncidentRisk, IncidentRiskSubject
from app.security import hash_password

QUIZ = [
    {
        "question": "A mail claims your mailbox is full and offers a sign-in link. First move?",
        "options": ["Sign in fast", "Open the portal from a bookmark", "Forward it", "Reply"],
        "correct_index": 1,
        "explanation": "Direct navigation bypasses the link entirely.",
    },
    {
        "question": "What does a mismatched destination domain tell you?",
        "options": ["Nothing", "It is a test domain", "Brand mismatch — phishing", "https makes it safe"],
        "correct_index": 2,
        "explanation": "Brand/destination mismatch is the strongest single tell.",
    },
    {
        "question": "Why do lures carry countdowns?",
        "options": ["Servers expire", "Panic skips verification", "Regulation", "Tidiness"],
        "correct_index": 1,
        "explanation": "Urgency is a manipulation primitive.",
    },
]


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _employee_login(client, db, employee_id, email):
    """Mint a login for an employee the seed did not give one to.

    None of the three seeded employee accounts is a subject of any seeded
    incident risk, so the redaction tests have to make their own.
    """
    if db.query(User).filter(User.email == email).first() is None:
        db.add(
            User(
                email=email,
                hashed_password=hash_password("demo123"),
                role=Role.EMPLOYEE,
                employee_id=employee_id,
            )
        )
        db.commit()
    return _login(client, email, "demo123")


@pytest.fixture
def pending_run(db):
    """A fresh run parked at the approval gate, so the seeded one stays parked.

    The module is backdated deliberately: ``/api/training/modules`` is newest
    first, and other tests take the first approved module off that list.
    """
    old = datetime.now(timezone.utc) - timedelta(days=30)
    threat = Threat(
        source=ThreatSource.MANUAL,
        artifact_type=ArtifactType.EMAIL,
        artifact_ref=(
            "From: alerts@storage-quota-notice.test\n"
            "Subject: Mailbox at 99%\n\n"
            "Expand your quota here: https://storage-quota-notice.test/expand?u=cd"
        ),
        artifact_meta={"sender": "alerts@storage-quota-notice.test"},
        title="Approval-gate fixture: quota lure",
        verdict="malicious",
        confidence=0.91,
        threat_type="phishing",
        iocs={"urls": ["https://storage-quota-notice.test/expand?u=cd"], "domains": []},
        behavior_summary="Credential harvest behind a quota warning.",
        analysis_result={"engine": "test"},
        created_at=old,
    )
    db.add(threat)
    db.flush()
    module = TrainingModule(
        threat_id=threat.id,
        title="Approval-gate fixture module",
        description="Fixture content.",
        content=[{"heading": "What happened", "body": "A quota lure reached the company."}],
        quiz=QUIZ,
        takeaway="Bookmarks beat links.",
        ai_generated=True,
        generation_source="mock",
        status=ModuleStatus.PENDING_REVIEW,
        created_at=old,
    )
    db.add(module)
    db.flush()
    run = LoopRun(
        trigger_threat_id=threat.id,
        current_stage=3,
        status=LoopStatus.AWAITING_APPROVAL,
        training_module_id=module.id,
        stage_history=[
            {"stage": 1, "name": "ingest", "status": "completed", "started_at": None,
             "completed_at": None, "detail": "fixture", "error": None},
            {"stage": 2, "name": "analyze", "status": "completed", "started_at": None,
             "completed_at": None, "detail": "fixture", "error": None},
            {"stage": 3, "name": "convert", "status": "completed", "started_at": None,
             "completed_at": None, "detail": "fixture", "error": None},
        ],
        created_at=old,
    )
    db.add(run)
    db.commit()
    return run.id


@pytest.fixture
def second_analyst_headers(client, db):
    email = "second.analyst@caspiandynamics.az"
    if db.query(User).filter(User.email == email).first() is None:
        db.add(User(email=email, hashed_password=hash_password("analyst123"), role=Role.ANALYST))
        db.commit()
    return _login(client, email, "analyst123")


# --- The employee view -------------------------------------------------------


def test_a_restricted_investigation_is_withheld_from_its_own_subject(client, db, analyst_headers):
    risk = db.query(IncidentRisk).filter(
        IncidentRisk.confidentiality == Confidentiality.RESTRICTED
    ).first()
    assert risk is not None, "the seed no longer contains a restricted incident risk"
    subject = db.query(IncidentRiskSubject).filter(
        IncidentRiskSubject.incident_risk_id == risk.id
    ).first()
    headers = _employee_login(client, db, subject.employee_id, "redaction.subject@caspiandynamics.az")

    rows = client.get("/api/incident-risks/my", headers=headers).json()
    mine = next(r for r in rows if r["id"] == risk.id)

    assert mine["redacted"] is True
    assert mine["description"] is None
    assert mine["evidence"] is None
    # The distinction the whole view exists for: a blank field with no
    # explanation would read as "there is nothing here", which is false.
    assert mine["redaction_note"]
    assert risk.confidentiality in mine["redaction_note"]
    assert risk.approver_name in mine["redaction_note"]
    # What they are entitled to is still there.
    assert mine["required_action"] == risk.required_action
    assert mine["title"] == risk.title


def test_an_internal_investigation_is_not_withheld(client, db):
    risk = db.query(IncidentRisk).filter(
        IncidentRisk.confidentiality == Confidentiality.INTERNAL
    ).first()
    subject = db.query(IncidentRiskSubject).filter(
        IncidentRiskSubject.incident_risk_id == risk.id
    ).first()
    headers = _employee_login(client, db, subject.employee_id, "open.subject@caspiandynamics.az")

    mine = next(
        r for r in client.get("/api/incident-risks/my", headers=headers).json() if r["id"] == risk.id
    )
    assert mine["redacted"] is False
    assert mine["description"] == risk.description
    assert mine["redaction_note"] == ""


def test_my_returns_only_the_callers_own_rows(client, employee_headers):
    # Rashad Mammadov is a subject of no incident risk, so this is honestly
    # empty rather than filtered-down-to-empty. (Leyla Aliyeva is one, and
    # test_platform_api asserts she gets her row — so this is a real filter,
    # not an endpoint that returns nothing to everybody.)
    assert client.get("/api/incident-risks/my", headers=employee_headers).json() == []


def test_the_full_record_is_analyst_only(client, employee_headers):
    assert client.get("/api/incident-risks", headers=employee_headers).status_code == 403


# --- Assignment honesty --------------------------------------------------------


def _new_risk(client, analyst_headers, **overrides):
    payload = {
        "title": "Fixture risk",
        "incident_ref": "IR-TEST",
        "requires_training": True,
        "requires_quiz": True,
        "requires_sandbox": True,
        "min_score": 80,
        "approver_name": "Murad Nasirov",
    }
    payload.update(overrides)
    r = client.post("/api/incident-risks", headers=analyst_headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_assign_states_the_requirements_it_cannot_carry(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers)
    employee_id = client.get("/api/employees", headers=analyst_headers).json()[0]["id"]
    client.post(f"/api/incident-risks/{risk_id}/subjects", headers=analyst_headers,
                json={"employee_ids": [employee_id]})
    module = next(
        m for m in client.get("/api/training/modules", headers=analyst_headers).json()
        if m["status"] == "approved"
    )
    body = client.post(f"/api/incident-risks/{risk_id}/assign", headers=analyst_headers,
                       json={"module_id": module["id"]}).json()

    outcomes = {r["requirement"]: r for r in body["requirements"]}
    # Every declared requirement is answered for, including the two nothing here
    # can carry. A silently absent row would be indistinguishable from a
    # requirement nobody asked for.
    assert set(outcomes) == {"training", "quiz", "sandbox", "min_score"}
    assert outcomes["training"]["fulfilled"] is True
    assert outcomes["sandbox"]["fulfilled"] is False
    assert outcomes["sandbox"]["mechanism"] == ""
    assert "Sandbox" in outcomes["sandbox"]["detail"]
    assert outcomes["min_score"]["fulfilled"] is False
    assert outcomes["min_score"]["mechanism"] == "reviewer decision"
    assert "80" in outcomes["min_score"]["detail"]
    assert body["assigned"] and body["assigned"][0]["assignment_id"]


def test_assign_refuses_a_module_no_human_approved(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers)
    employee_id = client.get("/api/employees", headers=analyst_headers).json()[0]["id"]
    client.post(f"/api/incident-risks/{risk_id}/subjects", headers=analyst_headers,
                json={"employee_ids": [employee_id]})
    pending = next(
        m for m in client.get("/api/training/modules", headers=analyst_headers).json()
        if m["status"] == "pending_review"
    )
    r = client.post(f"/api/incident-risks/{risk_id}/assign", headers=analyst_headers,
                    json={"module_id": pending["id"]})
    assert r.status_code == 409
    assert "pending_review" in r.json()["detail"]


def test_reassigning_does_not_reset_an_existing_assignment(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers)
    employee_id = client.get("/api/employees", headers=analyst_headers).json()[0]["id"]
    client.post(f"/api/incident-risks/{risk_id}/subjects", headers=analyst_headers,
                json={"employee_ids": [employee_id]})
    module = next(
        m for m in client.get("/api/training/modules", headers=analyst_headers).json()
        if m["status"] == "approved"
    )
    first = client.post(f"/api/incident-risks/{risk_id}/assign", headers=analyst_headers,
                        json={"module_id": module["id"]}).json()
    again = client.post(f"/api/incident-risks/{risk_id}/assign", headers=analyst_headers,
                        json={"module_id": module["id"]}).json()

    assert again["assigned"] == []
    assert len(again["skipped"]) == 1
    # The skip is stated with the id it kept, not reported as a count.
    assert str(first["assigned"][0]["assignment_id"]) in again["skipped"][0]["reason"]


# --- Closing costs a sentence ---------------------------------------------------


def test_closing_and_reopening_both_demand_a_reason(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers, requires_sandbox=False, min_score=None)
    client.patch(f"/api/incident-risks/{risk_id}", headers=analyst_headers, json={"status": "open"})

    assert client.post(f"/api/incident-risks/{risk_id}/close", headers=analyst_headers,
                       json={"closure_note": "   "}).status_code == 422
    closed = client.post(f"/api/incident-risks/{risk_id}/close", headers=analyst_headers,
                         json={"closure_note": "Control re-applied and verified."})
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"

    assert client.post(f"/api/incident-risks/{risk_id}/reopen", headers=analyst_headers,
                       json={"reason": ""}).status_code == 422
    reopened = client.post(f"/api/incident-risks/{risk_id}/reopen", headers=analyst_headers,
                           json={"reason": "The control regressed in the next change window."}).json()
    assert reopened["status"] == "reopened"
    assert reopened["reopened_count"] == 1
    # A reopened risk must not still render as closed.
    assert reopened["closed_at"] is None
    assert reopened["closure_note"] is None


def test_patch_cannot_close_a_risk_without_a_reason(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers)
    r = client.patch(f"/api/incident-risks/{risk_id}", headers=analyst_headers,
                     json={"status": "closed"})
    assert r.status_code == 409
    assert "/close" in r.json()["detail"]


def test_an_illegal_transition_names_the_current_state(client, analyst_headers):
    risk_id = _new_risk(client, analyst_headers)
    r = client.patch(f"/api/incident-risks/{risk_id}", headers=analyst_headers,
                     json={"status": "awaiting_review"})
    assert r.status_code == 409
    assert "draft" in r.json()["detail"]


# --- Audit ---------------------------------------------------------------------


def test_an_audit_page_says_what_it_left_behind(client, analyst_headers):
    page = client.get("/api/audit?limit=2", headers=analyst_headers).json()
    assert len(page["events"]) == 2
    assert page["total"] > 2
    assert page["truncated"] is True
    full = client.get("/api/audit?limit=500", headers=analyst_headers).json()
    assert full["truncated"] is False


def test_audit_filters_by_dotted_prefix(client, analyst_headers):
    prefixed = client.get("/api/audit?action=incident_risk", headers=analyst_headers).json()
    exact = client.get("/api/audit?action=incident_risk.create", headers=analyst_headers).json()
    assert prefixed["total"] > exact["total"] > 0
    assert {e["action"] for e in exact["events"]} == {"incident_risk.create"}


def test_the_audit_log_is_read_only_and_analyst_only(client, analyst_headers, employee_headers):
    assert client.get("/api/audit", headers=employee_headers).status_code == 403
    # There is no write route, and there must not be one.
    assert client.post("/api/audit", headers=analyst_headers, json={}).status_code == 405


def test_audit_actions_are_derived_from_the_data(client, analyst_headers):
    actions = client.get("/api/audit/actions", headers=analyst_headers).json()
    verbs = {a["action"]: a["count"] for a in actions}
    assert verbs["incident_risk.create"] >= 1
    assert all(a["count"] > 0 for a in actions)


# --- The approval gate ----------------------------------------------------------


def test_the_queue_names_the_engine_that_wrote_the_module(client, analyst_headers, pending_run):
    queue = client.get("/api/approvals?limit=100", headers=analyst_headers).json()
    item = next(i for i in queue["items"] if i["run_id"] == pending_run)
    assert item["generation_source"] == "mock"
    assert "offline generator" in item["generation_label"]
    # Severity is derived, and the row carries the derivation in words.
    assert item["severity"] == "critical"
    assert "malicious" in item["severity_basis"]
    assert item["proposed_target_count"] is not None


def test_the_safety_panel_reports_a_check_it_could_not_run(client, analyst_headers, pending_run):
    safety = client.get(f"/api/approvals/{pending_run}", headers=analyst_headers).json()["safety"]
    by_name = {c["check"]: c for c in safety["checks"]}

    skipped = by_name["content_markup_sanitisation"]
    assert skipped["checked"] is False
    # The point of the whole shape: not-run must never be reported as a pass.
    assert skipped["passed"] is None
    assert safety["checks_not_run"] == 1
    assert "not a clean bill of health" in safety["summary"]
    assert by_name["quiz_shape"]["passed"] is True
    assert by_name["module_provenance"]["passed"] is True


def test_the_reviewer_sees_the_answer_key(client, analyst_headers, pending_run):
    detail = client.get(f"/api/approvals/{pending_run}", headers=analyst_headers).json()
    # Unlike the employee's assignment view, which strips it.
    assert all("correct_index" in q for q in detail["module"]["quiz"])
    assert detail["proposed_targets"]
    assert detail["targeting_note"]


def test_request_revision_does_not_move_the_loop(client, analyst_headers, pending_run):
    before = client.get(f"/api/loop-runs/{pending_run}", headers=analyst_headers).json()
    r = client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers, json={
        "decision": "request_revision",
        "comment": "Question 2 has two defensible answers.",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["loop_advanced"] is False
    assert body["run_status"] == "awaiting_approval"
    assert body["module_status"] == "pending_review"

    after = client.get(f"/api/loop-runs/{pending_run}", headers=analyst_headers).json()
    # stage_history is a record of loop stages; a revision request is not one,
    # and anything that walks the list would read an extra entry as a stage.
    assert after["stage_history"] == before["stage_history"]

    history = client.get(f"/api/approvals/{pending_run}/history", headers=analyst_headers).json()
    assert history[-1]["action"] == "approval.request_revision"
    assert "two defensible answers" in history[-1]["comment"]


def test_reject_and_request_revision_need_a_comment(client, analyst_headers, pending_run):
    for decision in ("reject", "request_revision"):
        r = client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers,
                        json={"decision": decision})
        assert r.status_code == 422, decision


def test_a_second_approval_must_come_from_a_different_person(
    client, analyst_headers, second_analyst_headers, pending_run
):
    held = client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers, json={
        "decision": "approve",
        "comment": "Content is fine; wants a second pair of eyes on targeting.",
        "require_second_approval": True,
    }).json()
    assert held["loop_advanced"] is False
    assert held["audited_action"] == "approval.endorse"
    assert held["run_status"] == "awaiting_approval"
    assert held["second_approval"]["held"] is True

    # The same person cannot satisfy their own request, in either direction.
    again = client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers,
                        json={"decision": "approve", "require_second_approval": True})
    assert again.status_code == 409
    self_release = client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers,
                               json={"decision": "approve"})
    assert self_release.status_code == 409
    assert "different person" in self_release.json()["detail"]

    released = client.post(f"/api/approvals/{pending_run}/decision", headers=second_analyst_headers,
                           json={"decision": "approve", "comment": "Targeting reviewed."}).json()
    assert released["loop_advanced"] is True
    assert released["module_status"] == "approved"
    assert "Co-signed" in released["detail"]

    history = client.get(f"/api/approvals/{pending_run}/history", headers=analyst_headers).json()
    actions = [h["action"] for h in history]
    assert actions[-2:] == ["approval.endorse", "approval.approve"]
    # Oldest first: an approval thread only reads correctly in order.
    assert history == sorted(history, key=lambda h: h["at"])


def test_a_decision_on_a_run_past_the_gate_names_the_state(
    client, analyst_headers, second_analyst_headers, pending_run
):
    client.post(f"/api/approvals/{pending_run}/decision", headers=analyst_headers,
                json={"decision": "approve"})
    r = client.post(f"/api/approvals/{pending_run}/decision", headers=second_analyst_headers,
                    json={"decision": "approve"})
    assert r.status_code == 409
    assert "awaiting approval" in r.json()["detail"]
    # The workspace stays readable, and says the gate has been passed.
    detail = client.get(f"/api/approvals/{pending_run}", headers=analyst_headers).json()
    assert detail["awaiting_approval"] is False


def test_only_an_analyst_may_decide(client, employee_headers, exec_headers, pending_run):
    for headers in (employee_headers, exec_headers):
        r = client.post(f"/api/approvals/{pending_run}/decision", headers=headers,
                        json={"decision": "approve"})
        assert r.status_code == 403
    # An executive may still watch the gate.
    assert client.get("/api/approvals", headers=exec_headers).status_code == 200


@pytest.fixture
def exec_headers(client):
    return _login(client, "exec@caspiandynamics.az", "exec123")
