"""Policy intelligence API — the claims it must never make by accident.

These tests are about honesty rather than plumbing. Each one pins a place where
the easy implementation would assert something the platform does not know: that
a document contains no rules when nothing read it, that a human's judgement
carries a machine's confidence, that a partial assignment was a complete one.

The tests build their own policies and rules rather than mutating the seeded
ones. The demo world is shared across the whole session, and a test that
activates a seeded proposed rule quietly changes what every later test sees.
"""
import uuid

from app.platform.models import Policy, PolicyRule, RuleStatus


def _new_policy(client, headers, **overrides) -> dict:
    body = {
        "name": f"Test Policy {uuid.uuid4().hex[:8]}",
        "policy_type": "control_document",
        "version": "1.0",
        "status": "draft",
    }
    body.update(overrides)
    r = client.post("/api/policy/policies", headers=headers, data=body)
    assert r.status_code == 201, r.text
    return r.json()


def _proposed_rule(db, policy_id: int) -> int:
    """A machine-proposed rule, inserted directly: the API cannot create one.

    That is the point of the module — nothing an analyst can call produces a
    rule at ``proposed``, because only extraction may propose.
    """
    rule = PolicyRule(
        policy_id=policy_id,
        rule_key=f"test.{uuid.uuid4().hex[:8]}",
        statement="Disk encryption is required on all laptops.",
        rule_type="require",
        evidence_quote="§4.2 — Full-disk encryption shall be enabled.",
        evidence_location="§4.2",
        confidence=0.81,
        status=RuleStatus.PROPOSED,
    )
    db.add(rule)
    db.commit()
    return rule.id


# --- provenance is never inferred ---------------------------------------------


def test_extraction_without_a_provider_refuses_instead_of_inventing_rules(
    client, analyst_headers
):
    """The offline generator must never fill a review queue with plausible rules."""
    policy = _new_policy(client, analyst_headers)
    r = client.post(f"/api/policy/policies/{policy['id']}/extract", headers=analyst_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["attempted"] is False
    assert body["rules_proposed"] == 0
    assert body["reason"]
    # Nothing wrote itself an authorship claim on the way past.
    assert body["extraction_source"] == ""
    assert client.get(
        f"/api/policy/policies/{policy['id']}/rules", headers=analyst_headers
    ).json() == []


def test_a_refusal_does_not_erase_an_earlier_successful_extraction(
    client, analyst_headers, db
):
    """Seeded policy 1 was read by Claude. Refusing to re-read it must not
    rewrite that into a failure — the rules under it came from somewhere."""
    policy = db.query(Policy).filter(Policy.extraction_status == "extracted").first()
    assert policy is not None
    before_source = policy.extraction_source

    r = client.post(f"/api/policy/policies/{policy.id}/extract", headers=analyst_headers)
    assert r.status_code == 200 and r.json()["attempted"] is False

    after = client.get(f"/api/policy/policies/{policy.id}", headers=analyst_headers).json()
    assert after["extraction_status"] == "extracted"
    assert after["extraction_source"] == before_source


def test_a_typed_rule_carries_no_extraction_confidence(client, analyst_headers):
    policy = _new_policy(client, analyst_headers)
    r = client.post(
        f"/api/policy/policies/{policy['id']}/rules",
        headers=analyst_headers,
        json={"rule_key": "test.mfa", "statement": "MFA is required.", "rule_type": "require"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["confidence"] is None
    assert r.json()["reviewed_by"] == "analyst@caspiandynamics.az"

    # A human typing rules is not the platform having read the document.
    detail = client.get(f"/api/policy/policies/{policy['id']}", headers=analyst_headers).json()
    assert detail["extraction_status"] == "not_attempted"
    assert detail["extraction_source"] == "manual"


def test_a_manually_raised_finding_is_not_dressed_up_as_intel(client, analyst_headers):
    r = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={"finding_type": "missing_control", "title": "No backup restore test on record"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["source"] == "analyst"
    assert r.json()["confidence"] is None


# --- only a human may activate --------------------------------------------------


def test_activating_a_rule_snapshots_the_policy(client, analyst_headers, db):
    policy = _new_policy(client, analyst_headers)
    rule_id = _proposed_rule(db, policy["id"])

    assert client.get(
        f"/api/policy/policies/{policy['id']}/versions", headers=analyst_headers
    ).json() == []

    r = client.post(
        f"/api/policy/rules/{rule_id}/review",
        headers=analyst_headers,
        json={"decision": "activate", "note": "read §4.2"},
    )
    assert r.status_code == 200 and r.json()["status"] == "active"

    versions = client.get(
        f"/api/policy/policies/{policy['id']}/versions", headers=analyst_headers
    ).json()
    assert len(versions) == 1
    # The snapshot has to be readable without the rules table still existing.
    assert versions[0]["snapshot"][0]["statement"]


def test_a_rule_cannot_be_reviewed_twice(client, analyst_headers, db):
    policy = _new_policy(client, analyst_headers)
    rule_id = _proposed_rule(db, policy["id"])
    client.post(
        f"/api/policy/rules/{rule_id}/review",
        headers=analyst_headers,
        json={"decision": "activate"},
    )
    r = client.post(
        f"/api/policy/rules/{rule_id}/review",
        headers=analyst_headers,
        json={"decision": "reject", "note": "changed my mind"},
    )
    assert r.status_code == 409
    assert "active" in r.json()["detail"]


def test_discarding_a_rule_requires_a_stated_reason(client, analyst_headers, db):
    policy = _new_policy(client, analyst_headers)
    rule_id = _proposed_rule(db, policy["id"])
    r = client.post(
        f"/api/policy/rules/{rule_id}/review", headers=analyst_headers, json={"decision": "reject"}
    )
    assert r.status_code == 422


# --- closing a finding is a claim, not a delete ---------------------------------


def test_closing_a_finding_requires_a_reason_and_records_who(client, analyst_headers):
    finding = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={"finding_type": "policy_conflict", "title": "Two clauses disagree on retention"},
    ).json()

    r = client.patch(
        f"/api/policy/findings/{finding['id']}", headers=analyst_headers, json={"status": "resolved"}
    )
    assert r.status_code == 422

    r = client.patch(
        f"/api/policy/findings/{finding['id']}",
        headers=analyst_headers,
        json={"status": "resolved", "resolution_note": "Clause 9 withdrawn in v2.1."},
    )
    assert r.status_code == 200
    assert r.json()["resolved_by"] == "analyst@caspiandynamics.az"
    assert r.json()["resolved_at"] is not None


def test_an_illegal_finding_move_names_the_current_state(client, analyst_headers):
    finding = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={"finding_type": "policy_conflict", "title": "Retention clause conflict, second copy"},
    ).json()
    client.patch(
        f"/api/policy/findings/{finding['id']}",
        headers=analyst_headers,
        json={"status": "false_positive", "resolution_note": "Duplicate of the first."},
    )
    r = client.patch(
        f"/api/policy/findings/{finding['id']}",
        headers=analyst_headers,
        json={"status": "resolved", "resolution_note": "x"},
    )
    assert r.status_code == 409
    assert "false_positive" in r.json()["detail"]


# --- training assignment tells the truth about what it did -----------------------


def test_unapproved_training_cannot_be_pushed_to_employees(client, analyst_headers):
    modules = client.get("/api/training/modules", headers=analyst_headers).json()
    pending = [m for m in modules if m["status"] == "pending_review"]
    assert pending, "the demo world should hold a module still awaiting review"

    finding = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={
            "finding_type": "missing_control",
            "title": "Nobody has been trained on the new payment flow",
            "affected_employee_ids": [1],
        },
    ).json()
    r = client.post(
        f"/api/policy/findings/{finding['id']}/assign-training",
        headers=analyst_headers,
        json={"module_id": pending[0]["id"]},
    )
    assert r.status_code == 409
    assert "approved" in r.json()["detail"]


def test_assignment_reports_who_it_skipped_and_how_durable_the_link_is(
    client, analyst_headers
):
    modules = client.get("/api/training/modules", headers=analyst_headers).json()
    approved = next(m for m in modules if m["status"] == "approved")

    finding = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={
            "finding_type": "missing_control",
            "title": "Payment flow training gap, named staff",
            # 99999 does not exist: a silently shortened list would understate
            # the blast radius of the finding.
            "affected_employee_ids": [3, 99999],
        },
    ).json()
    r = client.post(
        f"/api/policy/findings/{finding['id']}/assign-training",
        headers=analyst_headers,
        json={"module_id": approved["id"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert [a["employee_id"] for a in body["assigned"]] == [3]
    assert [s["employee_id"] for s in body["skipped"]] == [99999]
    assert body["finding_status"] == "training_assigned"
    # The response never implies a closed loop the schema cannot support.
    assert "no foreign key" in body["linkage_note"]

    # The assignment is a real one the training API already serves.
    assignment_id = body["assigned"][0]["assignment_id"]
    served = client.get(f"/api/training/assignments/{assignment_id}", headers=analyst_headers)
    assert served.status_code == 200
    assert f"Policy finding #{finding['id']}" in served.json()["targeting_reasons"][0]


# --- lists and counts say what they cover ------------------------------------------


def test_a_capped_list_reports_the_full_total(client, analyst_headers):
    r = client.get("/api/policy/findings?limit=1", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 1
    assert body["total"] > 1


def test_stats_state_their_window_and_sample(client, analyst_headers):
    r = client.get("/api/policy/stats?days=7", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["window_days"] == 7
    assert body["sample_size"] + body["outside_window"] == body["total_all_time"]
    # Zero-filled, so an absent bar means zero findings and never a gap in the data.
    assert set(body["by_severity"]) == {"critical", "high", "medium", "low", "info"}
    assert body["note"]


# --- access ---------------------------------------------------------------------


def test_employees_cannot_read_the_governance_layer(client, employee_headers):
    for path in ("/api/policy/policies", "/api/policy/findings", "/api/policy/stats"):
        assert client.get(path, headers=employee_headers).status_code == 403
