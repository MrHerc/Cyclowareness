"""The trigger boundary: one schema, two adapters.

Build the CONTRACT, not ten integrations — the same move `sandbox/native.py`
already makes for detonation. Everything that can cause a remediation arrives as
a `RiskSignal`, and the two adapters here cover the two sources this product
already produces internally: simulation outcomes and sandbox verdicts.

A third source is a third adapter and no change anywhere else. That is the point.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .models import TriggerKind

#: Code-derived urgency, per trigger. THE MODEL NEVER SETS THIS — it may only
#: de-escalate it (firewall R8), because urgency decides whether a person is
#: pinged at 23:40 and that is a lever an attacker wants.
URGENCY_BY_TRIGGER: dict[str, str] = {
    TriggerKind.SIMULATION_SUBMITTED: "immediate",   # credentials were entered
    TriggerKind.SANDBOX_MALICIOUS: "prompt",
    TriggerKind.SIMULATION_CLICKED: "prompt",
    TriggerKind.INCIDENT_FINDING: "prompt",
    TriggerKind.SANDBOX_SUSPICIOUS: "routine",
    TriggerKind.POLICY_FINDING: "routine",
    #: Reporting a real threat is GOOD behaviour. It earns acknowledgement, never
    #: an urgent remediation — a product that pings people for reporting teaches
    #: them to stop reporting.
    TriggerKind.REAL_THREAT_REPORTED: "routine",
}

#: The behaviour taxonomy Tier 1 needs: enough to retrieve against, no more. The
#: full Human Risk Behaviour taxonomy is Tier 2 work; inventing half of it now
#: would mean re-tagging every asset later.
class Behaviour:
    CLICKED_LINK = "clicked_link"
    SUBMITTED_CREDENTIALS = "submitted_credentials"
    OPENED_ATTACHMENT = "opened_attachment"
    ENABLED_MACROS = "enabled_macros"
    APPROVED_PAYMENT_CHANGE = "approved_payment_change"
    REPORTED_THREAT = "reported_threat"
    UNKNOWN = "unknown"


@dataclass
class RiskSignal:
    """The one shape every trigger arrives in.

    `evidence` is for the AUDIT TRAIL and is never sent to a model — see §7.6.
    Credentials, including hashes, never enter a prompt; neither does anything
    an attacker wrote, which is the whole lure body.
    """

    trigger_kind: str
    trigger_ref: str
    employee_id: int
    behaviour: str = Behaviour.UNKNOWN
    evidence: dict[str, Any] = field(default_factory=dict)

    @property
    def urgency(self) -> str:
        """Derived here, in code, from the trigger alone."""
        return URGENCY_BY_TRIGGER.get(self.trigger_kind, "routine")


def from_simulation_target(target) -> RiskSignal | None:
    """A simulation outcome becomes a signal — or does not.

    `ignored` produces nothing on purpose. Not opening a simulated phish is the
    correct outcome; remediating it would train people that the safe action
    still earns homework.
    """
    outcome = getattr(target, "outcome", None)
    if outcome == "clicked":
        kind, behaviour = TriggerKind.SIMULATION_CLICKED, Behaviour.CLICKED_LINK
    elif outcome == "submitted":
        kind, behaviour = TriggerKind.SIMULATION_SUBMITTED, Behaviour.SUBMITTED_CREDENTIALS
    elif outcome == "reported":
        kind, behaviour = TriggerKind.REAL_THREAT_REPORTED, Behaviour.REPORTED_THREAT
    else:
        return None

    return RiskSignal(
        trigger_kind=kind,
        trigger_ref=f"simulation_target:{target.id}",
        employee_id=target.employee_id,
        behaviour=behaviour,
        evidence={
            "simulation_id": getattr(target, "simulation_id", None),
            "outcome_at": str(getattr(target, "outcome_at", "") or ""),
        },
    )


def from_sandbox_job(job, employee_id: int) -> RiskSignal | None:
    """A sandbox verdict becomes a signal for the person who received the file.

    Only `malicious` and `suspicious` produce one. A clean verdict is the
    system working, and a remediation for it would be a remediation for having
    been sent an email.

    The lure's own text is NOT carried. `trigger_detail` gets the engine's
    structured verdict — attacker-controlled prose is exactly what the firewall
    exists to keep out of a learner's screen, and the cheapest place to keep it
    out is to never load it.
    """
    verdict = (getattr(job, "verdict", None) or {}).get("verdict")
    if verdict == "malicious":
        kind = TriggerKind.SANDBOX_MALICIOUS
    elif verdict == "suspicious":
        kind = TriggerKind.SANDBOX_SUSPICIOUS
    else:
        return None

    family = getattr(job, "family", "") or ""
    behaviour = {
        "office": Behaviour.ENABLED_MACROS,
        "pe": Behaviour.OPENED_ATTACHMENT,
        "script": Behaviour.OPENED_ATTACHMENT,
        "pdf": Behaviour.CLICKED_LINK,
    }.get(family, Behaviour.UNKNOWN)

    return RiskSignal(
        trigger_kind=kind,
        trigger_ref=f"sandbox_job:{job.id}",
        employee_id=employee_id,
        behaviour=behaviour,
        evidence={
            "sha256": getattr(job, "sha256", ""),
            "family": family,
            "threat_name": (getattr(job, "verdict", None) or {}).get("threat_name"),
            "final_score": getattr(job, "final_score", None),
        },
    )
