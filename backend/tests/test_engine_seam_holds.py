"""The vendoring contract, as tests that fail when it is broken again.

`app/sandbox/engine/` is copied verbatim from the standalone Cyclowareness
Sandbox so that a verdict reached here and a verdict reached there are reached
by the same code. On 2026-08-03 ten of its thirty-seven files had drifted — 553
lines of fixes the standalone had gained and the portal never received,
including the guard that stops an uncalibrated platform asserting an ATT&CK
technique and the one that stops a Linux trace being scored on a Windows guest.

`diff -rq` proves the copy is current, but only where both repositories are
checked out — which is not CI. What CI *can* check is the far more common
failure: the portal quietly growing its own copy of something the engine owns.
Every finding below was a real defect found in that shape.
"""
from __future__ import annotations

import ast
import pathlib

from app.routers import sandbox_dynamic
from app.sandbox.engine import native


def test_the_queue_reads_the_engines_detonable_families_rather_than_a_copy():
    """One definition, in the engine that owns it.

    `sandbox_dynamic` held a literal `{"pe", "elf", "script", ...}` beside
    `native.DETONABLE_FAMILIES`. Two copies of a set drift, and the drift is
    silent in the worst direction: the engine gains a family, the report
    promises the sample will be detonated, and the queue never offers it to a
    worker — so the job waits for a detonation that was never scheduled.
    """
    assert sandbox_dynamic._DYNAMIC_FAMILIES is native.DETONABLE_FAMILIES, (
        "the queue is filtering on its own copy of the detonable families; read "
        "native.DETONABLE_FAMILIES so there is one definition"
    )


def test_no_router_asserts_att_and_ck_techniques_without_the_exclusion_set():
    """A technique in the panel is an accusation with a reference number.

    `mitre.map_techniques` takes `exclude` precisely so that ids the score has
    refused cannot still appear in the ATT&CK panel beside it. The portal's
    post-detonation rescore called it bare, so a signal excluded from the number
    was printed in the panel next to that number — which is how
    `capev2.stealth_network` asserted T1071 on a report whose score had
    deliberately ignored it.

    Read from the AST rather than grepped: a keyword argument can be spelled
    across lines, and a regex would pass on the very formatting the fix uses.
    """
    routers = pathlib.Path(sandbox_dynamic.__file__).parent
    offenders: list[str] = []

    for path in sorted(routers.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
            if name != "map_techniques":
                continue
            if not any(kw.arg == "exclude" for kw in node.keywords):
                offenders.append(f"{path.name}:{node.lineno}")

    assert not offenders, (
        "map_techniques called without `exclude` at "
        + ", ".join(offenders)
        + " — an uncalibrated platform may not assert a technique"
    )


def test_the_rescore_counts_only_the_indicators_the_score_admits():
    """`merged.total()` counts the trace's indicators; the score excludes them.

    This path runs only once a detonation report has landed, so `merged` always
    carries dynamic indicators. Feeding the raw total into ioc_density while the
    rest of the assessment is deliberately discarding that tier charges the
    sample for behaviour the score has already refused to attribute to it.
    """
    source = pathlib.Path(sandbox_dynamic.__file__).read_text(encoding="utf-8")
    tree = ast.parse(source)

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        # `scoring.assess` specifically — `impact.assess` is a different call
        # with a different contract, and matching on the bare attribute name
        # flagged it. Caught by this test failing on the impact call.
        func = node.func
        if not isinstance(func, ast.Attribute) or func.attr != "assess":
            continue
        if not (isinstance(func.value, ast.Name) and func.value.id == "scoring"):
            continue
        ioc = next((kw.value for kw in node.keywords if kw.arg == "ioc_total"), None)
        assert ioc is not None, f"scoring.assess at line {node.lineno} passes no ioc_total"
        called = ioc.func.attr if isinstance(ioc, ast.Call) and isinstance(ioc.func, ast.Attribute) else None
        assert called == "scorable_ioc_total", (
            f"scoring.assess at line {node.lineno} is given a raw indicator total; "
            f"use scoring.scorable_ioc_total so the count matches what the score admits"
        )


def test_the_engine_package_holds_no_portal_only_module():
    """Vendored means vendored: a portal-authored file inside `engine/` cannot
    survive the next re-vendor, so it must not be written there in the first
    place. The seam lives in `app/sandbox/*.py`, one level up."""
    engine = pathlib.Path(native.__file__).parent
    # The standalone's own engine package, as of the 2026-08-03 re-vendor.
    expected = {
        "__init__.py", "archives.py", "attestation.py", "authenticode.py",
        "capabilities.py", "contracts.py", "fetcher.py", "identify.py",
        "impact.py", "incident.py", "mitre.py", "models.py", "native.py",
        "pipeline.py", "report.py", "scoring.py", "storage.py",
        "trust_anchors.py", "verdict.py", "yara_engine.py",
    }
    actual = {p.name for p in engine.glob("*.py")}
    unexpected = actual - expected
    assert not unexpected, (
        f"portal-authored modules inside the vendored engine: {sorted(unexpected)}. "
        f"They will be lost on the next re-vendor; put them in app/sandbox/ instead."
    )
