"""Where do this deployment's samples go — the question the panel could not answer.

The engine has always been able to say: `integrations.capability_report()`
describes every external sandbox it can hand a file to, and the standalone
publishes it. The portal never asked. So a deployment with `CAPEV2_URL` or
`CUCKOO_URL` set uploads every detonatable sample to a third-party cluster while
`/api/sandbox/capabilities` says `dynamic_worker: true` and names neither the
engine nor the destination.

Two things must both hold, and the second is the one worth a test:

* the matrix is published, so the question is answerable at all;
* it publishes **no credential**. `configured` is a boolean and the variable
  names appear only inside the human-readable `requires` line. A capability
  endpoint that leaked a token would be a far worse defect than the silence it
  replaced, so the canary below asserts the value never appears anywhere in the
  response.
"""
from __future__ import annotations

import json

CANARY = "canary-value-that-must-never-be-published"


def test_the_capability_endpoint_names_the_external_engines(client, analyst_headers):
    body = client.get("/api/sandbox/capabilities", headers=analyst_headers).json()
    integrations = body.get("integrations")
    assert integrations, "the portal still cannot say where a sample would go"

    keys = {row["key"] for row in integrations}
    for expected in ("capev2", "cuckoo", "virustotal"):
        assert expected in keys, f"{expected} is missing from the published matrix"


def test_no_credential_value_reaches_the_response(client, analyst_headers, monkeypatch):
    """The canary. Variable NAMES are documentation; their values are secrets."""
    for var in ("CAPEV2_TOKEN", "CUCKOO_TOKEN", "JOE_API_KEY", "VT_API_KEY"):
        monkeypatch.setenv(var, CANARY)

    raw = client.get("/api/sandbox/capabilities", headers=analyst_headers).text
    assert CANARY not in raw, (
        "a credential value was published on the capability endpoint — this is "
        "worse than the silence it replaced"
    )


def test_every_engine_that_receives_a_sample_says_so(client, analyst_headers):
    """`sends_data_off_host` is the field the whole panel exists for. An engine
    that takes the file must not be indistinguishable from one that takes a
    hash."""
    body = client.get("/api/sandbox/capabilities", headers=analyst_headers).json()
    for row in body["integrations"]:
        assert isinstance(row["sends_data_off_host"], bool)
        assert row["requires"], f"{row['key']} does not say what configuring it needs"


def test_a_worker_resident_engine_carries_its_caveat(client, analyst_headers):
    """`configured` is read from THIS process's environment while these engines
    run in the off-host worker, so on a split deployment — the shape this product
    actually has — the flag can be false while the attached worker has the
    variable set.

    Without the caveat the row answers a procurement question with the wrong
    machine's configuration and reads as authoritative.
    """
    body = client.get("/api/sandbox/capabilities", headers=analyst_headers).json()
    worker_resident = [r for r in body["integrations"] if r.get("configured_on_worker")]
    assert worker_resident, "no engine is marked worker-resident; the fixture has drifted"
    for row in worker_resident:
        assert row.get("configuration_caveat"), (
            f"{row['key']} is configured on the worker but publishes no caveat, so "
            f"its `configured` flag reads as authoritative about the wrong machine"
        )


def test_the_matrix_survives_an_absent_integrations_layer(client, analyst_headers, monkeypatch):
    """The handler guards the import because the layer is optional. If that guard
    ever inverts, the whole capability endpoint fails rather than one section."""
    import app.routers.sandbox as router_mod

    real_import = __import__

    def explode(name, *args, **kw):
        if name.endswith("integrations"):
            raise ImportError("simulated absence")
        return real_import(name, *args, **kw)

    monkeypatch.setattr("builtins.__import__", explode)
    response = client.get("/api/sandbox/capabilities", headers=analyst_headers)
    monkeypatch.undo()

    assert response.status_code == 200, (
        "an absent integrations layer took the whole capability endpoint down"
    )
    assert response.json()["integrations"] == []
    assert router_mod  # the module is the subject; keep the import meaningful


def test_the_published_matrix_is_json_serialisable_without_surprises(client, analyst_headers):
    body = client.get("/api/sandbox/capabilities", headers=analyst_headers).json()
    json.dumps(body["integrations"])  # raises if anything exotic slipped in
