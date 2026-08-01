"""The organisational layer, wired up: does it answer, to whom, and honestly?

The domain suites (``test_policy_router``, ``test_incident_risk_approvals``)
pin each router's own promises. This one pins the things that only break when
the five routers are mounted together in one app against one seeded database —
the failures nobody notices until a page is opened:

* every list and detail route actually answers, rather than 500-ing on a
  relationship the seed populates and no unit test touches;
* the role boundary holds on all of them at once, not one router at a time;
* the redaction path is reachable from a **seeded** login, so it demos without
  a user being minted by hand;
* ``/intel/refresh`` still refuses to invent an advisory when it is called as
  part of a real session rather than in isolation;
* an illegal state move is refused with 409 rather than quietly applied.
"""
import pytest

from app.models import User
from app.platform.models import AuditEvent, Confidentiality, IncidentRisk, IncidentRiskSubject

#: Every read route the five domains expose as a collection. A GET that 500s
#: here is the whole page gone, so they are asserted together rather than
#: discovered one router at a time.
LIST_ROUTES = [
    "/api/policy/policies",
    "/api/policy/findings",
    "/api/policy/stats",
    "/api/intel/items",
    "/api/intel/matches",
    "/api/intel/stats",
    "/api/integrations",
    "/api/incident-risks",
    "/api/audit",
    "/api/audit/actions",
    "/api/approvals",
]


def _first_id(client, headers, path):
    """The id of the first row a list route returns, enveloped or bare."""
    body = client.get(path, headers=headers).json()
    items = body if isinstance(body, list) else body.get("items", [])
    assert items, f"{path} returned nothing — the seed no longer populates it"
    return items[0].get("id") or items[0]["run_id"]


def _headers(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


#: The seeded Finance login that IS a subject of a restricted incident.
LEYLA = "leyla.aliyeva@caspiandynamics.az"


@pytest.fixture
def leyla_headers(client):
    return _headers(client, LEYLA, "demo123")


@pytest.fixture
def exec_headers(client):
    return _headers(client, "exec@caspiandynamics.az", "exec123")


# --- the routes answer at all --------------------------------------------------


@pytest.mark.parametrize("path", LIST_ROUTES)
def test_every_list_route_answers(client, analyst_headers, path):
    assert client.get(path, headers=analyst_headers).status_code == 200


@pytest.mark.parametrize(
    "list_path,detail_path",
    [
        ("/api/policy/policies", "/api/policy/policies/{id}"),
        ("/api/policy/policies", "/api/policy/policies/{id}/rules"),
        ("/api/policy/policies", "/api/policy/policies/{id}/versions"),
        ("/api/policy/findings", "/api/policy/findings/{id}"),
        ("/api/intel/items", "/api/intel/items/{id}"),
        ("/api/integrations", "/api/integrations/{id}"),
        ("/api/integrations", "/api/integrations/{id}/courses"),
        ("/api/incident-risks", "/api/incident-risks/{id}"),
        ("/api/approvals", "/api/approvals/{id}"),
        ("/api/approvals", "/api/approvals/{id}/history"),
    ],
)
def test_every_detail_route_answers_for_a_seeded_row(
    client, analyst_headers, list_path, detail_path
):
    """Detail routes join across the seed; a broken join only shows up here."""
    row_id = _first_id(client, analyst_headers, list_path)
    r = client.get(detail_path.format(id=row_id), headers=analyst_headers)
    assert r.status_code == 200, r.text


def test_a_missing_row_is_a_404_not_an_empty_page(client, analyst_headers):
    for path in (
        "/api/policy/policies/999999",
        "/api/policy/findings/999999",
        "/api/intel/items/999999",
        "/api/integrations/999999",
        "/api/incident-risks/999999",
        "/api/approvals/999999",
    ):
        assert client.get(path, headers=analyst_headers).status_code == 404, path


# --- the role boundary ---------------------------------------------------------


@pytest.mark.parametrize("path", LIST_ROUTES)
def test_an_employee_is_refused_every_analyst_route(client, employee_headers, path):
    """403, not an empty list: a filtered-to-nothing page reads as "all clear"."""
    assert client.get(path, headers=employee_headers).status_code == 403


def test_an_executive_reads_the_governance_surface_but_not_the_investigations(
    client, exec_headers
):
    """Where an exec is allowed, and where the departure from that is deliberate.

    Incident records and the audit trail are analyst-only. The trail carries
    before/after snapshots lifted from restricted incidents and there is no
    redacted projection of an audit row, so an exec-visible log would either
    leak those fields or silently drop the rows and read as complete.
    """
    for path in (
        "/api/policy/policies",
        "/api/policy/findings",
        "/api/intel/items",
        "/api/integrations",
        "/api/approvals",
    ):
        assert client.get(path, headers=exec_headers).status_code == 200, path

    for path in ("/api/incident-risks", "/api/audit"):
        assert client.get(path, headers=exec_headers).status_code == 403, path


def test_an_executive_read_grant_does_not_carry_a_write_grant(client, exec_headers):
    """Read where it helps, write nowhere: every mutation is analyst-only."""
    assert client.post("/api/intel/refresh", headers=exec_headers).status_code == 403
    assert client.post(
        "/api/policy/findings",
        headers=exec_headers,
        json={"title": "t", "description": "d", "finding_type": "missing_control",
              "severity": "low"},
    ).status_code == 403
    assert client.post(
        "/api/approvals/1/decision",
        headers=exec_headers,
        json={"decision": "approve", "comment": "no"},
    ).status_code == 403


# --- the redaction path, from a seeded login -----------------------------------


def test_a_seeded_employee_sees_her_obligation_without_the_investigation(
    client, db, analyst_headers, leyla_headers
):
    """The withheld-evidence path must demo, not merely exist.

    Leyla Aliyeva is seeded as a subject of the RESTRICTED IR-2026-0148 for
    exactly this reason. If no login-having employee were ever a subject, this
    view would return ``[]`` for every demo account and the redaction would be
    unreachable without minting a user by hand.
    """
    rows = client.get("/api/incident-risks/my", headers=leyla_headers).json()
    assert rows, "no seeded login is a subject of any incident risk"

    risk = db.query(IncidentRisk).filter(
        IncidentRisk.confidentiality == Confidentiality.RESTRICTED
    ).first()
    mine = next(r for r in rows if r["id"] == risk.id)

    assert mine["redacted"] is True
    assert mine["description"] is None
    assert mine["evidence"] is None
    assert mine["redaction_note"]
    # She is still told what she owes and by when — redaction is not silence.
    assert mine["required_action"] == risk.required_action
    assert mine["deadline"] is not None

    # And the material is genuinely there, withheld rather than absent: the same
    # record read by an analyst carries the narrative and its evidence.
    full = client.get(f"/api/incident-risks/{risk.id}", headers=analyst_headers).json()
    assert full["description"] == risk.description
    assert full["evidence"]


def test_the_employee_view_never_reaches_another_persons_row(client, leyla_headers, db):
    """Every row she is shown is one she is named on, and no other."""
    leyla = db.query(User).filter(User.email == LEYLA).one()
    hers = {
        s.incident_risk_id
        for s in db.query(IncidentRiskSubject).filter(
            IncidentRiskSubject.employee_id == leyla.employee_id
        )
    }
    mine = client.get("/api/incident-risks/my", headers=leyla_headers).json()
    assert {r["id"] for r in mine} <= hers

    # Not vacuously true: there are other incidents she is not a subject of.
    assert db.query(IncidentRisk).count() > len(hers)


# --- "we did not look" is not "we looked and found nothing" --------------------


def test_refresh_does_not_invent_an_advisory(client, analyst_headers, db):
    """No source is configured, so the only honest refresh changes nothing."""
    before = client.get("/api/intel/items?limit=200", headers=analyst_headers).json()

    r = client.post("/api/intel/refresh", headers=analyst_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["attempted"] is False
    assert body["configured_sources"] == []
    assert body["items_added"] == 0 and body["items_updated"] == 0
    # The response has to say the list is unchanged, not merely be unchanged.
    assert body["detail"] and body["next_step"]

    after = client.get("/api/intel/items?limit=200", headers=analyst_headers).json()
    assert after["total"] == before["total"]
    assert [i["id"] for i in after["items"]] == [i["id"] for i in before["items"]]

    # "An analyst asked and the platform did not look" is itself on the record.
    assert db.query(AuditEvent).filter(AuditEvent.action == "intel.refresh").count() >= 1


def test_intel_stats_carry_the_caveat_that_nothing_is_being_fetched(
    client, analyst_headers
):
    """A zero on this dashboard must not be able to travel without its reason."""
    body = client.get("/api/intel/stats", headers=analyst_headers).json()
    assert body["configured_sources"] == []
    assert body["coverage_note"]


def test_a_sync_against_an_unconfigured_integration_refuses(client, analyst_headers):
    integrations = client.get("/api/integrations", headers=analyst_headers).json()
    target = next(i for i in integrations if i["status"] == "not_configured")
    r = client.post(
        f"/api/integrations/{target['id']}/sync",
        headers=analyst_headers,
        json={"scope": "courses"},
    )
    assert r.status_code == 409, r.text
    assert "not_configured" in r.json()["detail"]


def test_a_sync_that_never_left_the_process_does_not_overwrite_a_real_result(
    client, analyst_headers
):
    """The dangerous case: stamping "not attempted" over a genuine sync record."""
    integrations = client.get("/api/integrations", headers=analyst_headers).json()
    target = next(i for i in integrations if i["status"] in ("connected", "degraded", "error"))
    before = client.get(f"/api/integrations/{target['id']}", headers=analyst_headers).json()

    r = client.post(
        f"/api/integrations/{target['id']}/sync",
        headers=analyst_headers,
        json={"scope": "courses"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["attempted"] is False
    assert r.json()["error"]

    after = client.get(f"/api/integrations/{target['id']}", headers=analyst_headers).json()
    for field in ("status", "last_sync_status", "last_sync_at", "courses_imported"):
        assert after[field] == before[field], field


# --- an illegal move is refused ------------------------------------------------


def test_an_illegal_finding_transition_is_refused_with_409(client, analyst_headers):
    """A closed finding must not be walked back into the remediation queue.

    409 rather than 422: the request is well-formed, it is the finding's current
    state that makes it impossible, and the message has to say which state.
    """
    created = client.post(
        "/api/policy/findings",
        headers=analyst_headers,
        json={
            "title": "Quarterly access review is not evidenced",
            "description": "Raised to pin the transition guard.",
            "finding_type": "missing_control",
            "severity": "low",
        },
    )
    assert created.status_code == 201, created.text
    finding_id = created.json()["id"]

    assert client.patch(
        f"/api/policy/findings/{finding_id}",
        headers=analyst_headers,
        json={"status": "resolved", "resolution_note": "Evidence produced."},
    ).status_code == 200

    r = client.patch(
        f"/api/policy/findings/{finding_id}",
        headers=analyst_headers,
        json={"status": "training_assigned", "resolution_note": "Reopening by the back door."},
    )
    assert r.status_code == 409, r.text
    assert "resolved" in r.json()["detail"]

    unchanged = client.get(
        f"/api/policy/findings/{finding_id}", headers=analyst_headers
    ).json()
    assert unchanged["status"] == "resolved"
