"""The remediation record.

`RemediationPlan` is deliberately the first thing built. It is simultaneously
the demo screen, the audit answer, the works-council answer, and the schema
everything else hangs off — the highest value-to-cost item in the feature.

Two records beside it matter as much as the plans do:

* `CoverageGap` — "we looked at the catalogue and nothing covers this." A
  first-class, valuable RESULT rather than a failure. It is the sandbox's
  `ran=False` / `unavailable_reason` discipline moved one layer up, and the
  accumulated rows are a content roadmap.
* `ControlGapFinding` — "the person is not the vulnerability here." MFA
  push-bombing is answered by number-matching, not by a module. An engine that
  can only produce training WILL produce training, so it must be able to say
  the fix is a control.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from ..models import utcnow


class TriggerKind:
    """What caused a plan. The code derives urgency from this, never the model."""

    SIMULATION_CLICKED = "simulation_clicked"
    SIMULATION_SUBMITTED = "simulation_submitted"   # credentials entered — the worst outcome
    SANDBOX_MALICIOUS = "sandbox_malicious"
    SANDBOX_SUSPICIOUS = "sandbox_suspicious"
    REAL_THREAT_REPORTED = "real_threat_reported"
    INCIDENT_FINDING = "incident_finding"
    POLICY_FINDING = "policy_finding"


class PlanStatus:
    #: Built, firewalled, waiting for a human. Nothing has reached anyone.
    PROPOSED = "proposed"
    APPROVED = "approved"
    REJECTED = "rejected"
    #: The plan was never built: the firewall refused it, or nothing covered it.
    BLOCKED = "blocked"
    DELIVERED = "delivered"


class SourceKind:
    INTERNAL = "internal"       # the company's own material — the preferred answer
    EXTERNAL = "external"       # curated, link-only
    GENERATED = "generated"     # AI-written — the exception, not the default
    NONE = "none"               # nothing covered it; see CoverageGap


class RemediationPlan(Base):
    """One decision: this person, this trigger, this material — or none of it."""

    __tablename__ = "remediation_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # --- what caused it -------------------------------------------------------
    trigger_kind: Mapped[str] = mapped_column(String(40), index=True)
    #: The originating record, as `<kind>:<id>` — "sandbox_job:41", not a foreign
    #: key. A plan may be raised by any of several tables, and a nullable FK per
    #: source is a schema that grows a column per integration.
    trigger_ref: Mapped[str] = mapped_column(String(120), default="", index=True)
    #: Verbatim from the signal, for the audit trail. Never sent to a model.
    trigger_detail: Mapped[dict] = mapped_column(JSON, default=dict)

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)

    # --- what was decided -----------------------------------------------------
    status: Mapped[str] = mapped_column(String(20), default=PlanStatus.PROPOSED, index=True)
    source_kind: Mapped[str] = mapped_column(String(20), default=SourceKind.NONE)
    #: The catalogue row that was chosen, when one was.
    asset_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    #: The firewalled, learner-facing payload. Nothing outside this is rendered.
    framing: Mapped[dict] = mapped_column(JSON, default=dict)
    assessment: Mapped[dict] = mapped_column(JSON, default=dict)
    #: Analyst-facing: why this, what came second, what was rejected and why.
    decision: Mapped[dict] = mapped_column(JSON, default=dict)

    #: Code-derived from `trigger_kind`. The model may only lower it (R8).
    urgency: Mapped[str] = mapped_column(String(16), default="routine")

    # --- what the machine did and did not do ---------------------------------
    #: THE FIELD A SECURITY BUYER LOOKS FOR WITHOUT BEING TOLD TO. False means no
    #: model was involved at all — retrieval alone chose this — and the UI must
    #: say so rather than letting a template read as AI.
    ai_ran: Mapped[bool] = mapped_column(Boolean, default=False)
    #: Why nothing was attached, in a sentence a human can act on. Populated for
    #: every outcome that is not a delivered plan; empty otherwise.
    not_attached_reason: Mapped[str] = mapped_column(Text, default="")
    #: Every clamp the firewall applied, and the rule that applied it.
    validator_adjustments: Mapped[list] = mapped_column(JSON, default=list)
    #: Set when the firewall REJECTED: the machine-readable code, which is what
    #: gets counted. A spike is intelligence, not noise.
    rejection_code: Mapped[str] = mapped_column(String(60), default="", index=True)

    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- privacy --------------------------------------------------------------
    #: DEFAULT FALSE, AND THAT IS THE PRODUCT DECISION, not an oversight. A
    #: remediation plan is evidence that a named person failed a security test.
    #: Defaulting it visible to their line manager turns an awareness tool into a
    #: performance-management one, which is the single fastest way to lose a
    #: works council — and to teach employees not to report anything.
    manager_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    #: What the learner is told, verbatim, at the top of their own plan. Stored
    #: rather than rendered from a template so that what a person was told
    #: remains recoverable after the template changes.
    learner_disclosure: Mapped[str] = mapped_column(Text, default="")

    # --- the right of appeal -------------------------------------------------
    #: THE LEARNER DISCLOSURE PROMISES THIS. It says "use Dispute — that goes to
    #: a person, not to a system", and for a while it said that with nothing
    #: behind it: no endpoint, no button, no route. A product that tells someone
    #: they may contest an automated decision about them, and then provides no
    #: way to, has told them something worse than nothing.
    #:
    #: It is also the answer to the obvious question from a works council, and to
    #: GDPR Article 22's right to contest a decision taken about you by a machine.
    disputed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    #: The learner's own words. Shown to the analyst verbatim.
    dispute_note: Mapped[str] = mapped_column(Text, default="")
    #: What a human decided, and who. Empty while the dispute is open — which is
    #: itself the state the queue must surface.
    dispute_resolution: Mapped[str] = mapped_column(Text, default="")
    dispute_resolved_by: Mapped[str] = mapped_column(String(255), default="")
    dispute_resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    approved_by: Mapped[str] = mapped_column(String(255), default="")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class CoverageGap(Base):
    """Nothing in the catalogue covered this behaviour.

    A RESULT, not an error. Accumulated rows are the content roadmap: they say
    exactly what the library is missing, ranked by how often it was needed.
    """

    __tablename__ = "remediation_coverage_gaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    behaviour: Mapped[str] = mapped_column(String(80), index=True)
    trigger_kind: Mapped[str] = mapped_column(String(40), index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    #: How many times this same gap has been hit. Ranking a roadmap by frequency
    #: is the whole reason to store a count rather than a row per occurrence.
    times_hit: Mapped[int] = mapped_column(Integer, default=1)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class ControlGapFinding(Base):
    """The person is not the vulnerability here — the control is missing.

    MFA push-bombing is answered by number-matching, not by a module. Recording
    this instead of assigning training is what stops the product from training
    people out of a problem that training cannot fix.
    """

    __tablename__ = "remediation_control_gaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trigger_kind: Mapped[str] = mapped_column(String(40), index=True)
    trigger_ref: Mapped[str] = mapped_column(String(120), default="")
    #: The control that would actually remove the exposure, in plain language.
    recommended_control: Mapped[str] = mapped_column(Text)
    rationale: Mapped[str] = mapped_column(Text, default="")
    #: Deliberately not an employee id. The finding is about the estate.
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
