"""Audit log API — read-only, because the trail is worth nothing if it is not.

There is no write route here and there never should be. ``platform.models.record``
is the only supported way an entry is created, and it adds the row to the same
session as the change it describes, so the trail cannot claim something the
database never did. An HTTP endpoint that could append to it would let anyone
holding an analyst token write history.

Two decisions worth knowing about:

**Analyst-only, not analyst-or-executive.** The trail carries ``before``/``after``
snapshots, and those snapshots include fields from restricted incident records.
There is no per-row redaction for an audit entry, and inventing one that
silently drops rows would produce a log that reads complete and is not. Until
there is a redacted projection, the whole log stays with the role that can
already read the underlying objects.

**Every page states what it left behind.** ``total`` and ``truncated`` come back
on every response. An audit search that returns 200 of 4 000 matches and says
nothing has answered "did anything else happen" — the only question anyone asks
a log — incorrectly, and silently.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..platform.models import AuditEvent
from ..platform.schemas import AuditActionOut, AuditEventOut, AuditEventPage
from ..security import require_analyst

router = APIRouter(prefix="/api/audit", tags=["audit"])

MAX_LIMIT = 500


@router.get("", response_model=AuditEventPage)
def list_audit_events(
    actor: str | None = None,
    action: str | None = None,
    object_type: str | None = None,
    object_id: int | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Newest first, with an exact count of everything that matched.

    ``action`` matches exactly *or* as a dotted prefix, which is what the verb
    convention is for: ``incident_risk`` finds ``incident_risk.close`` and
    ``incident_risk.subject.review`` without the caller enumerating them.

    ``actor`` is a case-insensitive substring of the email — role accounts and
    typos both make exact-match filtering useless in practice — while
    ``object_type`` and ``object_id`` are exact, because a near-miss on an
    object identity is not a near-miss, it is a different object.
    """
    filters = []
    if actor:
        filters.append(AuditEvent.actor_email.ilike(f"%{actor.strip()}%"))
    if action:
        verb = action.strip()
        filters.append(
            or_(AuditEvent.action == verb, AuditEvent.action.startswith(f"{verb}."))
        )
    if object_type:
        filters.append(AuditEvent.object_type == object_type)
    if object_id is not None:
        filters.append(AuditEvent.object_id == object_id)
    if since is not None:
        filters.append(AuditEvent.at >= since)
    if until is not None:
        filters.append(AuditEvent.at <= until)
    if q:
        needle = f"%{q.strip()}%"
        filters.append(
            or_(
                AuditEvent.summary.ilike(needle),
                AuditEvent.object_label.ilike(needle),
                AuditEvent.action.ilike(needle),
            )
        )

    total = db.execute(select(func.count(AuditEvent.id)).where(*filters)).scalar_one()
    # id descending as the tiebreak: entries written in one transaction share a
    # timestamp to the microsecond, and an unstable order across pages would
    # drop rows out of a paged read entirely.
    rows = db.execute(
        select(AuditEvent)
        .where(*filters)
        .order_by(AuditEvent.at.desc(), AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()

    return AuditEventPage(
        events=[AuditEventOut.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(rows) < total,
    )


@router.get("/actions", response_model=list[AuditActionOut])
def list_actions(
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The distinct verbs actually present in this deployment's trail.

    Derived from the data rather than from a hardcoded list, so a filter UI
    built on it can never offer a verb nothing ever wrote — or hide one written
    by a part of the platform this module has not heard of.
    """
    rows = db.execute(
        select(AuditEvent.action, func.count(AuditEvent.id))
        .group_by(AuditEvent.action)
        .order_by(func.count(AuditEvent.id).desc(), AuditEvent.action.asc())
    ).all()
    return [AuditActionOut(action=action, count=count) for action, count in rows]
