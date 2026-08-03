"""The executive briefing's guard, and the live output that forced it.

`generate_training` and `triage_assist` both had validators. `executive_briefing`
had only a non-empty check — and it is the one model-written paragraph shown to
the reader the code itself calls "the one person least able to tell the
difference".

The first test here is the verbatim output from the live Render deployment on
2026-08-03. It is kept as a literal rather than paraphrased because the exact
shape is the specification: a wrong claim, a self-correction, then the correct
briefing, all in one response.
"""
from __future__ import annotations

from app.ai.briefing_guard import validate_briefing

# Verbatim from https://cyclowareness.onrender.com/api/dashboard/executive.
# The first sentence says click rates "roughly halved"; 0.20 -> 0.294 is a 47%
# RISE. The model notices, says so, and rewrites. Both halves were shipped.
LIVE_OUTPUT = (
    "Overall, our human risk trajectory continues to improve: average risk score "
    "has fallen from 49.8 to 43.3 over the past twelve weeks, and phishing click "
    "rates have roughly halved (20% down to 29.4%... more precisely from 0.20 to "
    "0.294 needs correction) — let me restate clearly below.\n"
    "\n"
    "**Executive Security Posture Briefing**\n"
    "\n"
    "Our human risk trend continues to move in the right direction, though the "
    "most recent reading warrants a closer look. This week's phishing click rate "
    "ticked up to 29.4%, reversing weeks of decline."
)


def test_the_abandoned_draft_is_removed_and_the_correction_kept():
    kept, adjustments = validate_briefing(LIVE_OUTPUT)

    assert "roughly halved" not in kept, (
        "the discarded draft survived — an executive skimming the first sentence "
        "reads the opposite of what the numbers say"
    )
    assert "let me restate" not in kept.lower()
    assert "ticked up to 29.4%" in kept, "the model's corrected briefing was lost"
    assert kept.startswith("**Executive Security Posture Briefing**")


def test_the_removal_is_recorded_not_silent():
    """Adjust AND record. Repaired output presented as clean output is still the
    product deciding what the reader may know about its own model."""
    _kept, adjustments = validate_briefing(LIVE_OUTPUT)
    assert len(adjustments) == 1
    entry = adjustments[0]
    assert entry["rule"] == "abandoned_draft_removed"
    assert "roughly halved" in entry["removed"], (
        "what was removed must stay recoverable; the audit answer to 'what did "
        "the model actually say?' is the point of recording rather than deleting"
    )


def test_a_clean_briefing_is_returned_untouched():
    """The guard must be inert on good output, or it is a liability of its own."""
    clean = (
        "Our human risk trend continues to move in the right direction, though "
        "this week's click rate ticked up to 29.4%, so this bears watching rather "
        "than dismissing as noise given the small sample size. Finance remains "
        "our weakest department."
    )
    kept, adjustments = validate_briefing(clean)
    assert kept == clean
    assert adjustments == []


def test_hedging_language_is_not_mistaken_for_abandonment():
    """"Bears watching", "given the small sample" and "more precisely" are good
    analysis. Only phrases that DISCARD what was just written may trigger."""
    careful = (
        "Click rate rose to 29.4% this week. More precisely, that is 5 of 17 "
        "resolved targets, which is below the threshold at which we publish a "
        "rate — so treat it as a signal to watch, not a measured shift."
    )
    kept, adjustments = validate_briefing(careful)
    assert kept == careful
    assert adjustments == []


def test_a_correction_with_no_restart_keeps_the_last_paragraph():
    text = (
        "Risk fell from 49.8 to 43.3 and click rates halved. Needs correction.\n"
        "\n"
        "Risk fell from 49.8 to 43.3; the click rate rose to 29.4%."
    )
    kept, adjustments = validate_briefing(text)
    assert kept == "Risk fell from 49.8 to 43.3; the click rate rose to 29.4%."
    assert len(adjustments) == 1


def test_the_guard_can_never_empty_the_briefing():
    """A guard that can return nothing is worse than the defect it fixes."""
    for text in (
        "let me restate clearly below.",
        "Correction:",
        "**Heading**",
        "",
        "   ",
    ):
        kept, _adjustments = validate_briefing(text)
        assert kept == text.strip() or kept, f"guard emptied the briefing for {text!r}"


def test_the_guard_does_not_claim_to_check_numbers():
    """It does not, and the docstring says so. A briefing that misstates a figure
    without announcing a correction passes untouched — recorded here so nobody
    later mistakes this module for numeric validation."""
    wrong = "Click rates roughly halved, falling from 0.20 to 0.294."
    kept, adjustments = validate_briefing(wrong)
    assert kept == wrong
    assert adjustments == []
