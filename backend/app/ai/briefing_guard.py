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

WHAT THIS DOES NOT DO. It does not check the numbers. A briefing that states a
figure found nowhere in the metrics, or misreads a direction of change without
announcing a correction, passes this guard untouched. Cross-checking prose
against the metric payload is a real piece of work and pretending a marker scan
achieves it would be the kind of claim this product exists not to make.
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
