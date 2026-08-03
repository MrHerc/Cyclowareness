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

import pytest

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

# --- the drift itself, when the other repository is on this machine ------------
#: The standalone checkout, if the developer has one beside the portal. CI does
#: not, which is why every other test in this file checks the portal alone.
_STANDALONE = pathlib.Path(
    "C:/Users/Safar/Desktop/Cyclowareness/cyclowareness-sandbox/backend/app/engine"
)


@pytest.mark.skipif(
    not _STANDALONE.is_dir(),
    reason=(
        "the standalone checkout is not on this machine — CI runs one repository "
        "at a time, so the byte-identity check can only run for a developer who "
        "has both"
    ),
)
def test_the_vendored_engine_is_byte_identical_to_the_standalone():
    """The check nobody remembers to run by hand.

    Drift is invisible: the portal keeps working, its tests keep passing, and the
    fixes the standalone gains simply never arrive. It went unnoticed until ten
    files and 553 lines had accumulated — and then happened AGAIN the same day,
    when a commit in the other repository touched `report.py` and `verdict.py`
    within hours of the re-vendor.

    FAILING HERE IS USUALLY NOT A DEFECT IN THE PORTAL. It means the standalone
    has moved. What to do about that depends on the standalone, so the message
    says to check it rather than to copy blindly: the drift that prompted this
    test was against a commit whose own CI was RED, and copying it would have
    imported somebody else's broken work-in-progress into this repository.

    Skipped in CI, where only one repository is checked out. That makes it a
    developer's check, not a gate — which is the honest scope for it, because
    nothing in CI can see the other repository at all.
    """
    engine = pathlib.Path(native.__file__).parent
    drifted: list[str] = []
    missing: list[str] = []

    for theirs in sorted(_STANDALONE.rglob("*.py")):
        if "__pycache__" in theirs.parts:
            continue
        ours = engine / theirs.relative_to(_STANDALONE)
        if not ours.exists():
            missing.append(str(theirs.relative_to(_STANDALONE)))
        elif ours.read_bytes() != theirs.read_bytes():
            drifted.append(str(theirs.relative_to(_STANDALONE)))

    assert not missing, f"present in the standalone, absent here: {missing}"
    assert not drifted, (
        "the vendored engine has drifted from the standalone: "
        + ", ".join(drifted)
        + ". Before copying: check the standalone's own CI is green on the "
        "commit that changed these. A red standalone means the drift is somebody "
        "else's work in progress and must NOT be pulled in. When it is green, "
        "copy its bytes over — it is the source of truth — and then re-check what "
        "the portal DOES with what arrived. The last re-vendor needed four "
        "separate rewirings after the files landed; the files are half of it."
    )
