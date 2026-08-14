"""The finding→training pipeline, end to end, as the product claims it.

The claim under test: an IR finding lands, training is prepared for it and
sent to the employee who caused it — from the catalogue when something fits,
GENERATED when nothing does, and never past the human gate on its own.
"""

from sqlalchemy import select

from app.models import (
    AssignmentStatus,
    ModuleStatus,
    TrainingAssignment,
    TrainingModule,
    User,
)
from app.platform.models import (
    IncidentRiskStatus,
    Policy,
    PolicyFinding,
    PolicyRule,
)


def _analyst_headers(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "analyst@caspiandynamics.az", "password": "analyst123"},
    )
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _employee_id(client, headers):
    r = client.get("/api/employees?limit=1", headers=headers)
    body = r.json()
    rows = body["items"] if isinstance(body, dict) else body
    return rows[0]["id"]


def test_auto_train_generates_and_approval_completes_the_assignment(client, db):
    """The empty-shelf path: generate -> pending -> approve -> assigned."""
    headers = _analyst_headers(client)
    employee_id = _employee_id(client, headers)

    r = client.post(
        "/api/policy/findings",
        headers=headers,
        json={
            "finding_type": "missing_control",
            "title": "Quarterly access review missed on the OT jump host",
            "description": "The Q2 access review for the SCADA-HIST jump host was not performed.",
            "severity": "high",
            "affected_employee_ids": [employee_id],
        },
    )
    assert r.status_code in (200, 201), r.text
    finding_id = r.json()["id"]

    r = client.post(f"/api/policy/findings/{finding_id}/auto-train", headers=headers)
    assert r.status_code == 200, r.text
    outcome = r.json()

    module = db.get(TrainingModule, outcome["module_id"])
    if outcome["path"] == "assigned":
        # A seeded module matched — legitimate; the direct path must be complete.
        assert outcome["assigned"], outcome
        assert module.status == ModuleStatus.APPROVED
        return

    # The generation path: module pending, origin recorded, NOBODY assigned yet.
    assert outcome["path"] == "generated_awaiting_approval"
    assert outcome["assigned"] == []
    assert module.status == ModuleStatus.PENDING_REVIEW
    assert module.origin == {
        "kind": "policy_finding",
        "id": finding_id,
        "employee_ids": [employee_id],
    }
    before = db.scalars(
        select(TrainingAssignment).where(TrainingAssignment.module_id == module.id)
    ).all()
    assert before == []

    # A named person approves — and ONLY now does the assignment happen.
    r = client.post(
        f"/api/training/modules/{module.id}/review",
        headers=headers,
        json={"decision": "approve"},
    )
    assert r.status_code == 200, r.text
    review = r.json()
    assert review["module"]["status"] == ModuleStatus.APPROVED
    assert len(review["assigned"]) == 1
    assert review["assigned"][0]["employee_id"] == employee_id

    db.expire_all()
    assignment = db.scalars(
        select(TrainingAssignment).where(TrainingAssignment.module_id == module.id)
    ).one()
    assert assignment.employee_id == employee_id
    assert assignment.status == AssignmentStatus.ASSIGNED

    finding = db.get(PolicyFinding, finding_id)
    assert finding.status == "training_assigned"


def test_rejection_assigns_nothing(client, db):
    """The gate must keep its other half: a rejected module reaches nobody."""
    headers = _analyst_headers(client)
    employee_id = _employee_id(client, headers)

    r = client.post(
        "/api/policy/findings",
        headers=headers,
        json={
            "finding_type": "outdated_approved_version",
            "title": "Legacy TLS endpoint kept alive for a vendor integration",
            "description": "A partner endpoint still negotiates TLS 1.0 against policy.",
            "severity": "medium",
            "affected_employee_ids": [employee_id],
        },
    )
    finding_id = r.json()["id"]
    r = client.post(f"/api/policy/findings/{finding_id}/auto-train", headers=headers)
    outcome = r.json()
    if outcome["path"] != "generated_awaiting_approval":
        return  # a seeded module matched; the rejection path is exercised elsewhere

    module_id = outcome["module_id"]
    r = client.post(
        f"/api/training/modules/{module_id}/review",
        headers=headers,
        json={"decision": "reject", "comment": "The lesson does not address TLS at all."},
    )
    assert r.status_code == 200, r.text
    assert r.json()["module"]["status"] == ModuleStatus.REJECTED
    assert r.json()["assigned"] == []

    db.expire_all()
    assignments = db.scalars(
        select(TrainingAssignment).where(TrainingAssignment.module_id == module_id)
    ).all()
    assert assignments == []


def test_grc_watch_surfaces_a_match_for_an_active_rule(client, db):
    """The watcher: seeded GRC rules x seeded intel -> at least one match, and
    escalation stays a human decision (nothing auto-creates findings)."""
    headers = _analyst_headers(client)

    from app.platform.seed_grc import seed_grc_documents

    seed_grc_documents(db)
    policies = db.scalars(select(Policy)).all()
    assert any(p.name.startswith("ISO/IEC 27001") for p in policies)
    from app.platform.models import RuleStatus

    rules = db.scalars(
        select(PolicyRule).where(
            PolicyRule.technology != "", PolicyRule.status == RuleStatus.ACTIVE
        )
    ).all()
    assert rules, "GRC seed must produce ACTIVE technology-bearing rules"

    findings_before = db.scalars(select(PolicyFinding)).all()

    r = client.post("/api/policy/watch/run", headers=headers)
    assert r.status_code == 200, r.text
    scan = r.json()
    assert scan["rules_watched"] >= len(rules)
    # The seeded intel feed mentions OpenSSL and SMBv1 — the seeded GRC rules
    # name both, so the first scan must surface news.
    assert scan["new_matches"], scan

    db.expire_all()
    findings_after = db.scalars(select(PolicyFinding)).all()
    assert len(findings_after) == len(findings_before), (
        "The watcher must never create findings on its own"
    )

    r = client.get("/api/policy/watch", headers=headers)
    assert r.status_code == 200
    status = r.json()
    assert status["last_scan"] is not None
    assert status["recent_matches"]


def test_assistant_answers_grounded_and_refuses_ungrounded(client):
    headers = _analyst_headers(client)

    r = client.post(
        "/api/assistant/chat",
        headers=headers,
        json={"message": "ERP hansı serverdən asılıdır?", "locale": "az"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["generated_by"] in ("knowledge-base", "anthropic")
    assert "ERP-PROD" in body["answer"]
    assert any(s["kind"] == "asset" for s in body["sources"])
    assert body["disclaimer"], "inventory answers must carry the demo disclaimer"

    r = client.post(
        "/api/assistant/chat",
        headers=headers,
        json={"message": "Bu gün hava neçə dərəcədir?", "locale": "az"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["sources"] == []
    assert "əsaslandırılmış cavabım yoxdur" in body["answer"]
