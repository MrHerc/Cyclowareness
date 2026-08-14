"""Policy intelligence API — the organisation's own documents, and where
reality has drifted away from them.

Three rules shape almost every decision in this file.

**A machine may propose; only a human may activate.** Extraction writes rules
at ``proposed`` and nothing here can move one to ``active`` without a named
reviewer and a decision. Activation is the moment the organisation's control
set changes, so it is also the moment a ``PolicyVersion`` snapshot is written:
an auditor's first question is "what did the policy say on the day that finding
was raised", and only an immutable snapshot can answer it.

**A refusal to look is reported as a refusal, never as a clean result.**
``POST /policies/{id}/extract`` returns ``attempted=false`` with a reason in
plain language when it cannot run. A zero-rule response that looked like a
success would be the platform asserting a document contains no controls when in
fact nothing ever read it.

**An uploaded policy is untrusted input.** It is streamed into the sandbox
quarantine under a content-addressed name; its own filename is provenance to be
displayed, never a path to write to.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import (
    AssignmentStatus,
    Department,
    Employee,
    EmployeeStatus,
    ModuleStatus,
    TrainingAssignment,
    TrainingModule,
    User,
    utcnow,
)
from ..schemas import AutoTrainResource, AutoTrainResult
from ..training import pipeline as training_pipeline
from ..platform.models import (
    IntelMatch,
    ExtractionSource,
    ExtractionStatus,
    FindingStatus,
    FindingType,
    IntelItem,
    Policy,
    PolicyFinding,
    PolicyRule,
    PolicyStatus,
    PolicyType,
    PolicyVersion,
    RuleStatus,
    RuleType,
    Severity,
    record,
)
from ..platform.schemas import (
    FindingStatusChange,
    FindingTrainingAssign,
    FindingTrainingResult,
    PolicyDetail,
    PolicyExtractionResult,
    PolicyFindingCreate,
    PolicyFindingDetail,
    PolicyFindingOut,
    PolicyFindingPage,
    PolicyFindingStats,
    PolicyOut,
    PolicyPage,
    PolicyRuleCreate,
    PolicyRuleOut,
    PolicyRuleReview,
    PolicyUpdate,
    PolicyUploadMeta,
    PolicyVersionOut,
)
from ..sandbox.engine.storage import EmptySample, SampleTooLarge, store_stream
from ..security import require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api/policy", tags=["policy"])

#: Hard ceiling on a page of results.
MAX_PAGE = 200

#: How many rows a JSON-column filter (department membership) may scan before
#: it stops. ``applicable_departments`` and ``affected_department_ids`` are JSON
#: lists with no portable containment operator across SQLite and Postgres, so
#: that one filter runs in Python. When the cap is hit the page says so rather
#: than reporting a total it cannot stand behind.
SCAN_CAP = 2000

#: ``PolicyFinding.source`` is a dotted prefix by design ("intel:CVE-…",
#: "policy:exception-expiry", "scan:endpoint-inventory"), so the filter matches
#: on prefix and a caller can ask for everything intel raised.
INTEL_SOURCE_PREFIX = "intel:"

#: Severity and status keys are always emitted in full, zero-filled. A missing
#: key in a dashboard payload reads as "no data", which is not what zero means.
SEVERITY_ORDER = [
    Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO,
]
FINDING_STATUS_ORDER = [
    FindingStatus.OPEN,
    FindingStatus.IN_REVIEW,
    FindingStatus.REMEDIATION_PLANNED,
    FindingStatus.TRAINING_ASSIGNED,
    FindingStatus.RESOLVED,
    FindingStatus.ACCEPTED_RISK,
    FindingStatus.FALSE_POSITIVE,
]

#: Terminal statuses. Moving into one is a claim the organisation may have to
#: defend later, so the router requires a written reason for each of them.
TERMINAL_FINDING_STATUSES = {
    FindingStatus.RESOLVED, FindingStatus.ACCEPTED_RISK, FindingStatus.FALSE_POSITIVE,
}

#: Legal finding moves. Every terminal state can be reopened — a finding that
#: was closed and came back is a different story from one that was never closed,
#: and the audit trail keeps both.
FINDING_TRANSITIONS: dict[str, set[str]] = {
    FindingStatus.OPEN: {
        FindingStatus.IN_REVIEW, FindingStatus.REMEDIATION_PLANNED,
        FindingStatus.TRAINING_ASSIGNED, FindingStatus.RESOLVED,
        FindingStatus.ACCEPTED_RISK, FindingStatus.FALSE_POSITIVE,
    },
    FindingStatus.IN_REVIEW: {
        FindingStatus.OPEN, FindingStatus.REMEDIATION_PLANNED,
        FindingStatus.TRAINING_ASSIGNED, FindingStatus.RESOLVED,
        FindingStatus.ACCEPTED_RISK, FindingStatus.FALSE_POSITIVE,
    },
    FindingStatus.REMEDIATION_PLANNED: {
        FindingStatus.IN_REVIEW, FindingStatus.TRAINING_ASSIGNED,
        FindingStatus.RESOLVED, FindingStatus.ACCEPTED_RISK,
    },
    FindingStatus.TRAINING_ASSIGNED: {
        FindingStatus.IN_REVIEW, FindingStatus.REMEDIATION_PLANNED,
        FindingStatus.RESOLVED, FindingStatus.ACCEPTED_RISK,
    },
    FindingStatus.RESOLVED: {FindingStatus.OPEN},
    FindingStatus.ACCEPTED_RISK: {FindingStatus.OPEN, FindingStatus.IN_REVIEW},
    FindingStatus.FALSE_POSITIVE: {FindingStatus.OPEN},
}


# --- small helpers ------------------------------------------------------------


def _allowed(enum_cls: type) -> set[str]:
    """The string values declared on one of the plain-string enum classes."""
    return {v for k, v in vars(enum_cls).items() if not k.startswith("_") and isinstance(v, str)}


def _require_value(value: str, enum_cls: type, field: str) -> str:
    allowed = _allowed(enum_cls)
    if value not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown {field}: {value!r}. Expected one of: {', '.join(sorted(allowed))}",
        )
    return value


def _audit(
    db: Session,
    request: Request,
    user: User,
    *,
    action: str,
    object_type: str,
    object_id: int | None = None,
    object_label: str = "",
    summary: str = "",
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    """Record one material change, in the same transaction as the change itself.

    ``ip_address`` is deliberately left NULL. This service runs behind a proxy,
    so the socket address is the proxy's and ``X-Forwarded-For`` is caller-
    supplied; writing either into an audit trail would record a confident,
    wrong fact. NULL means "not captured", which is true. The user agent IS
    recorded, because a user agent is by definition only ever a claim the
    client made about itself.
    """
    record(
        db,
        actor=user,
        action=action,
        object_type=object_type,
        object_id=object_id,
        object_label=object_label[:255],
        summary=summary,
        before=before,
        after=after,
        user_agent=(request.headers.get("user-agent") or "")[:255] or None,
    )


def _policy_or_404(db: Session, policy_id: int) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


def _rule_or_404(db: Session, rule_id: int) -> PolicyRule:
    rule = db.get(PolicyRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Policy rule not found")
    return rule


def _finding_or_404(db: Session, finding_id: int) -> PolicyFinding:
    finding = db.get(PolicyFinding, finding_id)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


def _rule_row(rule: PolicyRule) -> dict[str, Any]:
    """One rule as it goes into an immutable version snapshot.

    The snapshot has to outlive the rules table, so it carries the statement and
    the evidence pointer, not just the key: a snapshot you have to join back to
    live rows to read is not a snapshot.
    """
    return {
        "rule_key": rule.rule_key,
        "statement": rule.statement,
        "rule_type": rule.rule_type,
        "technology": rule.technology,
        "version_spec": rule.version_spec,
        "status": rule.status,
        "confidence": rule.confidence,
        "evidence_location": rule.evidence_location,
    }


def _snapshot_version(
    db: Session,
    request: Request,
    user: User,
    policy: Policy,
    *,
    change_summary: str,
    diff: dict[str, Any],
) -> PolicyVersion:
    """Freeze the policy's rule set at this moment. Append-only, by contract."""
    rules = db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == policy.id).order_by(PolicyRule.id)
    ).scalars().all()
    version = PolicyVersion(
        policy_id=policy.id,
        version=policy.version,
        changed_by=user.email,
        change_summary=change_summary,
        diff=diff,
        snapshot=[_rule_row(r) for r in rules],
    )
    db.add(version)
    db.flush()
    _audit(
        db, request, user,
        action="policy.version.snapshot",
        object_type="policy_version",
        object_id=version.id,
        object_label=f"{policy.name} v{policy.version}",
        summary=change_summary,
        after={"version": policy.version, "rules": len(rules), "diff": diff},
    )
    return version


# --- policies -----------------------------------------------------------------


@router.get("/policies", response_model=PolicyPage)
def list_policies(
    type: str | None = None,
    status: str | None = None,
    department: int | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Registered policy documents, newest first."""
    limit = max(1, min(limit, MAX_PAGE))
    offset = max(0, offset)

    query = select(Policy)
    if type:
        query = query.where(Policy.policy_type == _require_value(type, PolicyType, "type"))
    if status:
        query = query.where(Policy.status == _require_value(status, PolicyStatus, "status"))
    if q:
        needle = f"%{q.strip()}%"
        query = query.where(
            or_(Policy.name.ilike(needle), Policy.owner_name.ilike(needle), Policy.notes.ilike(needle))
        )
    query = query.order_by(Policy.updated_at.desc(), Policy.id.desc())

    if department is None:
        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar_one()
        items = db.execute(query.limit(limit).offset(offset)).scalars().all()
        return PolicyPage(
            items=[PolicyOut.model_validate(p) for p in items],
            total=total, limit=limit, offset=offset,
        )

    scanned = db.execute(query.limit(SCAN_CAP)).scalars().all()
    matched = [p for p in scanned if department in (p.applicable_departments or [])]
    truncated = len(scanned) == SCAN_CAP
    return PolicyPage(
        items=[PolicyOut.model_validate(p) for p in matched[offset : offset + limit]],
        total=len(matched),
        limit=limit,
        offset=offset,
        truncated=truncated,
        note=(
            f"applicable_departments is a JSON list with no portable containment operator, so "
            f"the department filter ran over the {SCAN_CAP} most recently updated policies. "
            f"total is a floor, not an exact count."
            if truncated
            else ""
        ),
    )


@router.post("/policies", response_model=PolicyOut, status_code=201)
async def register_policy(
    request: Request,
    name: str = Form(...),
    policy_type: str = Form(default=PolicyType.SECURITY_POLICY),
    version: str = Form(default="1.0"),
    status: str = Form(default=PolicyStatus.DRAFT),
    owner_name: str = Form(default=""),
    owner_email: str = Form(default=""),
    effective_date: datetime | None = Form(default=None),
    review_date: datetime | None = Form(default=None),
    applicable_departments: list[int] = Form(default_factory=list),
    notes: str = Form(default=""),
    request_extraction: bool = Form(default=False),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Register a policy document, with the file itself optional.

    When a file is supplied the bytes go straight into the sandbox quarantine —
    content-addressed, owner-read-only, never executable, and never written to a
    path built from the submitted filename. The ``Policy`` row keeps only
    provenance: the name to display, the declared MIME type, and the true size
    measured while streaming (not the ``Content-Length`` the sender claimed).
    The digest of the accepted bytes goes into the audit entry, which is the
    record of exactly what was taken in.

    The metadata is declared as flat form fields rather than as
    ``PolicyUploadMeta`` directly: FastAPI embeds a body model under its own
    parameter name as soon as a second body parameter (here, the file) is
    present, so the model is rebuilt from the fields instead — it stays the one
    place the shape and its defaults are defined.
    """
    meta = PolicyUploadMeta(
        name=name,
        policy_type=policy_type,
        version=version,
        status=status,
        owner_name=owner_name,
        owner_email=owner_email,
        effective_date=effective_date,
        review_date=review_date,
        applicable_departments=list(applicable_departments),
        notes=notes,
        request_extraction=request_extraction,
    )
    name = meta.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="A policy needs a name")
    _require_value(meta.policy_type, PolicyType, "policy_type")
    _require_value(meta.status, PolicyStatus, "status")

    stored = None
    if file is not None and file.filename:
        try:
            stored = store_stream(file.file)
        except SampleTooLarge as exc:
            raise HTTPException(status_code=413, detail=str(exc)) from exc
        except EmptySample as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        finally:
            await file.close()

    policy = Policy(
        name=name[:255],
        policy_type=meta.policy_type,
        version=(meta.version or "1.0")[:32],
        status=meta.status,
        owner_name=meta.owner_name[:120],
        owner_email=meta.owner_email[:255],
        effective_date=meta.effective_date,
        review_date=meta.review_date,
        applicable_departments=list(meta.applicable_departments),
        # Displayed, never resolved to a path. store_stream chose the real one.
        source_filename=((file.filename or "") if stored else "")[:512],
        source_mime=((file.content_type or "") if stored else "")[:128],
        source_bytes=stored.size_bytes if stored else 0,
        uploaded_by=user.email,
        notes=meta.notes,
    )
    db.add(policy)
    db.flush()

    _audit(
        db, request, user,
        action="policy.upload",
        object_type="policy",
        object_id=policy.id,
        object_label=policy.name,
        summary=(
            f"Registered {policy.policy_type} '{policy.name}' v{policy.version}"
            + (
                f" with {policy.source_filename} ({policy.source_bytes} bytes)"
                if stored
                else " as metadata only — no document was attached"
            )
        ),
        after={
            "name": policy.name,
            "policy_type": policy.policy_type,
            "version": policy.version,
            "status": policy.status,
            "source_filename": policy.source_filename,
            "source_bytes": policy.source_bytes,
            # The one unambiguous identity of the bytes accepted, for anyone who
            # later has to prove which document a rule came out of.
            "source_sha256": stored.sha256 if stored else None,
        },
    )

    if meta.request_extraction:
        _attempt_extraction(db, request, user, policy)

    db.commit()
    db.refresh(policy)
    return policy


@router.get("/policies/{policy_id}", response_model=PolicyDetail)
def get_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    policy = _policy_or_404(db, policy_id)
    rules = db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == policy.id).order_by(PolicyRule.id)
    ).scalars().all()
    versions = db.execute(
        select(PolicyVersion)
        .where(PolicyVersion.policy_id == policy.id)
        .order_by(PolicyVersion.created_at.desc(), PolicyVersion.id.desc())
    ).scalars().all()

    counts = {status: 0 for status in sorted(_allowed(RuleStatus))}
    for rule in rules:
        counts[rule.status] = counts.get(rule.status, 0) + 1

    open_findings = db.execute(
        select(func.count())
        .select_from(PolicyFinding)
        .where(
            PolicyFinding.policy_id == policy.id,
            PolicyFinding.status.notin_(list(TERMINAL_FINDING_STATUSES)),
        )
    ).scalar_one()

    detail = PolicyDetail.model_validate(policy)
    detail.rules = [PolicyRuleOut.model_validate(r) for r in rules]
    detail.versions = [PolicyVersionOut.model_validate(v) for v in versions]
    detail.rule_counts = counts
    detail.open_finding_count = open_findings
    return detail


@router.patch("/policies/{policy_id}", response_model=PolicyOut)
def update_policy(
    policy_id: int,
    payload: PolicyUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Ownership, lifecycle status and review dates. Every change is audited."""
    policy = _policy_or_404(db, policy_id)
    if payload.status is not None:
        _require_value(payload.status, PolicyStatus, "status")

    fields = ("name", "status", "owner_name", "owner_email", "review_date", "applicable_departments", "notes")
    before: dict[str, Any] = {}
    after: dict[str, Any] = {}
    for field in fields:
        new = getattr(payload, field)
        if new is None:
            continue
        old = getattr(policy, field)
        if old == new:
            continue
        before[field] = old.isoformat() if isinstance(old, datetime) else old
        after[field] = new.isoformat() if isinstance(new, datetime) else new
        setattr(policy, field, new)

    if not after:
        return policy

    policy.updated_at = utcnow()
    _audit(
        db, request, user,
        action="policy.update",
        object_type="policy",
        object_id=policy.id,
        object_label=policy.name,
        summary=f"Updated {', '.join(sorted(after))} on '{policy.name}'",
        before=before,
        after=after,
    )
    db.commit()
    db.refresh(policy)
    return policy


# --- rules --------------------------------------------------------------------


@router.get("/policies/{policy_id}/rules", response_model=list[PolicyRuleOut])
def list_rules(
    policy_id: int,
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Every rule on one policy. Bounded by the parent, so never truncated."""
    _policy_or_404(db, policy_id)
    query = select(PolicyRule).where(PolicyRule.policy_id == policy_id)
    if status:
        query = query.where(PolicyRule.status == _require_value(status, RuleStatus, "status"))
    return db.execute(query.order_by(PolicyRule.id)).scalars().all()


@router.post("/policies/{policy_id}/rules", response_model=PolicyRuleOut, status_code=201)
def create_rule(
    policy_id: int,
    payload: PolicyRuleCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """A rule a human typed, rather than one a machine proposed.

    It lands ``active`` — there is nobody left to review it — and carries NULL
    confidence, because a person's sentence has no extraction confidence and a
    fabricated 1.0 would be a machine claim about a human's work.

    Note what this does NOT do: it leaves ``extraction_status`` alone. Somebody
    typing rules is not the platform having read the document, and a policy
    whose PDF was never opened must keep saying so.
    """
    policy = _policy_or_404(db, policy_id)
    _require_value(payload.rule_type, RuleType, "rule_type")
    key = payload.rule_key.strip()
    if not key:
        raise HTTPException(status_code=422, detail="A rule needs a rule_key")

    clash = db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == policy.id, PolicyRule.rule_key == key)
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Rule key {key!r} already exists on this policy (rule {clash.id}, "
                f"status: {clash.status}). Findings key off rule_key, so reusing one "
                f"would rewrite the history that referenced it."
            ),
        )

    rule = PolicyRule(
        policy_id=policy.id,
        rule_key=key[:120],
        statement=payload.statement,
        rule_type=payload.rule_type,
        technology=payload.technology[:120],
        version_spec=payload.version_spec[:60],
        evidence_quote=payload.evidence_quote,
        evidence_location=payload.evidence_location[:120],
        confidence=None,
        status=RuleStatus.ACTIVE,
        reviewed_by=user.email,
        reviewed_at=utcnow(),
    )
    db.add(rule)

    # Only claim manual authorship where nothing else has claimed it. A policy
    # whose rules Claude extracted does not become "manual" because one rule was
    # typed afterwards — that would relabel the provenance of the other rules.
    if policy.extraction_source == ExtractionSource.NONE:
        policy.extraction_source = ExtractionSource.MANUAL
    policy.updated_at = utcnow()
    db.flush()

    _snapshot_version(
        db, request, user, policy,
        change_summary=f"Rule '{rule.rule_key}' entered manually and activated.",
        diff={"added": [rule.rule_key], "removed": [], "changed": []},
    )
    _audit(
        db, request, user,
        action="policy.rule.create",
        object_type="policy_rule",
        object_id=rule.id,
        object_label=rule.rule_key,
        summary=f"Typed and activated rule '{rule.rule_key}' on '{policy.name}'",
        after=_rule_row(rule),
    )
    db.commit()
    db.refresh(rule)
    return rule


@router.post("/rules/{rule_id}/review", response_model=PolicyRuleOut)
def review_rule(
    rule_id: int,
    payload: PolicyRuleReview,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The human gate in front of every machine-proposed rule.

    ``activate`` and ``supersede`` both change the set of rules the organisation
    is actually checked against, so both write a ``PolicyVersion`` snapshot.
    ``reject`` does not: a proposed rule was never in force.
    """
    rule = _rule_or_404(db, rule_id)
    policy = _policy_or_404(db, rule.policy_id)
    decision = payload.decision.strip().lower()
    if decision not in ("activate", "reject", "supersede"):
        raise HTTPException(
            status_code=422, detail="decision must be activate, reject or supersede"
        )

    corrections = {
        field: getattr(payload, field)
        for field in ("statement", "technology", "version_spec")
        if getattr(payload, field) is not None
    }
    if corrections and decision != "activate":
        raise HTTPException(
            status_code=422,
            detail=f"Corrections can only accompany an activation, not a {decision}",
        )
    if decision in ("reject", "supersede") and not payload.note.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                f"A note is required to {decision} a rule: a discarded rule with no stated "
                f"reason is indistinguishable from one nobody read."
            ),
        )

    required = RuleStatus.ACTIVE if decision == "supersede" else RuleStatus.PROPOSED
    if rule.status != required:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Only {required} rules can be {decision}d — rule {rule.id} is {rule.status}"
            ),
        )

    before = _rule_row(rule)
    for field, value in corrections.items():
        setattr(rule, field, value)
    rule.status = {
        "activate": RuleStatus.ACTIVE,
        "reject": RuleStatus.REJECTED,
        "supersede": RuleStatus.SUPERSEDED,
    }[decision]
    rule.reviewed_by = user.email
    rule.reviewed_at = utcnow()
    policy.updated_at = utcnow()
    db.flush()

    if decision in ("activate", "supersede"):
        _snapshot_version(
            db, request, user, policy,
            change_summary=(
                f"Rule '{rule.rule_key}' {rule.status} at review"
                + (f" with corrections to {', '.join(sorted(corrections))}" if corrections else "")
                + (f". {payload.note.strip()}" if payload.note.strip() else ".")
            ),
            diff={
                "added": [rule.rule_key] if decision == "activate" else [],
                "removed": [rule.rule_key] if decision == "supersede" else [],
                "changed": (
                    [{"rule_key": rule.rule_key, "before": before, "after": _rule_row(rule)}]
                    if corrections
                    else []
                ),
            },
        )

    _audit(
        db, request, user,
        action=f"policy.rule.{decision}",
        object_type="policy_rule",
        object_id=rule.id,
        object_label=rule.rule_key,
        summary=(
            f"{decision.capitalize()}d rule '{rule.rule_key}' on '{policy.name}'"
            + (f": {payload.note.strip()}" if payload.note.strip() else "")
        ),
        before=before,
        after=_rule_row(rule),
    )
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/policies/{policy_id}/versions", response_model=list[PolicyVersionOut])
def list_versions(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """The append-only history of one policy's rule set, newest first."""
    _policy_or_404(db, policy_id)
    return db.execute(
        select(PolicyVersion)
        .where(PolicyVersion.policy_id == policy_id)
        .order_by(PolicyVersion.created_at.desc(), PolicyVersion.id.desc())
    ).scalars().all()


# --- extraction ---------------------------------------------------------------


def _extraction_blocker(policy: Policy) -> str:
    """Why extraction cannot run on this policy right now.

    This build has no extraction engine, so there is always a reason. They are
    checked in the order an operator would fix them — is there a document at
    all, is there an engine to read it, and can this build hand the bytes to
    that engine — so each answer is the next thing actually standing in the way
    rather than a generic "unavailable".
    """
    if not policy.source_filename:
        return (
            "No document is attached to this policy — it was registered as metadata only, "
            "so there is nothing to read. Upload the document with the policy record, or "
            "enter its rules manually."
        )
    if not get_settings().anthropic_api_key:
        return (
            "No AI provider is configured on this deployment (ANTHROPIC_API_KEY is unset). "
            "Extraction was refused rather than run through the offline generator: the "
            "generator writes plausible rules, and plausible rules this document may not "
            "contain would enter the review queue as if the document had been read."
        )
    return (
        "The uploaded document was streamed into quarantine, but this build keeps no pointer "
        "from a policy record back to its stored bytes, so the document cannot be retrieved "
        "for reading. Extraction from stored documents is not wired yet — enter the rules "
        "manually in the meantime."
    )


def _attempt_extraction(
    db: Session, request: Request, user: User, policy: Policy
) -> PolicyExtractionResult:
    """Try to extract rules, and be explicit when the attempt cannot be made.

    Nothing here writes a rule it did not read out of a document, and nothing
    sets ``extraction_source`` unless an engine actually produced something —
    provenance is recorded, never inferred from the presence of rules.
    """
    blocker = _extraction_blocker(policy)
    before = {"extraction_status": policy.extraction_status, "extraction_error": policy.extraction_error}
    # A refusal to look does not erase what an earlier look found. Only record
    # the failure on a document whose rules were never successfully extracted;
    # overwriting an EXTRACTED status here would destroy the provenance of every
    # rule already sitting under this policy.
    if policy.extraction_status != ExtractionStatus.EXTRACTED:
        policy.extraction_status = ExtractionStatus.FAILED
        policy.extraction_error = blocker
        policy.updated_at = utcnow()

    _audit(
        db, request, user,
        # The seeded world already uses policy.extract for a run that produced
        # rules and policy.extract.fail for one that did not; a refusal belongs
        # with the second, never the first.
        action="policy.extract.fail",
        object_type="policy",
        object_id=policy.id,
        object_label=policy.name,
        summary=f"Extraction not attempted on '{policy.name}': {blocker}",
        before=before,
        after={"extraction_status": policy.extraction_status, "extraction_error": policy.extraction_error},
    )
    return PolicyExtractionResult(
        policy_id=policy.id,
        attempted=False,
        extraction_status=policy.extraction_status,
        extraction_source=policy.extraction_source,
        rules_proposed=0,
        reason=blocker,
    )


@router.post("/policies/{policy_id}/extract", response_model=PolicyExtractionResult)
def extract_rules(
    policy_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Read the policy document and propose rules from it.

    Returns 200 with ``attempted=false`` and a reason when it cannot run, rather
    than an error: "we could not look, and here is why" is a result the reviewer
    needs to see next to the document, not an exception to be swallowed by a
    toast. Anything it ever does produce lands at ``proposed`` for a human.
    """
    policy = _policy_or_404(db, policy_id)
    result = _attempt_extraction(db, request, user, policy)
    db.commit()
    return result


# --- findings -----------------------------------------------------------------


@router.get("/findings", response_model=PolicyFindingPage)
def list_findings(
    severity: str | None = None,
    status: str | None = None,
    policy: int | None = None,
    department: int | None = None,
    technology: str | None = None,
    source: str | None = None,
    owner: str | None = None,
    due_before: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Findings, newest detection first.

    ``source`` matches on prefix, because the field is a dotted namespace:
    ``source=intel`` returns everything the intel feed raised.
    """
    limit = max(1, min(limit, MAX_PAGE))
    offset = max(0, offset)

    query = select(PolicyFinding)
    if severity:
        query = query.where(PolicyFinding.severity == _require_value(severity, Severity, "severity"))
    if status:
        query = query.where(PolicyFinding.status == _require_value(status, FindingStatus, "status"))
    if policy is not None:
        query = query.where(PolicyFinding.policy_id == policy)
    if technology:
        query = query.where(PolicyFinding.technology.ilike(f"%{technology.strip()}%"))
    if source:
        query = query.where(PolicyFinding.source.ilike(f"{source.strip()}%"))
    if owner:
        query = query.where(PolicyFinding.owner_name.ilike(f"%{owner.strip()}%"))
    if due_before is not None:
        query = query.where(
            PolicyFinding.due_date.is_not(None), PolicyFinding.due_date <= due_before
        )
    query = query.order_by(PolicyFinding.detected_at.desc(), PolicyFinding.id.desc())

    if department is None:
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
        items = db.execute(query.limit(limit).offset(offset)).scalars().all()
        return PolicyFindingPage(
            items=[PolicyFindingOut.model_validate(f) for f in items],
            total=total, limit=limit, offset=offset,
        )

    scanned = db.execute(query.limit(SCAN_CAP)).scalars().all()
    matched = [f for f in scanned if department in (f.affected_department_ids or [])]
    truncated = len(scanned) == SCAN_CAP
    return PolicyFindingPage(
        items=[PolicyFindingOut.model_validate(f) for f in matched[offset : offset + limit]],
        total=len(matched),
        limit=limit,
        offset=offset,
        truncated=truncated,
        note=(
            f"affected_department_ids is a JSON list with no portable containment operator, so "
            f"the department filter ran over the {SCAN_CAP} most recent findings. total is a "
            f"floor, not an exact count."
            if truncated
            else ""
        ),
    )


@router.get("/findings/{finding_id}", response_model=PolicyFindingDetail)
def get_finding(
    finding_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """One finding with everything needed to argue with it."""
    finding = _finding_or_404(db, finding_id)
    detail = PolicyFindingDetail.model_validate(finding)

    if finding.policy_id is not None:
        policy = db.get(Policy, finding.policy_id)
        if policy is not None:
            detail.policy_name = policy.name
            detail.policy_version = policy.version
    if finding.policy_rule_id is not None:
        rule = db.get(PolicyRule, finding.policy_rule_id)
        if rule is not None:
            detail.rule = PolicyRuleOut.model_validate(rule)

    dept_ids = [d for d in (finding.affected_department_ids or []) if isinstance(d, int)]
    if dept_ids:
        departments = db.execute(
            select(Department).where(Department.id.in_(dept_ids))
        ).scalars().all()
        found = {d.id: d.name for d in departments}
        # An id that no longer resolves is reported as unresolved, not dropped.
        # A silently shortened list would understate the blast radius.
        detail.affected_departments = [
            {"id": did, "name": found[did], "resolved": True}
            if did in found
            else {"id": did, "name": None, "resolved": False}
            for did in dept_ids
        ]

    emp_ids = [e for e in (finding.affected_employee_ids or []) if isinstance(e, int)]
    if emp_ids:
        employees = db.execute(select(Employee).where(Employee.id.in_(emp_ids))).scalars().all()
        by_id = {e.id: e for e in employees}
        dept_names = {
            d.id: d.name
            for d in db.execute(
                select(Department).where(
                    Department.id.in_([e.department_id for e in employees] or [0])
                )
            ).scalars().all()
        }
        detail.affected_employees = [
            {
                "id": eid,
                "name": by_id[eid].name,
                "email": by_id[eid].email,
                "department_name": dept_names.get(by_id[eid].department_id, ""),
                # Carried so the reader can see that two of the five named people
                # have left, rather than wondering why training never lands.
                "employment_status": by_id[eid].status,
                "resolved": True,
            }
            if eid in by_id
            else {"id": eid, "name": None, "resolved": False}
            for eid in emp_ids
        ]

    if finding.source.startswith(INTEL_SOURCE_PREFIX):
        external_id = finding.source[len(INTEL_SOURCE_PREFIX) :]
        item = db.execute(
            select(IntelItem)
            .where(IntelItem.external_id == external_id)
            .order_by(IntelItem.published_at.desc())
        ).scalars().first()
        if item is not None:
            detail.intel_item = item
        else:
            detail.intel_lookup_note = (
                f"This finding cites advisory {external_id}, which is no longer in the intel "
                f"store. The citation is preserved; the advisory itself is not available here."
            )
    return detail


@router.post("/findings", response_model=PolicyFindingOut, status_code=201)
def create_finding(
    payload: PolicyFindingCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """An analyst raises a finding themselves.

    ``confidence`` stays NULL and ``source`` is set to ``analyst`` here rather
    than taken from the body: a human's judgement has no matching score, and a
    finding must not be able to describe itself as something the intel feed
    produced.
    """
    _require_value(payload.finding_type, FindingType, "finding_type")
    _require_value(payload.severity, Severity, "severity")
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="A finding needs a title")

    if payload.policy_id is not None and db.get(Policy, payload.policy_id) is None:
        raise HTTPException(status_code=422, detail=f"Unknown policy_id: {payload.policy_id}")
    rule = None
    if payload.policy_rule_id is not None:
        rule = db.get(PolicyRule, payload.policy_rule_id)
        if rule is None:
            raise HTTPException(
                status_code=422, detail=f"Unknown policy_rule_id: {payload.policy_rule_id}"
            )
        if payload.policy_id is not None and rule.policy_id != payload.policy_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Rule {rule.id} belongs to policy {rule.policy_id}, not "
                    f"{payload.policy_id}"
                ),
            )

    finding = PolicyFinding(
        finding_type=payload.finding_type,
        title=payload.title.strip()[:255],
        description=payload.description,
        severity=payload.severity,
        confidence=None,
        status=FindingStatus.OPEN,
        policy_id=payload.policy_id,
        policy_rule_id=payload.policy_rule_id,
        technology=payload.technology[:120],
        affected_version=payload.affected_version[:60],
        approved_version=payload.approved_version[:60],
        recommended_version=payload.recommended_version[:60],
        source="analyst",
        source_ref=(payload.source_ref or user.email)[:255],
        detected_at=utcnow(),
        affected_department_ids=list(payload.affected_department_ids),
        affected_employee_ids=list(payload.affected_employee_ids),
        suggested_remediation=payload.suggested_remediation,
        required_training=payload.required_training,
        owner_name=payload.owner_name[:120],
        due_date=payload.due_date,
        evidence=list(payload.evidence),
    )
    db.add(finding)
    db.flush()

    _audit(
        db, request, user,
        action="policy.finding.raise",
        object_type="policy_finding",
        object_id=finding.id,
        object_label=finding.title,
        summary=f"Raised {finding.severity} finding '{finding.title}'",
        after={
            "finding_type": finding.finding_type,
            "severity": finding.severity,
            "status": finding.status,
            "policy_id": finding.policy_id,
            "policy_rule_id": finding.policy_rule_id,
            "owner_name": finding.owner_name,
        },
    )
    db.commit()
    db.refresh(finding)
    return finding


@router.patch("/findings/{finding_id}", response_model=PolicyFindingOut)
def update_finding(
    finding_id: int,
    payload: FindingStatusChange,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Move a finding along, close it, or reopen it.

    Closing requires a written reason. So does reopening: a finding that was
    resolved and came back has a story, and ``resolution_note`` is where it is
    told. Everything is kept in the audit entry's before/after, so nothing about
    the earlier closure is lost when it is superseded.
    """
    finding = _finding_or_404(db, finding_id)
    new_status = _require_value(payload.status, FindingStatus, "status")
    note = payload.resolution_note.strip()

    changing = new_status != finding.status
    if changing and new_status not in FINDING_TRANSITIONS.get(finding.status, set()):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot move a finding from {finding.status} to {new_status}. "
                f"From {finding.status} the legal moves are: "
                f"{', '.join(sorted(FINDING_TRANSITIONS.get(finding.status, set()))) or 'none'}"
            ),
        )
    reopening = changing and finding.status in TERMINAL_FINDING_STATUSES
    if changing and (new_status in TERMINAL_FINDING_STATUSES or reopening) and not note:
        raise HTTPException(
            status_code=422,
            detail=(
                f"resolution_note is required to move a finding to {new_status}: a finding "
                f"that changed hands without a stated reason is indistinguishable from one "
                f"that was quietly deleted."
            ),
        )

    before: dict[str, Any] = {}
    after: dict[str, Any] = {}

    def track(field: str, value: Any) -> None:
        old = getattr(finding, field)
        if old == value:
            return
        before[field] = old.isoformat() if isinstance(old, datetime) else old
        after[field] = value.isoformat() if isinstance(value, datetime) else value
        setattr(finding, field, value)

    for field, value in (
        ("owner_name", payload.owner_name),
        ("due_date", payload.due_date),
        ("recommended_version", payload.recommended_version),
        ("required_training", payload.required_training),
    ):
        if value is not None:
            track(field, value)

    if changing:
        track("status", new_status)
        track("resolution_note", note or None)
        if new_status in TERMINAL_FINDING_STATUSES:
            track("resolved_by", user.email)
            track("resolved_at", utcnow())
        elif reopening:
            # The finding is live again, so the closure stamp no longer describes
            # it. The note now carries the reopening reason; the closure itself
            # survives in the audit entry's `before`.
            track("resolved_by", None)
            track("resolved_at", None)

    if not after:
        return finding

    _audit(
        db, request, user,
        # Same three verbs the seeded trail uses, so the audit view reads as one
        # history rather than two vocabularies stitched together.
        action=(
            "policy.finding.status" if changing
            else "policy.finding.assign" if "owner_name" in after
            else "policy.finding.update"
        ),
        object_type="policy_finding",
        object_id=finding.id,
        object_label=finding.title,
        summary=(
            f"Moved to {finding.status}: '{finding.title}'" + (f" — {note}" if note else "")
            if changing
            else f"Updated {', '.join(sorted(after))} on '{finding.title}'"
        ),
        before=before,
        after=after,
    )
    db.commit()
    db.refresh(finding)
    return finding


@router.get("/watch")
def grc_watch_status(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """The GRC watcher's pulse: when it last ran and what it surfaced.

    `last_scan` is None until the first scan completes, and the response says
    "has not run" rather than presenting zeroes that would read as a clean
    bill of health nothing measured.
    """
    from ..platform import grc_watch

    interval = get_settings().grc_watch_interval_seconds
    recent = db.scalars(
        select(IntelMatch)
        .where(IntelMatch.explanation.like("GRC watch:%"))
        .order_by(IntelMatch.created_at.desc())
        .limit(20)
    ).all()
    return {
        "enabled": interval > 0,
        "interval_seconds": interval,
        "last_scan": grc_watch.last_scan,
        "recent_matches": [
            {
                "match_id": m.id,
                "intel_item_id": m.intel_item_id,
                "intel_title": m.intel_item.title if m.intel_item else "",
                "rule_id": m.matched_rule_id,
                "technology": m.matched_technology,
                "explanation": m.explanation,
                "created_at": m.created_at,
                "escalated_finding_id": m.created_finding_id,
            }
            for m in recent
        ],
    }


@router.post("/watch/run")
def grc_watch_run(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Run one scan now. The same code the background loop runs on its interval."""
    from ..platform import grc_watch

    return grc_watch.scan_once(db)


@router.post("/findings/{finding_id}/auto-train", response_model=AutoTrainResult)
async def auto_train_finding(
    finding_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The pipeline, end to end, from one click on a finding.

    Retrieval first: an approved module matching the finding's topic is
    assigned to the named employees immediately, with verified external
    resources attached. Generation second: when the shelf is empty a module is
    written and queued for review, and the approval click completes the
    assignment. The response states which path ran — nothing is implied.
    """
    finding = _finding_or_404(db, finding_id)
    if finding.status in TERMINAL_FINDING_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Finding {finding.id} is {finding.status}; reopen it before assigning training",
        )
    employee_ids = [e for e in (finding.affected_employee_ids or []) if isinstance(e, int)]
    if not employee_ids:
        raise HTTPException(
            status_code=422,
            detail=(
                "This finding names no employees, so there is nobody to train. "
                "Attach the affected people to the finding first."
            ),
        )

    outcome = await training_pipeline.auto_train(
        db,
        kind="policy_finding",
        ref_id=finding.id,
        title=finding.title,
        description=finding.description or "",
        severity=finding.severity,
        type_value=finding.finding_type,
        required_action=finding.required_training or finding.suggested_remediation or "",
        employee_ids=employee_ids,
    )
    module = outcome["module"]
    if outcome["assigned"] and finding.status != FindingStatus.TRAINING_ASSIGNED:
        finding.status = FindingStatus.TRAINING_ASSIGNED

    _audit(
        db, request, user,
        action="policy.finding.auto_train",
        object_type="policy_finding",
        object_id=finding.id,
        object_label=finding.title,
        summary=(
            f"Auto-train ({outcome['path']}): module '{module.title}' — "
            f"{len(outcome['assigned'])} assigned, {len(outcome['skipped'])} skipped"
        ),
        after={
            "path": outcome["path"],
            "topic": outcome["topic"],
            "module_id": module.id,
            "assignment_ids": [a["assignment_id"] for a in outcome["assigned"]],
            "resources": [r["id"] for r in outcome["resources"]],
            "finding_status": finding.status,
        },
    )
    db.commit()
    db.refresh(module)
    return AutoTrainResult(
        path=outcome["path"],
        topic=outcome["topic"],
        module_id=module.id,
        module_title=module.title,
        module_status=module.status,
        generation_source=outcome["generation_source"],
        assigned=outcome["assigned"],
        skipped=outcome["skipped"],
        resources=[AutoTrainResource(**r) for r in outcome["resources"]],
        note=outcome["note"],
    )


@router.post("/findings/{finding_id}/assign-training", response_model=FindingTrainingResult)
def assign_training(
    finding_id: int,
    payload: FindingTrainingAssign,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Attach real training to a finding, using the loop's own machinery.

    This creates ordinary ``TrainingAssignment`` rows against an existing,
    human-approved ``TrainingModule`` — the same rows the employee's "my
    training" page reads and the same ones the risk engine scores on completion.
    It deliberately does not generate a module: writing lesson content here
    would either fabricate it or push AI-written material past the review gate
    the loop puts in front of every generated module.

    One thing it cannot do honestly is claim a durable link back. There is no
    finding→assignment foreign key in this schema, so the linkage lives in the
    assignment's ``targeting_reasons`` and in the audit entry, and completion
    does not yet flow back onto the finding. ``linkage_note`` says so on every
    response rather than letting the UI imply a closed loop that is not there.
    """
    finding = _finding_or_404(db, finding_id)
    module = db.get(TrainingModule, payload.module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")
    if module.status != ModuleStatus.APPROVED:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Module {module.id} is {module.status}, not approved. Assigning it would "
                f"send unreviewed content to employees, which is the one thing the "
                f"human-in-the-loop gate exists to stop."
            ),
        )
    if finding.status in TERMINAL_FINDING_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Finding {finding.id} is {finding.status}; reopen it before assigning training",
        )

    requested = payload.employee_ids
    if requested is None:
        requested = [e for e in (finding.affected_employee_ids or []) if isinstance(e, int)]
    requested = list(dict.fromkeys(requested))
    if not requested:
        raise HTTPException(
            status_code=422,
            detail=(
                "No employees to assign: this finding names none, and none were supplied. "
                "Pass employee_ids explicitly."
            ),
        )

    employees = {
        e.id: e
        for e in db.execute(select(Employee).where(Employee.id.in_(requested))).scalars().all()
    }
    existing = {
        a.employee_id
        for a in db.execute(
            select(TrainingAssignment).where(
                TrainingAssignment.module_id == module.id,
                TrainingAssignment.employee_id.in_(requested),
                TrainingAssignment.status.in_(
                    [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                ),
            )
        ).scalars().all()
    }

    reason = f"Policy finding #{finding.id}: {finding.title}"
    assigned: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for employee_id in requested:
        employee = employees.get(employee_id)
        if employee is None:
            skipped.append({"employee_id": employee_id, "reason": "No such employee record"})
            continue
        if employee.status != EmployeeStatus.ACTIVE:
            skipped.append(
                {
                    "employee_id": employee_id,
                    "name": employee.name,
                    "reason": f"Employment status is {employee.status}",
                }
            )
            continue
        if employee_id in existing:
            skipped.append(
                {
                    "employee_id": employee_id,
                    "name": employee.name,
                    "reason": "Already has an open assignment for this module",
                }
            )
            continue
        assignment = TrainingAssignment(
            module_id=module.id,
            employee_id=employee_id,
            loop_run_id=None,
            targeting_reasons=[reason] + ([payload.note.strip()] if payload.note.strip() else []),
        )
        db.add(assignment)
        db.flush()
        assigned.append(
            {"employee_id": employee_id, "name": employee.name, "assignment_id": assignment.id}
        )

    if assigned and finding.status != FindingStatus.TRAINING_ASSIGNED:
        finding.status = FindingStatus.TRAINING_ASSIGNED

    linkage_note = (
        "Assignments are real and appear in each employee's training list. The link back to "
        "this finding is held in targeting_reasons and in the audit entry only — there is no "
        "foreign key — so completion is not yet reflected on the finding."
    )
    _audit(
        db, request, user,
        action="policy.finding.assign_training",
        object_type="policy_finding",
        object_id=finding.id,
        object_label=finding.title,
        summary=(
            f"Assigned '{module.title}' to {len(assigned)} of {len(requested)} named "
            f"employees for finding '{finding.title}'"
        ),
        after={
            "module_id": module.id,
            "module_title": module.title,
            # The durable record of which assignments this finding produced.
            "assignment_ids": [a["assignment_id"] for a in assigned],
            "assigned_employee_ids": [a["employee_id"] for a in assigned],
            "skipped": skipped,
            "finding_status": finding.status,
        },
    )
    db.commit()
    db.refresh(finding)
    return FindingTrainingResult(
        finding_id=finding.id,
        module_id=module.id,
        module_title=module.title,
        assigned=assigned,
        skipped=skipped,
        finding_status=finding.status,
        linkage_note=linkage_note,
    )


# --- dashboard ----------------------------------------------------------------


@router.get("/stats", response_model=PolicyFindingStats)
def finding_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Counts by severity, status and type — with what they are counts OF.

    A bare set of totals invites the reader to treat them as the whole record.
    ``sample_size``, ``total_all_time`` and ``outside_window`` state exactly how
    much of it these numbers cover, and every severity and status key is present
    with a zero rather than omitted, so an absent bar means zero findings and
    never a missing measurement.
    """
    days = max(1, min(days, 365))
    until = utcnow()
    since = until - timedelta(days=days)

    in_window = db.execute(
        select(PolicyFinding).where(PolicyFinding.detected_at >= since)
    ).scalars().all()
    total_all_time = db.execute(select(func.count()).select_from(PolicyFinding)).scalar_one()

    by_severity = {key: 0 for key in SEVERITY_ORDER}
    by_status = {key: 0 for key in FINDING_STATUS_ORDER}
    by_type = {key: 0 for key in sorted(_allowed(FindingType))}
    for finding in in_window:
        by_severity[finding.severity] = by_severity.get(finding.severity, 0) + 1
        by_status[finding.status] = by_status.get(finding.status, 0) + 1
        by_type[finding.finding_type] = by_type.get(finding.finding_type, 0) + 1

    overdue = db.execute(
        select(func.count())
        .select_from(PolicyFinding)
        .where(
            PolicyFinding.status.notin_(list(TERMINAL_FINDING_STATUSES)),
            PolicyFinding.due_date.is_not(None),
            PolicyFinding.due_date < until,
        )
    ).scalar_one()

    outside = total_all_time - len(in_window)
    return PolicyFindingStats(
        window_days=days,
        window_start=since,
        window_end=until,
        sample_size=len(in_window),
        total_all_time=total_all_time,
        outside_window=outside,
        by_severity=by_severity,
        by_status=by_status,
        by_finding_type=by_type,
        overdue_open_all_time=overdue,
        note=(
            f"Counts cover the {len(in_window)} findings detected in the last {days} days. "
            f"{outside} older finding(s) are excluded from them; overdue_open_all_time is "
            f"counted over every finding, because being overdue is a fact about today."
        ),
    )
