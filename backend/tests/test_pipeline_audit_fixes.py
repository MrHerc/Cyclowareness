"""The three defects the adversarial audit confirmed, pinned so they stay fixed.

Each of the three shipped, was traced end to end by an audit agent, and is
the kind that looks successful in every log — which is exactly why they get
tests rather than a comment.
"""

import re

from sqlalchemy import select

from app.models import ModuleStatus, TrainingAssignment, TrainingModule
from app.platform.models import FindingStatus, PolicyFinding
from app.training.pipeline import topic_for


def _analyst(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "analyst@caspiandynamics.az", "password": "analyst123"},
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _employee_login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": "demo123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# --- 1. origin must never reach an employee --------------------------------

def test_origin_is_stripped_from_the_employee_view(client, db):
    """`origin` names the OTHER people an investigation implicated.

    The incident-risk employee view withholds exactly that; serving it through
    the training route would route around that redaction.
    """
    headers = _analyst(client)
    employees = client.get("/api/employees?limit=3", headers=headers).json()
    rows = employees["items"] if isinstance(employees, dict) else employees
    subject = next(e for e in rows if e["email"] == "leyla.aliyeva@caspiandynamics.az")
    co_accused = [e["id"] for e in rows if e["id"] != subject["id"]][:2]

    module = TrainingModule(
        title="Origin leak probe",
        description="phishing",
        content=[{"heading": "h", "body": "b"}],
        quiz=[
            {"question": f"q{i}", "options": ["a", "b", "c", "d"], "correct_index": 0}
            for i in range(3)
        ],
        takeaway="t",
        status=ModuleStatus.APPROVED,
        origin={
            "kind": "incident_risk",
            "id": 999,
            "employee_ids": [subject["id"], *co_accused],
        },
    )
    db.add(module)
    db.flush()
    db.add(TrainingAssignment(module_id=module.id, employee_id=subject["id"]))
    db.commit()

    mine = client.get("/api/training/my", headers=_employee_login(client, subject["email"]))
    assert mine.status_code == 200, mine.text
    probe = next(a for a in mine.json() if a["module"]["title"] == "Origin leak probe")
    assert probe["module"]["origin"] is None, "origin leaked to the employee"
    body = mine.text
    for other in co_accused:
        assert f'"employee_ids"' not in body
        assert f"incident_risk" not in body or str(other) not in body.split("incident_risk")[-1][:80]

    # The analyst still gets it — this is redaction, not deletion.
    analyst_view = client.get(f"/api/training/modules/{module.id}", headers=headers)
    assert analyst_view.json()["origin"]["id"] == 999


# --- 2. the curated table decides; keywords never match mid-word -----------

def test_topic_derivation_reads_the_prose_and_falls_back_to_the_type():
    # The PROSE decides when it says something. Every one of the eight finding
    # types is mapped, so a table consulted first would answer every question
    # and the title would never be read: an MFA-fatigue finding filed as
    # `missing_control` would train data handling.
    assert (
        topic_for("policy_finding", "missing_control", "MFA push prompts approved repeatedly")
        == "mfa_fatigue"
    )
    assert (
        topic_for("policy_finding", "exposure_match", "Password reuse is widespread")
        == "credential_theft"
    )

    # Silent prose falls to the type — the one classification a human made —
    # and only then to the commonest attack.
    assert topic_for("incident_risk", "alert_fatigue", "anything at all") == "mfa_fatigue"
    assert (
        topic_for("policy_finding", "missing_control", "Quarterly review not performed")
        == "data_handling"
    )
    assert topic_for("policy_finding", "", "nothing recognisable here") == "phishing"

    # The three substring collisions the audit reproduced.
    assert (
        topic_for("policy_finding", "", "Password reuse is critically widespread")
        == "credential_theft"
    ), "'call' matched inside 'critically'"
    assert topic_for("policy_finding", "", "Invoice handling gap") == "phishing", (
        "'voice' matched inside 'invoice'"
    )
    assert topic_for("policy_finding", "", "Istifadeci qrupu ucun boslug") == "phishing", (
        "'qr' matched inside the Azerbaijani 'qrup'"
    )

    # …without breaking the matches that must still work.
    assert topic_for("policy_finding", "", "QR code lure") == "qr"
    assert topic_for("policy_finding", "", "Phishing click rate") == "phishing"
    assert topic_for("policy_finding", "", "Voice call from the helpdesk") == "vishing"
    assert topic_for("policy_finding", "", "Invoice fraud attempt") == "bec"


def test_no_source_file_carries_a_control_character():
    """A regex written through a heredoc arrives with `\\b` as a literal 0x08.

    It is invisible in an editor and in a diff, and a regex that can never
    match makes a matcher fall through to its default while looking fine.
    """
    import pathlib

    root = pathlib.Path(__file__).resolve().parent.parent / "app"
    control = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
    dirty = [
        p.relative_to(root).as_posix()
        for p in root.rglob("*.py")
        if "__pycache__" not in p.as_posix()
        and control.search(p.read_text(encoding="utf-8", errors="replace"))
    ]
    assert dirty == [], f"control characters in: {dirty}"


# --- 3. approval must re-ask what auto-train refused -----------------------

def test_approval_refuses_to_assign_for_a_finding_ruled_false_positive(client, db):
    """Auto-train 409s on a terminal finding. Approval happens later, so the
    same question has to be asked again — otherwise a finding closed on
    Tuesday still puts obligations on people on Wednesday."""
    headers = _analyst(client)
    employees = client.get("/api/employees?limit=1", headers=headers).json()
    rows = employees["items"] if isinstance(employees, dict) else employees
    employee_id = rows[0]["id"]

    created = client.post(
        "/api/policy/findings",
        headers=headers,
        json={
            "finding_type": "missing_control",
            "title": "Shared mailbox left without an owner after a transfer",
            "description": "A departing owner's mailbox kept its delegates.",
            "severity": "medium",
            "affected_employee_ids": [employee_id],
        },
    )
    finding_id = created.json()["id"]

    outcome = client.post(
        f"/api/policy/findings/{finding_id}/auto-train", headers=headers
    ).json()
    if outcome["path"] != "generated_awaiting_approval":
        return  # a module matched and assigned immediately; nothing deferred to test

    module_id = outcome["module_id"]

    # The finding is ruled a false positive while the module sits in review.
    finding = db.get(PolicyFinding, finding_id)
    finding.status = FindingStatus.FALSE_POSITIVE
    db.commit()

    review = client.post(
        f"/api/training/modules/{module_id}/review",
        headers=headers,
        json={"decision": "approve"},
    )
    assert review.status_code == 200, review.text
    body = review.json()
    assert body["module"]["status"] == ModuleStatus.APPROVED
    assert body["assigned"] == [], "assigned training for a false-positive finding"
    assert "false_positive" in body["origin_note"]

    db.expire_all()
    assert (
        db.scalars(
            select(TrainingAssignment).where(TrainingAssignment.module_id == module_id)
        ).all()
        == []
    )
