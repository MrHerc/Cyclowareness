"""The executive briefing's missing validator.

`generate_training` has `_validate_training`. `triage_assist` has
`_validate_triage`. `executive_briefing` had nothing at all — only a check that
the string was non-empty — and it is the one piece of model prose shown to the
reader the code itself calls "the one person least able to tell the difference".

WHAT THIS EXISTS FOR, observed on the live deployment on 2026-08-03. The model
opened its answer with a draft it then abandoned:

    "Overall, our human risk trajectory continues to improve: average risk score
     has fallen from 49.8 to 43.3 over the past twelve weeks, and phishing click
     rates have roughly halved (20% down to 29.4%... more precisely from 0.20 to
     0.294 needs correction) — let me restate clearly below.

     **Executive Security Posture Briefing**

     ... [the actual, correct briefing] ..."

Two things go wrong at once, and the second is the serious one.

The executive sees a model thinking out loud, which reads as a broken product.
And the abandoned draft asserts that click rates "roughly halved" when 0.20 →
0.294 is a 47% RISE. The retry states it correctly — "ticked up to 29.4%,
reversing weeks of decline" — so the model got there in the end; the defect is
that the discarded attempt is shipped alongside the corrected one, and a reader
skimming the first sentence takes away the exact opposite of what happened.

ADJUST AND RECORD, never silently fix — the same rule the remediation output
firewall follows. The kept text is the model's own final version, the discarded
preamble is returned alongside it, and the API reports that an adjustment was
made rather than presenting repaired output as if it arrived clean.

Rejecting instead would be worse: the corrected briefing is accurate and useful,
and refusing it would fall back to the offline template, which is a downgrade
for a defect the model had already fixed itself.

THE SECOND RULE, added after the first shipped. Every FIGURE the briefing states
must trace back to a number in the payload the model was given. The abandoned
draft above was caught only because the model announced its own mistake; a model
that states "click rates fell to 15%" confidently and never corrects itself
would have sailed through. `ground_figures` closes that: it collects every
number in the metrics payload — the current values, the trend series and the
department rollups, in both decimal and percentage form — and flags any
percentage or decimal in the prose that matches none of them.

WHAT IT STILL DOES NOT DO, stated plainly so nobody mistakes its scope. It
checks FIGURES, not CLAIMS. "Click rates roughly halved", with no number
attached, is unfalsifiable by this and passes untouched. Directional words are
not verified against the trend. And it flags rather than rewrites: editing a
model's prose to fit the data would produce a briefing nobody wrote and the
reader could not audit, so the flag goes to the reader instead.
"""
from __future__ import annotations

import re
from typing import Any

#: The model announcing that what it just wrote is wrong. Deliberately narrow:
#: these are phrases of ABANDONMENT, not of hedging. "This bears watching" and
#: "given the small sample size" are good analysis and must survive untouched.
_ABANDONED = re.compile(
    r"""(
        let\s+me\s+(restate|rewrite|try\s+again|correct|redo)
      | i(?:'|’)?ll\s+(restate|rewrite|correct)
      | needs?\s+correction
      | correction:
      | scratch\s+that
      | apologies,\s*(let\s+me|i)
    )""",
    re.IGNORECASE | re.VERBOSE,
)

#: Where the real briefing restarts. A bold line on its own, or a markdown
#: heading — both are how a model signals "here is the actual answer".
_RESTART = re.compile(r"^\s*(\*\*[^*\n]{3,80}\*\*|#{1,6}\s+\S.*)\s*$", re.MULTILINE)


def validate_briefing(text: str) -> tuple[str, list[dict[str, Any]]]:
    """Return ``(briefing, adjustments)``.

    `adjustments` is empty when nothing was changed. Each entry names the rule
    and quotes what was removed, so the discarded text stays recoverable — the
    audit answer to "what did the model actually say?" is the whole point of
    recording rather than deleting.
    """
    briefing = text.strip()
    if not briefing:
        return briefing, []

    marker = _ABANDONED.search(briefing)
    if marker is None:
        return briefing, []

    # A restart AFTER the abandonment marker is the model's own final version.
    restart = _RESTART.search(briefing, marker.end())
    if restart is None:
        # It announced a correction but never restarted with a heading. Fall back
        # to the last paragraph, which is the only other place the corrected
        # text can be. If that leaves nothing, keep the original: a guard that
        # can empty the briefing is worse than the defect.
        tail = briefing[marker.end():].strip()
        paragraphs = [p.strip() for p in tail.split("\n\n") if p.strip()]
        if not paragraphs:
            return briefing, []
        kept = paragraphs[-1]
    else:
        kept = briefing[restart.start():].strip()

    discarded = briefing[: len(briefing) - len(kept)].strip()
    if not kept or not discarded:
        return briefing, []

    return kept, [
        {
            "rule": "abandoned_draft_removed",
            "why": (
                "The model announced a correction and rewrote the briefing. The "
                "discarded first attempt was removed; what remains is the model's "
                "own final version, unedited."
            ),
            "removed": discarded,
        }
    ]


# --- rule two: every figure must trace to the measurements ---------------------

#: A percentage ("29.4%", "30 %") or a decimal ("43.3"). Bare integers are
#: DELIBERATELY not matched: "two high-risk employees", "the next 30 days" and
#: "over twelve weeks" are all bare integers, and flagging them would bury the
#: real finding under noise the reader learns to ignore.
#:
#: The trailing guard is `(?!\.?\d)`, NOT `(?![\w.])`. The stricter form refused
#: to match any decimal followed by a full stop — which is to say, every figure
#: that ends a sentence, the commonest position in the whole briefing. Caught by
#: its own test asserting a fabricated "61.8." was flagged; it was not, because
#: it was never read. `(?!\.?\d)` still rejects "1.2.3" and version strings.
_FIGURE = re.compile(
    r"(?<![\w.])(\d+(?:\.\d+)?)\s*%|(?<![\w.])(\d+\.\d+)(?!\.?\d)"
)


def _payload_figures(metrics: Any) -> set[float]:
    """Every number the model was given, in both decimal and percentage form.

    Walked recursively so the current values, the 26-point trend series and the
    per-department rollups are all covered by one pass — a figure quoted from
    any of them is legitimately grounded, and hard-coding which keys to read
    would silently un-ground a payload that later grows a section.
    """
    found: set[float] = set()

    def walk(node: Any) -> None:
        if isinstance(node, bool):
            return
        if isinstance(node, (int, float)):
            value = float(node)
            found.add(value)
            # A rate is handed over as 0.294 and read aloud as 29.4%. Both are
            # the same measurement and both must count as grounded.
            if 0.0 <= value <= 1.0:
                found.add(round(value * 100, 4))
            return
        if isinstance(node, dict):
            for item in node.values():
                walk(item)
        elif isinstance(node, (list, tuple)):
            for item in node:
                walk(item)

    walk(metrics)
    return found


def _grounded(claim: float, payload: set[float]) -> bool:
    """Rounding is legitimate; invention is not.

    A model writing "29%" for 0.294, or "43" for 43.3, is doing its job. The
    tolerance is whichever is more generous of half a point absolute or 2%
    relative, so a restated figure passes and a fabricated one does not.
    """
    for value in payload:
        if abs(claim - value) <= max(0.5, abs(value) * 0.02):
            return True
    return False


def ground_figures(text: str, metrics: Any) -> list[dict[str, Any]]:
    """Figures in the prose that match nothing the model was given.

    Returns adjustment entries, empty when every figure traces back. Flags
    rather than edits — see the module docstring.
    """
    payload = _payload_figures(metrics)
    if not payload:
        return []

    ungrounded: list[str] = []
    for match in _FIGURE.finditer(text):
        raw = match.group(1) or match.group(2)
        try:
            claim = float(raw)
        except ValueError:
            continue
        if _grounded(claim, payload):
            continue
        rendered = f"{raw}%" if match.group(1) else raw
        if rendered not in ungrounded:
            ungrounded.append(rendered)

    if not ungrounded:
        return []

    return [
        {
            "rule": "figure_not_in_measurements",
            "why": (
                "These figures appear in the briefing but match nothing in the "
                "measurements it was given, so they cannot be verified: "
                + ", ".join(ungrounded)
                + "."
            ),
            "removed": "",
            "figures": ungrounded,
        }
    ]
