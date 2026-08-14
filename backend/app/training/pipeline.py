"""Finding → training, as one auditable decision.

The ask this module answers: an IR finding lands on the portal, training is
prepared for it and sent to the employee who caused it — from the external
catalogue (YouTube/Coursera/Udemy) or an internal module when one fits, and
GENERATED when nothing does.

Three rules shape everything here:

1. **Retrieval first, generation second.** An approved internal module that
   matches the finding's topic is assigned outright — it already passed a
   human. Verified external resources are attached as supporting material.
   Only when the shelf is empty does the model write.

2. **Generation never assigns.** A generated module lands PENDING_REVIEW with
   its `origin` recorded, and the assignment happens in the approval router
   AFTER a named person approves. The human gate is the product's central
   claim; an auto-pipeline that tunnelled under it would be a different
   product.

3. **Every outcome is stated, none invented.** The response says which of the
   three paths ran and why — "assigned an approved module", "generated,
   awaiting approval", including which employees were skipped and which
   resources were attached. An empty catalogue is reported as empty.

The topic map is deliberately a TABLE, not a model call: a finding's type is
a controlled vocabulary, and a wrong topic here sends a person a lesson about
the wrong thing while looking successful in every log.
"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..platform import models as platform_models
from .resources import TOPICS

# ---------------------------------------------------------------------------
# Topic derivation
# ---------------------------------------------------------------------------

#: IncidentRiskType -> catalogue topic. The right-hand side must stay inside
#: `resources.TOPICS`; the assertion below makes a typo a boot error, not a
#: silent "no resources found".
_RISK_TYPE_TOPIC: dict[str, str] = {
    "user_action": "phishing",
    "privileged_exposure": "credential_theft",
    "data_mishandling": "data_handling",
    "procedure_failure": "data_handling",
    "alert_fatigue": "mfa_fatigue",
    "knowledge_gap": "phishing",
}

#: PolicyFinding.finding_type -> topic, with keyword fallbacks below. The
#: left-hand side is `platform.models.FindingType`'s REAL vocabulary — an
#: invented name here silently routes every finding to the default topic.
_FINDING_TYPE_TOPIC: dict[str, str] = {
    "outdated_approved_version": "ransomware",
    "vulnerable_allowed_version": "ransomware",
    "external_advisory_match": "ransomware",
    "unsafe_whitelist_entry": "data_handling",
    "expired_exception": "data_handling",
    "missing_control": "data_handling",
    "policy_conflict": "data_handling",
    "exposure_match": "phishing",
}

#: Searched in order against title+description when the type map is not
#: decisive. First hit wins, so the specific precede the general.
_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("ransomware", "ransomware"),
    ("invoice fraud", "bec"),
    ("wire transfer", "bec"),
    ("business email", "bec"),
    ("mfa", "mfa_fatigue"),
    ("push notification", "mfa_fatigue"),
    ("qr", "qr"),
    ("voice", "vishing"),
    ("call", "vishing"),
    ("password", "credential_theft"),
    ("credential", "credential_theft"),
    ("token", "credential_theft"),
    ("insider", "insider"),
    ("exfiltrat", "insider"),
    ("usb", "data_handling"),
    ("share", "data_handling"),
    ("phish", "phishing"),
)

for _topic in list(_RISK_TYPE_TOPIC.values()) + list(_FINDING_TYPE_TOPIC.values()):
    assert _topic in TOPICS, f"topic map names unknown topic {_topic!r}"


def topic_for(kind: str, type_value: str, text: str) -> str:
    """The catalogue topic a finding trains against. Always returns one.

    THE PROSE DECIDES WHEN IT SAYS SOMETHING; the type table is the floor.
    A finding's TYPE is a governance category — `missing_control`,
    `exposure_match` — and every one of the eight is mapped here, so a table
    that ran first would answer every question and the title would never be
    read at all. "MFA push prompts approved repeatedly" is a `missing_control`
    finding and must train mfa_fatigue, not the type's generic data_handling.

    The real defect was never the ordering, it was the MATCHING: the first
    version tested each keyword as a bare substring, so "call" fired inside
    "critically", "voice" inside "invoice", and the two-letter "qr" inside the
    ordinary Azerbaijani words "qrup" and "qrafik" — a finding about password
    reuse trained people about voice phishing while every log said it worked.
    Keywords now match at a word boundary, and the shortest ones only as whole
    words, which is the rule `knowledge.py` already carries for the same
    reason.
    """
    haystack = text.lower()
    words = set(re.findall(r"[^\W_]+", haystack, re.UNICODE))
    for needle, topic in _KEYWORDS:
        if " " in needle:
            # a phrase is specific enough to match anywhere
            if needle in haystack:
                return topic
        elif len(needle) <= 3:
            # "qr", "mfa", "usb" — whole word only. "qr" as a substring hits
            # the ordinary Azerbaijani "qrup" and "qrafik".
            if needle in words:
                return topic
        elif re.search(r"\b" + re.escape(needle), haystack, re.UNICODE):
            # word START, not anywhere: "phish" must still catch "phishing",
            # but "call" must not fire inside "critically" and "voice" must
            # not fire inside "invoice".
            return topic

    # The prose said nothing recognisable — fall to the finding's own type,
    # and only then to the commonest attack. Returning a bare "phishing" here
    # would throw away the one classification a human actually made.
    table = _RISK_TYPE_TOPIC if kind == "incident_risk" else _FINDING_TYPE_TOPIC
    return table.get(type_value) or "phishing"


#: Topic -> the threat_type vocabulary the generation seam already speaks.
#: `MockAIProvider` branches on these five; anything else would silently get
#: the phishing blueprint, so the narrowing is done HERE, visibly.
_TOPIC_THREAT_TYPE: dict[str, str] = {
    "phishing": "phishing",
    "bec": "bec",
    "ransomware": "malware",
    "mfa_fatigue": "phishing",
    "qr": "quishing",
    "vishing": "smishing",
    "credential_theft": "phishing",
    "insider": "bec",
    "data_handling": "phishing",
}


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def matching_module(db: Session, topic: str, text: str) -> models.TrainingModule | None:
    """An APPROVED module whose title/description speaks this topic, or None.

    Word-boundary-free substring match over a small curated set is enough
    here: modules number in the tens, and a false negative merely routes to
    generation + review, which is safe. A model call to rank them would put
    an unauditable choice in front of the human gate.
    """
    needles = {topic.replace("_", " "), topic.split("_")[0]}
    for needle, mapped in _KEYWORDS:
        if mapped == topic:
            needles.add(needle)
    rows = db.scalars(
        select(models.TrainingModule)
        .where(models.TrainingModule.status == models.ModuleStatus.APPROVED)
        .order_by(models.TrainingModule.created_at.desc())
    ).all()
    for module in rows:
        haystack = f"{module.title} {module.description}".lower()
        if any(n in haystack for n in needles):
            return module
    return None


def verified_resources(db: Session, topic: str, limit: int = 4) -> list[models.TrainingResource]:
    """Catalogue rows for the topic that something actually fetched and verified."""
    return list(
        db.scalars(
            select(models.TrainingResource)
            .where(
                models.TrainingResource.topic == topic,
                models.TrainingResource.verified_at.is_not(None),
            )
            .order_by(models.TrainingResource.verified_at.desc())
            .limit(limit)
        )
    )


# ---------------------------------------------------------------------------
# The analysis bridge into the existing generation seam
# ---------------------------------------------------------------------------

async def auto_train(
    db: Session,
    *,
    kind: str,
    ref_id: int,
    title: str,
    description: str,
    severity: str,
    type_value: str,
    required_action: str,
    employee_ids: list[int],
) -> dict[str, Any]:
    """Run the pipeline for one finding; return everything that happened.

    The caller (a router) owns status transitions and the audit row — this
    function decides and creates, it does not narrate to the audit log,
    because the two callers describe themselves differently.
    """
    from ..ai.ai_service import generate_training  # local: avoids a cycle at import
    from .assignment import assign_module_to_employees

    text = f"{title} {description}"
    topic = topic_for(kind, type_value, text)
    resources = verified_resources(db, topic)
    resource_rows = [
        {
            "id": r.id,
            "provider": r.provider,
            "title": r.title,
            "url": r.url,
            "duration_seconds": r.duration_seconds,
        }
        for r in resources
    ]

    ref_label = "Policy finding" if kind == "policy_finding" else "Incident risk"
    module = matching_module(db, topic, text)
    if module is not None:
        assigned, skipped = assign_module_to_employees(
            db, module, employee_ids, f"{ref_label} #{ref_id}: {title}"
        )
        return {
            "path": "assigned",
            "topic": topic,
            "module": module,
            "generation_source": module.generation_source,
            "assigned": assigned,
            "skipped": skipped,
            "resources": resource_rows,
            "note": (
                f"An approved module matched topic '{topic}' and was assigned directly — "
                f"it already passed a human. {len(resources)} verified external "
                f"resource(s) are attached as supporting material."
            ),
        }

    analysis = analysis_for_generation(
        topic=topic,
        title=title,
        description=description,
        severity=severity,
        required_action=required_action,
    )
    training, generation_source = await generate_training(analysis)
    generated = models.TrainingModule(
        threat_id=None,
        title=training["title"],
        description=training["description"],
        content=training["content"],
        quiz=training["quiz"],
        takeaway=training["takeaway"],
        channel=training.get("channel", "email"),
        est_minutes=training.get("est_minutes", 3),
        ai_generated=True,
        generation_source=generation_source,
        status=models.ModuleStatus.PENDING_REVIEW,
        origin={"kind": kind, "id": ref_id, "employee_ids": employee_ids},
    )
    db.add(generated)
    db.flush()
    return {
        "path": "generated_awaiting_approval",
        "topic": topic,
        "module": generated,
        "generation_source": generation_source,
        "assigned": [],
        "skipped": [],
        "resources": resource_rows,
        "note": (
            f"No approved module matched topic '{topic}', so one was generated "
            f"({'live model' if generation_source == 'anthropic' else 'offline template'}) "
            f"and queued for human review. Nothing reaches an employee until a named "
            f"person approves it — approval will complete the assignment automatically."
        ),
    }


def analysis_for_generation(
    *, topic: str, title: str, description: str, severity: str, required_action: str
) -> dict[str, Any]:
    """A finding, phrased in the vocabulary `generate_training` already takes.

    The generation seam's input contract is a threat-analysis dict
    (orchestrator builds it from a sandbox verdict). A GRC finding has no
    IOCs and no artifact — those fields are filled with honest statements of
    that fact rather than invented specimens.
    """
    return {
        "threat_type": _TOPIC_THREAT_TYPE.get(topic, "phishing"),
        "verdict": severity,
        "iocs": [],
        "behavior_summary": (
            f"{title}. {description} "
            f"Required action on record: {required_action or 'none stated'}."
        ),
        "artifact_excerpt": "No artifact: this training was raised from a governance finding, not a sample.",
    }
