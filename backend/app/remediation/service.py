"""The decision: retrieval first, the model second, the firewall last.

RETRIEVAL COMES FIRST AND IT IS DETERMINISTIC. The model does not search, does
not choose freely and never sees the catalogue as prose. Code selects the
candidates by behaviour tag, hands the model an opaque token per candidate, and
the model's only job is to choose among them and write the framing. That is what
makes R1 enforceable at all: "a member of the set retrieval just offered" is
only meaningful if code owned the offering.

Three outcomes, all first-class:

* a plan built from a catalogue asset;
* a `CoverageGap` — nothing covered this, which is a RESULT and a content
  roadmap, not a failure;
* a `ControlGapFinding` — the person is not the vulnerability here.

Everything a learner will see passes the firewall before it is persisted. A plan
that fails is stored as BLOCKED with its rejection code, because a rejection is
a security metric worth counting, not an error to swallow.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Employee
from . import firewall
from .catalogue import Candidate, candidates_for
from .models import (
    ControlGapFinding,
    CoverageGap,
    PlanStatus,
    RemediationPlan,
    SourceKind,
)
from .triggers import Behaviour, RiskSignal

#: Behaviours where training is the wrong answer, and the control is the answer.
#: An engine that can only produce training WILL produce training; this is what
#: lets it say "the person is not the vulnerability here".
CONTROL_ANSWERS: dict[str, tuple[str, str]] = {
    "mfa_push_bombing": (
        "Enable number matching on the MFA provider",
        "Repeated push prompts are answered by number matching, not by teaching people "
        "to be more careful about which prompt they approve at 03:00.",
    ),
}

#: Said to the learner, verbatim, at the top of their own plan. Stored on the
#: row rather than rendered from a template, so what a person was actually told
#: stays recoverable after the template changes.
LEARNER_DISCLOSURE = (
    "This was assigned automatically because of a specific event, which is named "
    "above. It is visible to you and to the security team. It does not go to your "
    "manager, and it does not affect any performance review. If you think it was "
    "assigned in error, use Dispute — that goes to a person, not to a system."
)


def _disclosure(manager_visible: bool) -> str:
    """The disclosure has to match the actual setting, not the default.

    A stored sentence saying "this does not go to your manager" on a deployment
    that turned manager visibility on would be the product lying to the person
    it is measuring — worse than having no disclosure at all.
    """
    if not manager_visible:
        return LEARNER_DISCLOSURE
    return LEARNER_DISCLOSURE.replace(
        "It does not go to your manager, and it does not affect any performance review.",
        "This deployment has been configured so that your line manager can also see it. "
        "It does not affect any performance review.",
    )


def plan_for(
    db: Session,
    signal: RiskSignal,
    *,
    model_output: dict[str, Any] | None = None,
    manager_visible: bool = False,
) -> RemediationPlan | ControlGapFinding | CoverageGap:
    """Decide once, and persist whichever of the three outcomes is true.

    `model_output` is injected rather than fetched here so the decision is
    testable without a model, and so the caller — not this function — owns
    whether a model was consulted at all. `ai_ran` records which happened.
    """
    # 1. Is a person even the right thing to change? Checked FIRST, so a control
    #    gap can never be answered with a module by accident.
    if signal.behaviour in CONTROL_ANSWERS:
        control, rationale = CONTROL_ANSWERS[signal.behaviour]
        employee = db.get(Employee, signal.employee_id)
        finding = ControlGapFinding(
            trigger_kind=signal.trigger_kind,
            trigger_ref=signal.trigger_ref,
            recommended_control=control,
            rationale=rationale,
            department_id=employee.department_id if employee else None,
        )
        db.add(finding)
        return finding

    # 2. Retrieval. Deterministic, code-owned, before any model is consulted.
    offered = candidates_for(signal.behaviour)
    if not offered:
        return _record_gap(db, signal)

    issued = {c.token: c.source_kind for c in offered}

    # 3. No model configured: retrieval alone decides, and the row says so.
    if model_output is None:
        return _plan_from_candidate(
            db, signal, offered[0], ai_ran=False, manager_visible=manager_visible
        )

    # 4. A model chose. Everything it wrote goes through the firewall first.
    try:
        result = firewall.enforce(
            model_output,
            issued_tokens=issued,
            code_urgency=signal.urgency,
            learner_first_name=_first_name(db, signal.employee_id),
            known_first_names=_roster_first_names(db),
        )
    except firewall.PlanRejected as rejected:
        blocked = RemediationPlan(
            trigger_kind=signal.trigger_kind,
            trigger_ref=signal.trigger_ref,
            trigger_detail=signal.evidence,
            employee_id=signal.employee_id,
            status=PlanStatus.BLOCKED,
            source_kind=SourceKind.NONE,
            urgency=signal.urgency,
            ai_ran=True,
            rejection_code=rejected.code,
            not_attached_reason=(
                f"The generated plan was refused by the output firewall "
                f"({rejected.code}) and nothing was delivered. {rejected.detail}"
            ),
            manager_visible=manager_visible,
            learner_disclosure="",
        )
        db.add(blocked)
        return blocked

    chosen_token = (result.plan.get("decision") or {}).get("selected_candidate")
    chosen = next((c for c in offered if c.token == chosen_token), None)
    if chosen is None:
        # The model declined to choose. That is allowed, and it is a gap.
        return _record_gap(db, signal, detail=(result.plan.get("coverage_gap") or ""))

    plan = _plan_from_candidate(
        db, signal, chosen, ai_ran=True, manager_visible=manager_visible, commit=False
    )
    plan.framing = result.plan.get("framing") or {}
    plan.assessment = result.plan.get("assessment") or {}
    plan.decision = result.plan.get("decision") or {}
    plan.validator_adjustments = result.adjustments
    plan.confidence = result.plan.get("confidence")
    plan.urgency = (result.plan.get("delivery") or {}).get("urgency_hint") or signal.urgency
    db.add(plan)
    return plan


def _plan_from_candidate(
    db: Session,
    signal: RiskSignal,
    candidate: Candidate,
    *,
    ai_ran: bool,
    manager_visible: bool,
    commit: bool = True,
) -> RemediationPlan:
    plan = RemediationPlan(
        trigger_kind=signal.trigger_kind,
        trigger_ref=signal.trigger_ref,
        trigger_detail=signal.evidence,
        employee_id=signal.employee_id,
        status=PlanStatus.PROPOSED,
        source_kind=candidate.source_kind,
        asset_id=candidate.asset_id,
        framing=dict(candidate.default_framing),
        assessment={"quiz_ref": candidate.quiz_ref} if candidate.quiz_ref else {},
        decision={
            "selected_candidate": candidate.token,
            "source_kind": candidate.source_kind,
            # Said in the words the product is allowed to use: this was a tag
            # match against the library, so it is "matched from your library",
            # never "AI-curated".
            "rationale": (
                f"Matched from your library on the behaviour tag "
                f"{signal.behaviour!r}. No model was involved in the choice."
                if not ai_ran
                else f"Selected by the model from {signal.behaviour!r} candidates."
            ),
            "runner_up": None,
            "rejected": [],
        },
        urgency=signal.urgency,
        ai_ran=ai_ran,
        not_attached_reason="",
        manager_visible=manager_visible,
        learner_disclosure=_disclosure(manager_visible),
    )
    if commit:
        db.add(plan)
    return plan


def _record_gap(db: Session, signal: RiskSignal, detail: str = "") -> CoverageGap:
    """A gap is a result. Counted, not logged and forgotten."""
    existing = db.execute(
        select(CoverageGap).where(
            CoverageGap.behaviour == signal.behaviour,
            CoverageGap.trigger_kind == signal.trigger_kind,
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.times_hit += 1
        existing.last_seen_at = datetime.now(timezone.utc)
        db.add(existing)
        return existing

    gap = CoverageGap(
        behaviour=signal.behaviour,
        trigger_kind=signal.trigger_kind,
        detail=detail or (
            "Nothing in the catalogue is tagged for this behaviour, so no training "
            "was attached. This is a gap in the library, not a clean result."
        ),
    )
    db.add(gap)
    return gap


def _first_name(db: Session, employee_id: int) -> str:
    employee = db.get(Employee, employee_id)
    return (employee.name.split()[0] if employee and employee.name else "")


def _roster_first_names(db: Session) -> frozenset[str]:
    """Matched against the real roster, never guessed from capitalisation.

    A heuristic rejects "Review the Finance approval process" and lets an
    unusual real name through — precisely backwards.
    """
    names = db.execute(select(Employee.name)).scalars().all()
    return frozenset(n.split()[0].lower() for n in names if n)
