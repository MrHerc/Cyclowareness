"""Retrieval: which material is even a candidate for this behaviour.

Deterministic and code-owned, on purpose. The model never searches, never sees
the catalogue as prose, and never names an asset — it receives an opaque token
per candidate and may only choose among them. That is what makes firewall R1
("a member of the set retrieval just offered") enforceable at all.

TIER 1 SCOPE, STATED HONESTLY. The candidates below are the training modules
this deployment already has, tagged by behaviour. `TrainingAsset` as a
first-class importable catalogue — CSV and URL import, effectiveness ranking,
the full Human Risk Behaviour taxonomy — is Tier 2, and inventing half of that
taxonomy now would mean re-tagging every asset later.

So this returns a small, real, honest candidate set, and returns NOTHING rather
than a weak match when the behaviour is not covered. An empty result is a
`CoverageGap`, which is a result worth having.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field

from .models import SourceKind
from .triggers import Behaviour


@dataclass(frozen=True)
class Candidate:
    """One thing retrieval is willing to offer, behind an opaque token.

    The token is per-request and random: it carries no id, so a model cannot
    reach an asset it was not shown by guessing, and two requests never share a
    token that could be replayed across them.
    """

    token: str
    asset_id: int | None
    source_kind: str
    title: str
    quiz_ref: str = ""
    default_framing: dict[str, object] = field(default_factory=dict)


#: The behaviours this deployment can actually answer, and what it answers with.
#: Keyed by behaviour so a gap is structural and visible rather than a silent
#: fallback to whatever module happened to be nearest.
_LIBRARY: dict[str, list[dict]] = {
    Behaviour.CLICKED_LINK: [
        {
            "asset_id": 1,
            "source_kind": SourceKind.INTERNAL,
            "title": "Links that are not where they say they go",
            "framing": {
                "headline": "A link that did not go where it said",
                "why_you": (
                    "A message reached you that was built to be clicked, and it worked. "
                    "That is what these are designed to do, and it is why the next one "
                    "is worth two seconds of checking."
                ),
                "what_to_do": [
                    "Hover a link and read the address before clicking it.",
                    "When a message creates urgency about money or access, verify on a "
                    "channel you already trust.",
                ],
                "takeaway": "Urgency is the tell. Slow down before you click, not after.",
            },
        }
    ],
    Behaviour.SUBMITTED_CREDENTIALS: [
        {
            "asset_id": 2,
            "source_kind": SourceKind.INTERNAL,
            "title": "When credentials have been entered somewhere they should not be",
            "framing": {
                "headline": "Credentials were entered on a page that was not ours",
                "why_you": (
                    "A sign-in page asked for your password and it was not one of ours. "
                    "The important part now is speed, not blame — the sooner the password "
                    "changes, the smaller the window."
                ),
                "what_to_do": [
                    "Change that password now, and anywhere you reused it.",
                    "Approve no sign-in prompt you did not start yourself.",
                ],
                "takeaway": "Report it early. Reporting fast is what shrinks the damage.",
            },
        }
    ],
    Behaviour.OPENED_ATTACHMENT: [
        {
            "asset_id": 3,
            "source_kind": SourceKind.INTERNAL,
            "title": "Attachments that are not the document they claim to be",
            "framing": {
                "headline": "An attachment that was not the document it claimed to be",
                "why_you": (
                    "A file reached you disguised as an ordinary document. Opening it is "
                    "exactly the behaviour it was built to produce."
                ),
                "what_to_do": [
                    "Check the file type before opening anything unexpected.",
                    "Forward anything that feels wrong to the security team instead of opening it.",
                ],
                "takeaway": "An unexpected attachment is a question, not an instruction.",
            },
        }
    ],
    Behaviour.ENABLED_MACROS: [
        {
            "asset_id": 4,
            "source_kind": SourceKind.INTERNAL,
            "title": "Why a document asks you to enable content",
            "framing": {
                "headline": "A document that asked to run its own code",
                "why_you": (
                    "The prompt to enable content is not a formatting step. It is the "
                    "document asking permission to run code, and it is the whole point "
                    "of the attack."
                ),
                "what_to_do": [
                    "Never enable content or macros on a document you did not expect.",
                    "If a colleague appears to have sent it, ask them on a channel you trust.",
                ],
                "takeaway": "Enable content is the attack, not a step before the document works.",
            },
        }
    ],
}


def candidates_for(behaviour: str) -> list[Candidate]:
    """Everything retrieval is willing to offer for this behaviour.

    Returns an EMPTY LIST when nothing is tagged for it, deliberately. A weak
    fallback — the nearest module, the most recent one — is how a library ends
    up looking complete while teaching the wrong lesson, and it hides the gap
    that the `CoverageGap` row exists to surface.
    """
    rows = _LIBRARY.get(behaviour)
    if not rows:
        return []
    return [
        Candidate(
            token=f"c{secrets.token_hex(4)}",
            asset_id=row["asset_id"],
            source_kind=row["source_kind"],
            title=row["title"],
            default_framing=row["framing"],
        )
        for row in rows
    ]


def covered_behaviours() -> tuple[str, ...]:
    """What the library can answer today — read by the coverage screen."""
    return tuple(sorted(_LIBRARY))
