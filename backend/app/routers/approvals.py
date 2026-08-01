"""Approvals API — a queue view over the loop's human gate.

This is the control the product's whole claim rests on: no AI-generated module
reaches a named employee until a person says so. That state machine already
exists in ``routers/loop_runs.py`` and ``core/orchestrator.py``, and this module
does not own a second copy of it. ``approve`` and ``reject`` call straight
through to the existing handlers — including their 404 and 409 checks — so
there is exactly one place where a run leaves the gate.

What is genuinely new here:

**``request_revision``.** It records the analyst's objection and deliberately
does not move the run. The module stays ``pending_review``, the run stays
``awaiting_approval``, and nothing is written to ``stage_history`` — that list
is a record of loop *stages*, and an entry that is not a stage would be read as
one by everything that walks it.

**Two-person approval, backed by the audit trail rather than a new table.**
``require_second_approval`` records an endorsement and holds the run at the
gate. Completing the approval then requires a *different* actor: the audit log
already stores who endorsed and when, so the rule is enforced against recorded
fact, not against a flag somebody could pass again themselves.

**A safety panel that admits what it did not check.** Three checks actually run
against the module. One cannot run in this deployment, and it is reported as
not run — ``checked=False``, ``passed=None`` — rather than as a pass. On the one
screen where an analyst puts their name to a decision, "we did not look" must
not render as "we looked and found nothing".
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..database import get_db
from ..models import LoopRun, LoopStatus, Threat, TrainingModule, User
from ..platform.models import AuditEvent, record
from ..schemas import (
    ApprovalDecisionRequest,
    ApprovalDecisionResult,
    ApprovalDetail,
    ApprovalHistoryEntry,
    ApprovalQueue,
    ApprovalQueueItem,
    ProposedTarget,
    SafetyCheck,
    SafetyStatus,
    ThreatOut,
    TrainingModuleOut,
)
from ..security import require_analyst, require_analyst_or_exec
from . import loop_runs

# Imported rather than reimplemented: this is the same validator the module
# editor enforces, so a module cleared here cannot be one the quiz grader will
# later refuse to score. A second copy of the rule would drift from it.
from .training import _validate_quiz_shape

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

MAX_LIMIT = 100

#: Everything this module writes to the trail. The prefix is what
#: ``GET /{run_id}/history`` selects on, so approval history and the rest of the
#: loop's audit entries stay distinguishable without a second table.
ACTION_ENDORSE = "approval.endorse"
ACTION_APPROVE = "approval.approve"
ACTION_REJECT = "approval.reject"
ACTION_REVISION = "approval.request_revision"

DECISIONS = ("approve", "reject", "request_revision")

#: How much of an attacker-authored artifact the review screen carries. Bounded
#: because the excerpt exists for a human to read, not for completeness.
ARTIFACT_EXCERPT_CHARS = 4000


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _request_context(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": (request.headers.get("user-agent") or "")[:255] or None,
    }


def _run_or_404(db: Session, run_id: int) -> LoopRun:
    run = db.get(LoopRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Loop run not found")
    return run


def _waiting_seconds(run: LoopRun) -> int:
    created = run.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return max(0, int((_now() - created).total_seconds()))


def _severity_of(threat: Threat | None) -> tuple[str, str]:
    """Derive a queue severity, and say in words where it came from.

    A ``Threat`` carries a verdict and an analyzer confidence; it has no
    severity column, and inventing one silently would put a label on the triage
    screen that no analyzer ever asserted. The basis string travels with the
    label everywhere it is shown.
    """
    if threat is None or not threat.verdict:
        return "unknown", "The artifact has no recorded verdict; the ANALYZE stage did not complete."
    confidence = threat.confidence
    confident = confidence is not None and confidence >= 0.85
    if threat.verdict == "malicious":
        severity = "critical" if confident else "high"
    elif threat.verdict == "suspicious":
        severity = "high" if confident else "medium"
    else:
        severity = "low"
    basis = (
        f'Derived from verdict "{threat.verdict}"'
        + (f" at {confidence:.0%} analyzer confidence." if confidence is not None else " (no confidence recorded).")
    )
    return severity, basis


def _generation_label(module: TrainingModule | None) -> str:
    """Name the engine that wrote the module. Never inferred from ``ai_generated``."""
    if module is None:
        return "No module generated"
    if module.generation_source == "anthropic":
        return "Written by Claude"
    if module.generation_source == "mock":
        return "Written by the offline generator (not a live model)"
    if module.ai_generated:
        return "Marked AI-generated, but no engine was recorded"
    return "Human-authored"


def _module_text(module: TrainingModule) -> str:
    """Every string an employee would actually read, concatenated for scanning."""
    parts = [module.title or "", module.description or "", module.takeaway or ""]
    for section in module.content or []:
        if isinstance(section, dict):
            parts.append(str(section.get("heading", "")))
            parts.append(str(section.get("body", "")))
    for question in module.quiz or []:
        if isinstance(question, dict):
            parts.append(str(question.get("question", "")))
            parts.extend(str(o) for o in (question.get("options") or []))
            parts.append(str(question.get("explanation", "")))
    return "\n".join(parts)


def _safety_status(threat: Threat | None, module: TrainingModule | None) -> SafetyStatus:
    """What was checked before this module could be put in front of people.

    Deliberately small, and deliberately honest about its edges. The last entry
    is the one that matters most: this build has no markup sanitiser for lesson
    bodies, and saying so is the only accurate thing to report.
    """
    checks: list[SafetyCheck] = []

    if module is None:
        return SafetyStatus(
            checks=[],
            checks_run=0,
            checks_not_run=0,
            failed=0,
            summary="This run has no training module, so there was nothing to check.",
        )

    # 1. Quiz shape — the same validator the module editor enforces, so a module
    #    approved here cannot be one the grader will refuse to score later.
    try:
        _validate_quiz_shape(module.quiz or [])
        checks.append(
            SafetyCheck(
                check="quiz_shape",
                checked=True,
                passed=True,
                detail=f"{len(module.quiz or [])} questions, each with 4 options and a valid answer key.",
            )
        )
    except HTTPException as exc:
        checks.append(
            SafetyCheck(
                check="quiz_shape",
                checked=True,
                passed=False,
                detail=(
                    f"{exc.detail} An assignment carrying this quiz cannot be completed."
                ),
            )
        )

    # 2. Provenance — the engine has to be on the record, not deduced from the
    #    fact that content exists.
    if module.generation_source in ("anthropic", "mock"):
        passed, detail = True, f'Recorded as "{module.generation_source}". {_generation_label(module)}.'
    elif module.ai_generated:
        passed, detail = False, (
            "The module is flagged AI-generated but no engine was recorded, so the UI cannot "
            "tell a reader whether a live model or the offline generator wrote it."
        )
    else:
        passed, detail = True, "No AI provenance recorded, and none claimed: human-authored."
    checks.append(
        SafetyCheck(check="module_provenance", checked=True, passed=passed, detail=detail)
    )

    # 3. Live attacker URLs in the lesson body. A module built from a phish can
    #    legitimately *name* the lookalike domain — that is the teaching point —
    #    but reproducing the full URL hands every reader a working link to the
    #    credential-harvesting page the module is warning them about.
    urls = [u for u in ((threat.iocs or {}).get("urls") or []) if isinstance(u, str)] if threat else []
    if threat is None:
        checks.append(
            SafetyCheck(
                check="no_live_artifact_urls",
                checked=False,
                passed=None,
                detail="The run has no threat attached, so there were no known URLs to scan for.",
            )
        )
    else:
        text = _module_text(module)
        found = [u for u in urls if u and u in text]
        checks.append(
            SafetyCheck(
                check="no_live_artifact_urls",
                checked=True,
                passed=not found,
                detail=(
                    "No URL from the artifact's IOCs appears verbatim in the lesson text."
                    if not found
                    else (
                        "The lesson text reproduces "
                        + ", ".join(found[:3])
                        + " verbatim. Defang it before approving — a reader clicks what they see."
                    )
                )
                + (
                    ""
                    if urls
                    else " (The analyzer recorded no URLs for this artifact, so this check had nothing to look for.)"
                ),
            )
        )

    # 4. The one that cannot run here.
    checks.append(
        SafetyCheck(
            check="content_markup_sanitisation",
            checked=False,
            passed=None,
            detail=(
                "This deployment has no markup sanitiser for lesson bodies. Nothing has "
                "inspected this content for embedded HTML or script. The current UI renders "
                "module text as plain text, but that is a property of the client, not a check "
                "performed here."
            ),
        )
    )

    run = [c for c in checks if c.checked]
    not_run = [c for c in checks if not c.checked]
    failed = [c for c in run if c.passed is False]
    if failed:
        summary = f"{len(failed)} of {len(run)} checks that ran did not pass."
    elif not_run:
        summary = (
            f"{len(run)} checks passed. {len(not_run)} could not run — this is not a clean "
            "bill of health for what they cover."
        )
    else:
        summary = f"All {len(run)} checks passed."
    return SafetyStatus(
        checks=checks,
        checks_run=len(run),
        checks_not_run=len(not_run),
        failed=len(failed),
        summary=summary,
    )


def _endorsements(db: Session, run_id: int) -> list[AuditEvent]:
    """Prior held approvals for this run, oldest first.

    The audit trail is the storage for the two-person rule. It already records
    actor, time and comment for every decision, and a second table holding the
    same three facts would be a second thing to keep true.
    """
    return list(
        db.execute(
            select(AuditEvent)
            .where(
                AuditEvent.object_type == "loop_run",
                AuditEvent.object_id == run_id,
                AuditEvent.action == ACTION_ENDORSE,
            )
            .order_by(AuditEvent.at.asc(), AuditEvent.id.asc())
        ).scalars()
    )


def _second_approval_state(endorsements: list[AuditEvent]) -> dict:
    return {
        "held": bool(endorsements),
        "endorsed_by": [e.actor_email for e in endorsements],
        "endorsed_at": [e.at.isoformat() for e in endorsements],
        "note": (
            "Held at the gate for a second approver. The loop has not advanced."
            if endorsements
            else "No second approval has been requested for this run."
        ),
    }


# --- The queue ---------------------------------------------------------------


@router.get("", response_model=ApprovalQueue)
def approval_queue(
    verdict: str | None = None,
    threat_type: str | None = None,
    generation_source: str | None = None,
    q: str | None = None,
    sort: str = Query(default="longest_wait", pattern="^(longest_wait|shortest_wait)$"),
    limit: int = Query(default=25, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Everything waiting on a human, longest wait first by default.

    There is no ``severity`` filter, on purpose. Severity is derived here from
    the verdict and the analyzer's confidence — it is not stored — so a filter
    over it would be a filter over a label this module invented, and the page
    count would quietly disagree with the query that produced it. Filter on
    ``verdict``, which is what the analyzer actually recorded, and read severity
    off the row.
    """
    filters = [LoopRun.status == LoopStatus.AWAITING_APPROVAL]
    if verdict:
        filters.append(Threat.verdict == verdict)
    if threat_type:
        filters.append(Threat.threat_type == threat_type)
    if generation_source is not None:
        # Explicitly comparable to "" so a caller can ask for modules with no
        # engine on record — the population most worth looking at.
        filters.append(TrainingModule.generation_source == generation_source)
    if q:
        needle = f"%{q.strip()}%"
        filters.append(or_(Threat.title.ilike(needle), TrainingModule.title.ilike(needle)))

    def joined(stmt):
        return (
            stmt.join(Threat, Threat.id == LoopRun.trigger_threat_id)
            .outerjoin(TrainingModule, TrainingModule.id == LoopRun.training_module_id)
            .where(*filters)
        )

    total = db.execute(joined(select(func.count(LoopRun.id)))).scalar_one()
    order = LoopRun.created_at.asc() if sort == "longest_wait" else LoopRun.created_at.desc()
    runs = db.execute(
        joined(select(LoopRun)).order_by(order, LoopRun.id.asc()).offset(offset).limit(limit)
    ).scalars().all()

    endorsed: dict[int, str] = {}
    if runs:
        rows = db.execute(
            select(AuditEvent.object_id, AuditEvent.actor_email)
            .where(
                AuditEvent.object_type == "loop_run",
                AuditEvent.action == ACTION_ENDORSE,
                AuditEvent.object_id.in_([r.id for r in runs]),
            )
            .order_by(AuditEvent.at.asc())
        ).all()
        for run_id, actor in rows:
            endorsed[run_id] = actor

    items = []
    for run in runs:
        threat = run.threat
        module = run.training_module
        severity, basis = _severity_of(threat)
        # Targeting is computed for the returned page only: select_targets runs
        # several queries per call, and the queue exists to be scanned quickly.
        targets = risk_engine.select_targets(
            db,
            threat_type=threat.threat_type if threat else None,
            artifact_meta=(threat.artifact_meta or {}) if threat else {},
            reporter_id=threat.reported_by_employee_id if threat else None,
        )
        items.append(
            ApprovalQueueItem(
                run_id=run.id,
                created_at=run.created_at,
                waiting_seconds=_waiting_seconds(run),
                threat_id=run.trigger_threat_id,
                threat_title=(threat.title if threat else "") or "Untitled artifact",
                threat_type=threat.threat_type if threat else None,
                threat_verdict=threat.verdict if threat else None,
                threat_confidence=threat.confidence if threat else None,
                severity=severity,
                severity_basis=basis,
                module_id=module.id if module else None,
                module_title=module.title if module else "",
                quiz_questions=len(module.quiz or []) if module else 0,
                est_minutes=module.est_minutes if module else None,
                ai_generated=bool(module.ai_generated) if module else False,
                generation_source=module.generation_source if module else "",
                generation_label=_generation_label(module),
                proposed_target_count=len(targets),
                awaiting_second_approval=run.id in endorsed,
                endorsed_by=endorsed.get(run.id),
            )
        )

    return ApprovalQueue(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(items) < total,
    )


# --- The review workspace ------------------------------------------------------


@router.get("/{run_id}", response_model=ApprovalDetail)
def approval_detail(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Everything needed to decide, on one screen.

    Readable after the gate has been passed as well — ``awaiting_approval``
    says which it is. A workspace that 409s the moment somebody else approves
    would lose the analyst the record of what they were looking at.

    The quiz comes back **with** its answer key, unlike the employee-facing
    assignment view: a reviewer who cannot see which answer is marked correct
    cannot review the quiz.
    """
    run = _run_or_404(db, run_id)
    threat = run.threat
    module = run.training_module

    artifact = (threat.artifact_ref or "") if threat else ""
    severity, basis = _severity_of(threat)

    analysis: dict = {}
    analysis_note = ""
    if threat is None:
        analysis_note = "This run has no threat attached — nothing was analysed."
    elif not threat.verdict:
        analysis_note = (
            "The ANALYZE stage has not recorded a verdict for this artifact. This is not a "
            "clean result: nothing has been concluded about it."
        )
    else:
        analysis = {
            "verdict": threat.verdict,
            "confidence": threat.confidence,
            "threat_type": threat.threat_type,
            "iocs": threat.iocs or {},
            "behavior_summary": threat.behavior_summary,
            "engine_report": threat.analysis_result,
            "plain_language_explanation": threat.explanation,
        }
        if threat.analysis_result is None:
            analysis_note = "The analyzer recorded a verdict but returned no raw report."

    targets = []
    targeting_note = ""
    if threat is None:
        targeting_note = "No threat on this run, so no audience could be proposed."
    else:
        raw = risk_engine.select_targets(
            db,
            threat_type=threat.threat_type,
            artifact_meta=threat.artifact_meta or {},
            reporter_id=threat.reported_by_employee_id,
        )
        targets = [ProposedTarget(**t) for t in raw]
        targeting_note = (
            "Computed now by the same risk_engine.select_targets call the TARGET stage makes "
            "after approval. It runs again at execution time, so this list can differ if a risk "
            "score moves or somebody's status changes in between."
        )
        if not targets:
            targeting_note = (
                "No employee matched this threat's targeting signals. This is not "
                '"nobody is at risk" — it means nothing in the artifact, the exposed '
                "departments or the recent-behaviour signals selected anyone. Approving will "
                "advance the run with nothing to assign. " + targeting_note
            )

    detail = ApprovalDetail(
        run_id=run.id,
        run_status=run.status,
        awaiting_approval=run.status == LoopStatus.AWAITING_APPROVAL,
        created_at=run.created_at,
        waiting_seconds=_waiting_seconds(run),
        threat=ThreatOut.model_validate(threat) if threat else None,
        artifact_excerpt=artifact[:ARTIFACT_EXCERPT_CHARS],
        artifact_excerpt_truncated=len(artifact) > ARTIFACT_EXCERPT_CHARS,
        analysis=analysis,
        analysis_note=analysis_note,
        module=TrainingModuleOut.model_validate(module) if module else None,
        generation_label=_generation_label(module),
        severity=severity,
        severity_basis=basis,
        proposed_targets=targets,
        targeting_note=targeting_note,
        safety=_safety_status(threat, module),
        second_approval=_second_approval_state(_endorsements(db, run.id)),
    )
    return detail


# --- The decision --------------------------------------------------------------


@router.post("/{run_id}/decision", response_model=ApprovalDecisionResult)
def record_decision(
    run_id: int,
    payload: ApprovalDecisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """approve | reject | request_revision — audited, with the comment kept.

    ``approve`` and ``reject`` delegate to the existing loop-run handlers rather
    than reimplementing the transition, so the orchestrator remains the only
    thing that moves a run. The audit entry is written first, into the same
    session, so it lands in the same transaction as the change it describes.
    """
    decision = payload.decision
    if decision not in DECISIONS:
        raise HTTPException(
            status_code=422, detail=f"decision must be one of: {', '.join(DECISIONS)}"
        )
    if payload.require_second_approval and decision != "approve":
        raise HTTPException(
            status_code=422,
            detail='require_second_approval applies only to an "approve" decision.',
        )
    comment = payload.comment.strip()
    if decision in ("reject", "request_revision") and not comment:
        raise HTTPException(
            status_code=422,
            detail=(
                f'A "{decision}" decision needs a comment. Returning generated content to the '
                "queue without saying what is wrong with it leaves nothing to act on."
            ),
        )

    run = _run_or_404(db, run_id)
    # Checked here as well as inside the delegates, so request_revision — which
    # has no delegate — refuses a stale run with the same message the others do.
    if run.status != LoopStatus.AWAITING_APPROVAL:
        raise HTTPException(
            status_code=409, detail=f"Run is not awaiting approval (status: {run.status})"
        )

    module = db.get(TrainingModule, run.training_module_id) if run.training_module_id else None
    label = f"Loop run {run.id} — {module.title if module else 'no module'}"[:255]
    context = _request_context(request)
    endorsements = _endorsements(db, run.id)

    if decision == "request_revision":
        record(
            db,
            actor=user,
            action=ACTION_REVISION,
            object_type="loop_run",
            object_id=run.id,
            object_label=label,
            summary=f"Revision requested: {comment}",
            before={"run_status": run.status, "module_status": module.status if module else None},
            # Unchanged on purpose, and stated: the request is recorded, the
            # gate is not moved, and nothing is written to stage_history because
            # a revision request is not a loop stage.
            after={"run_status": run.status, "module_status": module.status if module else None},
            **context,
        )
        db.commit()
        return ApprovalDecisionResult(
            run_id=run.id,
            decision=decision,
            loop_advanced=False,
            run_status=run.status,
            module_status=module.status if module else None,
            audited_action=ACTION_REVISION,
            comment=comment,
            second_approval=_second_approval_state(endorsements),
            detail=(
                "Revision requested. The run is still awaiting approval and the module is "
                "unchanged — edit it at PATCH /api/training/modules/"
                f"{module.id if module else '{id}'} and decide again."
            ),
        )

    if decision == "reject":
        record(
            db,
            actor=user,
            action=ACTION_REJECT,
            object_type="loop_run",
            object_id=run.id,
            object_label=label,
            summary=f"Rejected: {comment}",
            before={"run_status": run.status, "module_status": module.status if module else None},
            # Null where there is no module: reject_training leaves a run with
            # no module alone, and claiming "rejected" would put a state in the
            # trail that nothing ever held.
            after={
                "run_status": LoopStatus.FAILED,
                "module_status": "rejected" if module else None,
            },
            **context,
        )
        loop_runs.reject_training(run.id, db, user)
        db.refresh(run)
        if module is not None:
            db.refresh(module)
        return ApprovalDecisionResult(
            run_id=run.id,
            decision=decision,
            loop_advanced=False,
            run_status=run.status,
            module_status=module.status if module else None,
            audited_action=ACTION_REJECT,
            comment=comment,
            second_approval=_second_approval_state(endorsements),
            detail="Module rejected; the run is closed as failed-by-review. Nothing was assigned.",
        )

    # --- approve ---------------------------------------------------------
    own = [e for e in endorsements if e.actor_email == user.email]
    others = [e for e in endorsements if e.actor_email != user.email]

    if payload.require_second_approval:
        if own:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"You already endorsed this run at {own[-1].at.isoformat()} and asked for a "
                    "second approval. Endorsing it again does not satisfy that — a second "
                    "approver has to be a different person."
                ),
            )
        record(
            db,
            actor=user,
            action=ACTION_ENDORSE,
            object_type="loop_run",
            object_id=run.id,
            object_label=label,
            summary=(
                f"Approved, held for a second approver. {comment}".strip()
                if comment
                else "Approved, held for a second approver."
            ),
            before={"run_status": run.status},
            after={"run_status": run.status, "held_for_second_approval": True},
            **context,
        )
        db.commit()
        state = _second_approval_state(_endorsements(db, run.id))
        return ApprovalDecisionResult(
            run_id=run.id,
            decision=decision,
            loop_advanced=False,
            run_status=run.status,
            module_status=module.status if module else None,
            audited_action=ACTION_ENDORSE,
            comment=comment,
            second_approval=state,
            detail=(
                "Endorsement recorded. The loop has NOT advanced and no employee has been "
                "assigned anything. A second analyst must approve this run without "
                "require_second_approval to release it."
            ),
        )

    if endorsements and not others:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This run is held for a second approval, requested by you at "
                f"{own[-1].at.isoformat()}. A second approver has to be a different person."
            ),
        )

    cosign = (
        f" Co-signed: first endorsed by {others[-1].actor_email} at {others[-1].at.isoformat()}."
        if others
        else ""
    )
    record(
        db,
        actor=user,
        action=ACTION_APPROVE,
        object_type="loop_run",
        object_id=run.id,
        object_label=label,
        summary=(f"Approved. {comment}".strip() + cosign),
        before={"run_status": run.status, "module_status": module.status if module else None},
        after={
            "run_status": "running",
            "module_status": "approved",
            "second_approver": bool(others),
        },
        **context,
    )
    # Delegates to the existing handler: it re-checks the gate, marks the module
    # approved and hands the run to the orchestrator's TARGET → TRAIN stages.
    loop_runs.approve_training(run.id, db, user)
    db.refresh(run)
    if module is not None:
        db.refresh(module)
    return ApprovalDecisionResult(
        run_id=run.id,
        decision=decision,
        loop_advanced=True,
        run_status=run.status,
        module_status=module.status if module else None,
        audited_action=ACTION_APPROVE,
        comment=comment,
        second_approval=_second_approval_state(endorsements),
        detail=(
            "Approved. The run has left the gate: targeting and assignment run next."
            + (cosign if others else "")
        ),
    )


@router.get("/{run_id}/history", response_model=list[ApprovalHistoryEntry])
def approval_history(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Every approval action taken on this run, oldest first.

    Chronological rather than newest-first — unlike the queue and the audit
    search — because this is a thread: an endorsement, a revision request and
    the comment that answered it only make sense read in the order they
    happened.

    Read straight out of ``audit_events``. There is no second store of approval
    comments to fall out of step with the trail.
    """
    _run_or_404(db, run_id)
    rows = db.execute(
        select(AuditEvent)
        .where(
            AuditEvent.object_type == "loop_run",
            AuditEvent.object_id == run_id,
            AuditEvent.action.startswith("approval."),
        )
        .order_by(AuditEvent.at.asc(), AuditEvent.id.asc())
    ).scalars().all()
    return [
        ApprovalHistoryEntry(
            at=row.at,
            actor_email=row.actor_email,
            actor_role=row.actor_role,
            action=row.action,
            comment=row.summary,
            detail=row.after,
        )
        for row in rows
    ]
