"""Regression tests for the audit's security findings.

Each test here corresponds to a confirmed way the product could be abused or
could mislead, so they are worth keeping even though the underlying code looks
obviously correct now.
"""
from sqlalchemy import select

from app.core.risk_engine import TARGETING_META_KEYS
from app.models import PhishingReport, ReportStatus, Threat


def test_form_login_is_throttled_like_json_login(client):
    """The OAuth2 form route is hidden from the schema but fully routable.

    It performs the same credential check and issues the same token, so if it
    skips the throttle it is a free bypass of the rate limit.
    """
    got_429 = False
    for _ in range(14):
        r = client.post(
            "/api/auth/login/form",
            data={"username": "form-bypass@test.local", "password": "wrong"},
        )
        if r.status_code == 429:
            got_429 = True
            break
    assert got_429, "/api/auth/login/form must share the brute-force throttle"


def test_failed_login_tracker_does_not_grow_on_success(client):
    """A successful login must not leave an entry behind in the tracker."""
    from app.routers import auth

    auth._FAILED.clear()
    r = client.post(
        "/api/auth/login",
        json={"email": "analyst@caspiandynamics.az", "password": "analyst123"},
    )
    assert r.status_code == 200
    assert len(auth._FAILED) == 0, "successful logins must not accumulate keys"


def test_employee_cannot_steer_targeting_via_report_metadata(client, employee_headers, analyst_headers, db):
    """An employee must not be able to name colleagues as 'directly targeted'.

    risk_engine.select_targets honours these keys, and every selected employee
    takes a +8 exposure hit plus a forced assignment — so passing employee-
    supplied metadata through unchecked would let one person inflate another's
    risk score with an audit trail that reads as genuine threat exposure.
    """
    victim_ids = [e.id for e in db.execute(select(__import__("app.models", fromlist=["Employee"]).Employee)).scalars().all()[:3]]

    r = client.post(
        "/api/reports",
        headers=employee_headers,
        json={
            "artifact_type": "email",
            "artifact_ref": "Please verify your password at https://evil.test/login urgently",
            "note": "",
            "artifact_meta": {
                "subject": "Verify now",
                "targeted_employee_ids": victim_ids,
                "recipients": ["leyla.aliyeva@caspiandynamics.az"],
                "targeted_departments": ["Finance"],
            },
        },
    )
    assert r.status_code == 200
    report_id = r.json()["id"]

    pushed = client.post(f"/api/reports/{report_id}/push-to-loop", headers=analyst_headers)
    assert pushed.status_code == 200
    threat_id = pushed.json()["threat_id"]

    db.expire_all()
    threat = db.get(Threat, threat_id)
    meta = threat.artifact_meta or {}
    for key in TARGETING_META_KEYS:
        assert key not in meta, f"{key} must be stripped from employee-supplied metadata"
    # Descriptive fields survive — we strip targeting, not context.
    assert meta.get("subject") == "Verify now"


def test_report_metadata_is_stored_verbatim_but_not_trusted(client, employee_headers, db):
    """We keep what the employee sent for the analyst to see; we just don't act on it."""
    r = client.post(
        "/api/reports",
        headers=employee_headers,
        json={
            "artifact_type": "email",
            "artifact_ref": "suspicious message",
            "note": "",
            "artifact_meta": {"targeted_departments": ["Finance"]},
        },
    )
    assert r.status_code == 200
    db.expire_all()
    report = db.get(PhishingReport, r.json()["id"])
    assert report.status == ReportStatus.NEW
    # The raw report retains what was submitted; only the Threat is sanitised.
    assert "targeted_departments" in (report.artifact_meta or {})
