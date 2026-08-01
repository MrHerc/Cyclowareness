"""Threat intelligence API — read advisories, judge them, raise findings from them.

Three things this router deliberately does not do:

* **It does not fetch.** No intel source is wired into this build, so
  ``POST /refresh`` reports that nothing was checked. An empty success there
  would tell an operator "we looked and the world is quiet" when the truth is
  "nobody looked", and those are different claims about the same silence.
* **It does not interpret.** Every field on an ``IntelItem`` — title, summary,
  reference URLs, IOCs — was written by somebody outside the organisation. It is
  carried to the client as data. Nothing here follows an instruction found in
  an advisory, and nothing builds a filesystem path or a request out of one.
* **It does not judge on the analyst's behalf.** Relevance and dismissal are
  separate decisions with separate audit entries, because "this does not apply
  to us" and "stop showing me this" are separate claims.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, utcnow
from ..platform.models import (
    FindingStatus,
    FindingType,
    IntelItem,
    IntelMatch,
    IntelRelevance,
    IntelSource,
    IntelType,
    PolicyFinding,
    Severity,
    record,
)
from ..platform.schemas import (
    IntelDismissal,
    IntelFindingRequest,
    IntelItemDetail,
    IntelItemOut,
    IntelItemPage,
    IntelMatchPage,
    IntelRefreshResult,
    IntelRelevanceDecision,
    IntelStats,
    PolicyFindingOut,
)
from ..security import require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api/intel", tags=["intel"])

#: The intel sources this build can actually fetch from. It is empty, and it
#: must stay empty until a client exists behind a name: ``/refresh`` reports
#: this list as "configured", so a name here with no fetcher behind it converts
#: an honest "we did not look" into a lie the UI will repeat.
CONFIGURED_SOURCES: list[str] = []

#: Relevance values an analyst may assert. ``unassessed`` is missing on purpose —
#: it is the absence of a judgement, and no request can put one back.
ASSESSABLE_RELEVANCE = (
    IntelRelevance.NOT_APPLICABLE,
    IntelRelevance.MONITORING,
    IntelRelevance.RELEVANT,
    IntelRelevance.URGENT,
)

_SEVERITIES = (Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO)
_RELEVANCES = (IntelRelevance.UNASSESSED,) + ASSESSABLE_RELEVANCE
_SOURCES = (
    IntelSource.NVD, IntelSource.CISA, IntelSource.CERT, IntelSource.VENDOR,
    IntelSource.RESEARCH, IntelSource.OSINT, IntelSource.BREACH_MONITOR, IntelSource.FEED,
)
_TYPES = (
    IntelType.VULNERABILITY, IntelType.ADVISORY, IntelType.CAMPAIGN, IntelType.RANSOMWARE,
    IntelType.CREDENTIAL_EXPOSURE, IntelType.IOC, IntelType.RESEARCH,
)
_FINDING_TYPES = (
    FindingType.OUTDATED_APPROVED_VERSION, FindingType.UNSAFE_WHITELIST_ENTRY,
    FindingType.VULNERABLE_ALLOWED_VERSION, FindingType.EXPIRED_EXCEPTION,
    FindingType.POLICY_CONFLICT, FindingType.MISSING_CONTROL,
    FindingType.EXTERNAL_ADVISORY_MATCH, FindingType.EXPOSURE_MATCH,
)

MAX_PAGE = 200

COVERAGE_NOTE = (
    "No threat-intelligence source is configured in this deployment, so nothing is "
    "being fetched. These counts describe what is stored here, not what has been "
    "published in the world — an unchanged or empty set is not evidence that no new "
    "advisory exists."
)


def _client(request: Request) -> tuple[str | None, str | None]:
    """Source address and user agent for the audit trail, or None when unknown.

    None is recorded rather than a placeholder: ``AuditEvent`` treats NULL as
    "not captured", and a fabricated "unknown" string would read as a value.
    """
    ip = request.client.host if request.client else None
    return ip, (request.headers.get("user-agent") or None)


def _like(term: str) -> str:
    """Wrap a search term for LIKE with its wildcards neutralised.

    The term is client input: an unescaped ``%`` silently turns a search into a
    match-everything, which is a wrong answer rather than a slow one.
    """
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _page(limit: int, offset: int) -> tuple[int, int]:
    return max(1, min(limit, MAX_PAGE)), max(0, offset)


def _item_or_404(db: Session, item_id: int) -> IntelItem:
    item = db.get(IntelItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Intel item not found")
    return item


def _label(item: IntelItem) -> str:
    """How an advisory is named in the audit trail: its own id where it has one."""
    return item.external_id or item.title[:120]


@router.get("/items", response_model=IntelItemPage)
def list_items(
    source: str | None = None,
    intel_type: str | None = Query(default=None, alias="type"),
    severity: str | None = None,
    relevance: str | None = None,
    q: str | None = None,
    since: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Advisories, newest publication first.

    ``since`` filters on publication date, not fetch date: an operator asking
    "what came out this week" is asking about the world, not about our polling.
    """
    limit, offset = _page(limit, offset)
    conditions = []
    if source:
        conditions.append(IntelItem.source == source)
    if intel_type:
        conditions.append(IntelItem.intel_type == intel_type)
    if severity:
        conditions.append(IntelItem.severity == severity)
    if relevance:
        conditions.append(IntelItem.relevance == relevance)
    if since:
        conditions.append(IntelItem.published_at >= since)
    if q:
        pattern = _like(q)
        conditions.append(
            or_(
                IntelItem.title.ilike(pattern, escape="\\"),
                IntelItem.summary.ilike(pattern, escape="\\"),
                IntelItem.external_id.ilike(pattern, escape="\\"),
            )
        )

    total = db.execute(
        select(func.count()).select_from(IntelItem).where(*conditions)
    ).scalar_one()
    rows = db.execute(
        select(IntelItem)
        .where(*conditions)
        .order_by(IntelItem.published_at.desc(), IntelItem.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return IntelItemPage(
        items=[IntelItemOut.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(rows) < total,
    )


@router.get("/items/{item_id}", response_model=IntelItemDetail)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """One advisory with its matches and any finding raised from it."""
    item = _item_or_404(db, item_id)
    detail = IntelItemDetail.model_validate(item)

    raised_ids = [m.created_finding_id for m in item.matches if m.created_finding_id]
    origins = [PolicyFinding.id.in_(raised_ids)] if raised_ids else []
    if item.external_id:
        # Findings raised before matches existed still carry the advisory id in
        # `source`; both routes to the same fact are shown.
        origins.append(PolicyFinding.source == f"intel:{item.external_id}"[:60])
    if origins:
        detail.findings = [
            PolicyFindingOut.model_validate(f)
            for f in db.execute(
                select(PolicyFinding)
                .where(or_(*origins))
                .order_by(PolicyFinding.detected_at.desc())
            ).scalars().all()
        ]
    return detail


@router.post("/items/{item_id}/assess", response_model=IntelItemOut)
def assess_item(
    item_id: int,
    payload: IntelRelevanceDecision,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Record an analyst's judgement of how much this advisory matters here.

    A fresh judgement supersedes an earlier dismissal, and clearing it is part
    of the same audited change — otherwise an item could be re-assessed as
    urgent while still carrying "dismissed" in the record.
    """
    if payload.relevance not in ASSESSABLE_RELEVANCE:
        raise HTTPException(
            status_code=422,
            detail=(
                f"relevance must be one of {', '.join(ASSESSABLE_RELEVANCE)}. "
                "'unassessed' is the absence of a judgement and cannot be asserted."
            ),
        )
    reason = payload.reason.strip()
    if payload.relevance == IntelRelevance.NOT_APPLICABLE and not reason:
        raise HTTPException(
            status_code=422,
            detail="A reason is required to mark an advisory not applicable to this organisation.",
        )

    item = _item_or_404(db, item_id)
    before = {
        "relevance": item.relevance,
        "relevance_reason": item.relevance_reason,
        "dismissed_by": item.dismissed_by,
    }
    item.relevance = payload.relevance
    item.relevance_reason = reason
    was_dismissed = item.dismissed_by
    item.dismissed_by = None
    item.dismissed_reason = None

    summary = f"Assessed {_label(item)} as {payload.relevance}."
    if reason:
        summary += f" Reason: {reason}"
    if was_dismissed:
        summary += f" This supersedes the dismissal recorded by {was_dismissed}."
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="intel.relevance.set",
        object_type="intel_item",
        object_id=item.id,
        object_label=_label(item),
        summary=summary,
        before=before,
        after={"relevance": item.relevance, "relevance_reason": reason, "dismissed_by": None},
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/items/{item_id}/dismiss", response_model=IntelItemOut)
def dismiss_item(
    item_id: int,
    payload: IntelDismissal,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Take an advisory out of the queue, on the record.

    Relevance is left exactly as it stands. Dismissal is a decision about the
    queue, not a finding about the organisation, and inferring "not applicable"
    from "stop showing me this" would put a claim in the record that nobody made.
    """
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="A reason is required to dismiss an advisory.")

    item = _item_or_404(db, item_id)
    if item.dismissed_by:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Already dismissed by {item.dismissed_by} "
                f"({item.dismissed_reason or 'no reason recorded'}). "
                "Re-assess it to bring it back into the queue."
            ),
        )

    before = {"dismissed_by": None, "dismissed_reason": None, "relevance": item.relevance}
    item.dismissed_by = user.email
    item.dismissed_reason = reason
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="intel.dismiss",
        object_type="intel_item",
        object_id=item.id,
        object_label=_label(item),
        summary=f"Dismissed {_label(item)}: {reason}",
        before=before,
        after={
            "dismissed_by": user.email,
            "dismissed_reason": reason,
            # Unchanged, and shown as unchanged: dismissal asserts nothing here.
            "relevance": item.relevance,
        },
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/items/{item_id}/create-finding", response_model=PolicyFindingOut, status_code=201)
def create_finding(
    item_id: int,
    payload: IntelFindingRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Escalate an advisory into a finding somebody owns.

    ``confidence`` is taken from the match or left NULL. A finding raised
    straight from an advisory has no match behind it to be confident about, and
    a fabricated number there would be a machine claim about a human's decision.
    """
    if payload.finding_type not in _FINDING_TYPES:
        raise HTTPException(
            status_code=422, detail=f"finding_type must be one of {', '.join(_FINDING_TYPES)}"
        )
    severity = payload.severity or ""
    if severity and severity not in _SEVERITIES:
        raise HTTPException(status_code=422, detail=f"severity must be one of {', '.join(_SEVERITIES)}")

    item = _item_or_404(db, item_id)
    if item.dismissed_by:
        raise HTTPException(
            status_code=409,
            detail=(
                f"{_label(item)} was dismissed by {item.dismissed_by} "
                f"({item.dismissed_reason or 'no reason recorded'}). "
                "Re-assess it before raising a finding from it."
            ),
        )

    match: IntelMatch | None = None
    if payload.match_id is not None:
        match = db.get(IntelMatch, payload.match_id)
        if match is None or match.intel_item_id != item.id:
            raise HTTPException(status_code=404, detail="Match not found on this intel item")
        if match.created_finding_id:
            raise HTTPException(
                status_code=409,
                detail=f"This match already raised finding #{match.created_finding_id}",
            )

    # affected_products came from a third-party feed: its shape is whatever the
    # publisher sent, so it is type-checked before anything reads a key off it.
    first = (item.affected_products or [None])[0]
    product = first if isinstance(first, dict) else {}
    evidence = [
        {
            "label": "Advisory",
            "value": item.title,
            "ref": item.external_id or item.source_name or item.source,
        },
        {
            "label": "Published",
            "value": item.published_at.isoformat(),
            "ref": item.source_name or item.source,
        },
    ]
    if product.get("product"):
        evidence.append(
            {
                "label": "Affected",
                "value": f"{product.get('vendor', '')} {product.get('product', '')} "
                f"{product.get('versions', '')}".strip(),
                "ref": item.external_id or item.source_name,
            }
        )
    if match is not None:
        evidence.append(
            {"label": "Why it matches us", "value": match.explanation, "ref": f"intel match #{match.id}"}
        )
    evidence.extend(payload.evidence or [])

    finding = PolicyFinding(
        finding_type=payload.finding_type,
        title=(payload.title or item.title)[:255],
        description=payload.description or item.summary,
        severity=severity or item.severity,
        confidence=match.confidence if match is not None else None,
        status=FindingStatus.OPEN,
        policy_id=match.matched_policy_id if match is not None else None,
        policy_rule_id=match.matched_rule_id if match is not None else None,
        technology=(
            (match.matched_technology if match is not None else "")
            or str(product.get("product", ""))
        )[:120],
        affected_version=(match.matched_version if match is not None else "")[:60],
        recommended_version=payload.recommended_version[:60],
        source=f"intel:{item.external_id or item.source_name}"[:60],
        source_ref=(item.source_url or item.source_name)[:255],
        published_at=item.published_at,
        detected_at=utcnow(),
        affected_department_ids=list(match.affected_department_ids or []) if match is not None else [],
        affected_employee_ids=list(match.affected_employee_ids or []) if match is not None else [],
        suggested_remediation=payload.suggested_remediation,
        required_training=payload.required_training,
        owner_name=payload.owner_name[:120],
        due_date=payload.due_date,
        evidence=evidence,
    )
    db.add(finding)
    db.flush()
    if match is not None:
        match.created_finding_id = finding.id

    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="policy.finding.raise",
        object_type="policy_finding",
        object_id=finding.id,
        object_label=finding.title,
        summary=(
            f"Raised a {finding.severity} finding from {_label(item)}"
            + (f" via match #{match.id}." if match is not None else " with no match behind it.")
        ),
        before=None,
        after={
            "severity": finding.severity,
            "status": finding.status,
            "source": finding.source,
            "match_id": match.id if match is not None else None,
        },
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(finding)
    return finding


@router.get("/matches", response_model=IntelMatchPage)
def list_matches(
    intel_item_id: int | None = None,
    match_type: str | None = None,
    min_confidence: float | None = None,
    has_finding: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Why advisories matter to this organisation, newest first.

    ``min_confidence`` never hides a match whose confidence is NULL: an
    unscored match is not a low-scoring one, and filtering it out on a numeric
    threshold would quietly drop the ones nobody has measured.
    """
    limit, offset = _page(limit, offset)
    conditions = []
    if intel_item_id is not None:
        conditions.append(IntelMatch.intel_item_id == intel_item_id)
    if match_type:
        conditions.append(IntelMatch.match_type == match_type)
    if min_confidence is not None:
        conditions.append(
            or_(IntelMatch.confidence >= min_confidence, IntelMatch.confidence.is_(None))
        )
    if has_finding is True:
        conditions.append(IntelMatch.created_finding_id.is_not(None))
    elif has_finding is False:
        conditions.append(IntelMatch.created_finding_id.is_(None))

    total = db.execute(
        select(func.count()).select_from(IntelMatch).where(*conditions)
    ).scalar_one()
    rows = db.execute(
        select(IntelMatch)
        .where(*conditions)
        .order_by(IntelMatch.created_at.desc(), IntelMatch.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return IntelMatchPage(
        items=rows,
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(rows) < total,
    )


@router.post("/refresh", response_model=IntelRefreshResult)
def refresh(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Check the configured intel sources — of which this build has none.

    Nothing is fetched, nothing is invented, and no item is written. The request
    is still audited: that an analyst asked for a refresh and the platform did
    not look is exactly the fact that goes missing when a stub returns 200 and
    an empty list.
    """
    now = utcnow()
    attempted = bool(CONFIGURED_SOURCES)
    detail = (
        "No threat-intelligence source is configured in this deployment. Nothing was "
        "contacted, nothing was fetched, and no advisory was created or updated. The "
        "list you are looking at is unchanged — which is not the same as up to date."
    )
    next_step = (
        "Configure a source (NVD, CISA KEV, a national CERT feed or a commercial feed) "
        "with its endpoint and credentials in the deployment's secret store. Until then "
        "advisories reach this module only by being entered by hand."
    )
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="intel.refresh",
        object_type="intel_item",
        object_id=None,
        object_label="all sources",
        summary=(
            "Refresh requested; no intel source is configured, so no source was contacted "
            "and no advisory was added or changed."
        ),
        # Nothing changed, so nothing is captured: NULL here means "no snapshot",
        # and an empty object would read as "it was blank".
        before=None,
        after=None,
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    return IntelRefreshResult(
        attempted=attempted,
        configured_sources=list(CONFIGURED_SOURCES),
        sources_checked=0,
        items_added=0,
        items_updated=0,
        requested_at=now,
        detail=detail,
        next_step=next_step,
    )


@router.get("/stats", response_model=IntelStats)
def stats(db: Session = Depends(get_db), user: User = Depends(require_analyst_or_exec)):
    """Counts over stored advisories, carrying the coverage caveat with them."""

    def counts(column, known: tuple[str, ...]) -> dict[str, int]:
        # Every known value is present, at zero if need be: an absent key makes
        # a reader guess whether the value is zero or the question was not asked.
        tally = {value: 0 for value in known}
        for value, count in db.execute(select(column, func.count()).group_by(column)).all():
            tally[str(value)] = count
        return tally

    by_relevance = counts(IntelItem.relevance, _RELEVANCES)
    latest_published = db.execute(
        select(IntelItem.published_at).order_by(IntelItem.published_at.desc()).limit(1)
    ).scalar_one_or_none()
    latest_fetched = db.execute(
        select(IntelItem.fetched_at).order_by(IntelItem.fetched_at.desc()).limit(1)
    ).scalar_one_or_none()

    return IntelStats(
        total=db.execute(select(func.count()).select_from(IntelItem)).scalar_one(),
        by_relevance=by_relevance,
        by_severity=counts(IntelItem.severity, _SEVERITIES),
        by_source=counts(IntelItem.source, _SOURCES),
        by_type=counts(IntelItem.intel_type, _TYPES),
        unassessed=by_relevance[IntelRelevance.UNASSESSED],
        dismissed=db.execute(
            select(func.count()).select_from(IntelItem).where(IntelItem.dismissed_by.is_not(None))
        ).scalar_one(),
        matches_total=db.execute(select(func.count()).select_from(IntelMatch)).scalar_one(),
        matches_without_finding=db.execute(
            select(func.count())
            .select_from(IntelMatch)
            .where(IntelMatch.created_finding_id.is_(None))
        ).scalar_one(),
        latest_published_at=latest_published,
        latest_fetched_at=latest_fetched,
        configured_sources=list(CONFIGURED_SOURCES),
        coverage_note=COVERAGE_NOTE,
    )
