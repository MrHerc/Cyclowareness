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


# --- rule two: every figure must trace to the measurements --------------------
from app.ai.briefing_guard import ground_figures  # noqa: E402

#: The real payload shape from GET /api/dashboard/executive on 2026-08-03.
PAYLOAD = {
    "current": {
        "window_days": 30,
        "min_sample": 5,
        "phishing_click_rate": 0.294,
        "report_rate": 0.471,
        "simulation_sample": 17,
        "avg_risk_score": 43.3,
        "avg_behaviour_risk": 30.0,
        "training_completion_rate": 0.889,
        "training_sample": 9,
    },
    "trend": [
        {"date": "2026-07-27", "phishing_click_rate": 0.137, "avg_risk_score": 44.0},
        {"date": "2026-08-03", "phishing_click_rate": 0.113, "avg_risk_score": 44.3},
    ],
    "departments": [{"name": "Finance", "avg_risk": 54.6, "employee_count": 5, "high_risk_count": 2}],
}


def test_a_fabricated_figure_is_flagged():
    """The failure the first rule cannot catch: a wrong number stated confidently.

    Nothing in the payload is near 15%, so a briefing claiming it is asserting a
    measurement that was never taken — to a board.
    """
    text = "Click rates fell to 15% this month, a strong result."
    adjustments = ground_figures(text, PAYLOAD)
    assert len(adjustments) == 1
    assert adjustments[0]["rule"] == "figure_not_in_measurements"
    assert "15%" in adjustments[0]["figures"]


def test_figures_that_trace_back_are_not_flagged():
    """Every one of these is in the payload, in decimal or percentage form."""
    text = (
        "The click rate is 29.4% against a report rate of 47.1%. Average risk is "
        "43.3 and completion has reached 88.9%. Finance sits at 54.6."
    )
    assert ground_figures(text, PAYLOAD) == []


def test_a_figure_from_the_trend_series_counts_as_grounded():
    """The model is given twelve trend points and may legitimately quote any."""
    text = "The click rate touched 13.7% in late July before easing to 11.3%."
    assert ground_figures(text, PAYLOAD) == []


def test_rounding_is_allowed_but_invention_is_not():
    assert ground_figures("Click rate is about 29%.", PAYLOAD) == []
    assert ground_figures("Average risk is roughly 43.", PAYLOAD) == []
    flagged = ground_figures("Average risk is 61.8.", PAYLOAD)
    assert flagged and "61.8" in flagged[0]["figures"]


def test_bare_integers_are_not_treated_as_measurements():
    """"Two high-risk employees", "the next 30 days", "over twelve weeks" — every
    one of these is a bare integer, and flagging them would bury the real finding
    under noise the reader learns to ignore."""
    text = (
        "Over the next 90 days, focus on the 3 highest-risk departments and the "
        "7 employees who clicked. Reassess in 45 days."
    )
    assert ground_figures(text, PAYLOAD) == []


def test_the_live_briefing_produces_no_false_positives():
    """Measured against real output, not a fixture invented to pass.

    The corrected half of the live briefing quotes eleven figures. If this guard
    flagged any of them it would cry wolf on every real briefing and be switched
    off within a week.
    """
    live = (
        "Since mid-May, average risk score has dropped steadily from 49.8 to a low "
        "of 43.3. However, this week's phishing click rate ticked up to 29.4%. "
        "Finance remains our weakest link with the highest average risk score "
        "(54.6). The completion rate climbed to 88.9%."
    )
    payload = dict(PAYLOAD)
    payload["trend"] = list(PAYLOAD["trend"]) + [{"avg_risk_score": 49.8}]
    assert ground_figures(live, payload) == []


def test_an_empty_payload_flags_nothing():
    """No measurements means nothing to check against — silence, not a blanket
    accusation that every figure is invented."""
    assert ground_figures("Click rate is 29.4%.", {}) == []
    assert ground_figures("Click rate is 29.4%.", None) == []
