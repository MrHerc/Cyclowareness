"""Integrations API — external LMS and identity connections, described honestly.

No provider client is compiled into this build. That single fact shapes every
route here:

* ``/configure`` stores shape, never secrets, and refuses to let anyone hand-set
  a status that asserts a live connection. ``connected`` is a claim only a sync
  that actually reached the provider may make.
* ``/sync`` never invents a result. A ``not_configured`` integration is refused
  outright; a configured one is told plainly that nothing was requested from the
  provider, and its stored ``last_sync_*`` is left exactly as it was — because
  overwriting last week's real outcome with today's non-attempt would destroy
  the only true record on the row.
* ``/courses`` states how the catalogue in front of you came to exist. Two
  courses imported out of eleven is not a catalogue, and a list that does not
  say so is telling an operator something false about their own LMS.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, utcnow
from ..platform.models import (
    ExternalCourse,
    Integration,
    IntegrationStatus,
    SyncStatus,
    record,
)
from ..platform.schemas import (
    ExternalCourseMapping,
    ExternalCourseOut,
    ExternalCoursePage,
    IntegrationConfigure,
    IntegrationDetail,
    IntegrationDisable,
    IntegrationOut,
    IntegrationSyncRequest,
    IntegrationSyncResult,
)
from ..security import require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

MAX_PAGE = 200

#: Reported by ``/sync`` when no provider client exists. Deliberately NOT one of
#: ``SyncStatus``'s values and never written to the row: nothing reached a
#: provider, so this is not a sync outcome — it is the absence of one.
SYNC_NOT_ATTEMPTED = "not_attempted"

#: Statuses an operator may set by hand. ``connected``, ``degraded`` and
#: ``error`` describe a live connection, and only a sync that actually talked to
#: the provider is entitled to assert one.
SETTABLE_STATUSES = (
    IntegrationStatus.NOT_CONFIGURED,
    IntegrationStatus.CONFIGURED,
    IntegrationStatus.DISABLED,
)

#: Substrings that mark a config key as carrying a credential. ``config_summary``
#: is free-form, so the schema having no ``api_key`` field is not enough on its
#: own — a JSON column that has ever held a secret is one that leaks in every
#: backup, every audit export and every screenshot.
SECRET_KEY_MARKERS = (
    "secret", "token", "password", "passwd", "credential", "api_key", "apikey",
    "private_key", "access_key", "authorization", "bearer", "signature",
)

SYNC_SCOPES = ("courses", "completions", "all")


def _client(request: Request) -> tuple[str | None, str | None]:
    """Source address and user agent for the audit trail, or None when unknown."""
    ip = request.client.host if request.client else None
    return ip, (request.headers.get("user-agent") or None)


def _secret_like(payload: dict, path: str = "") -> list[str]:
    """Every key path in a config blob whose name suggests a credential."""
    offenders = []
    for key, value in payload.items():
        here = f"{path}.{key}" if path else str(key)
        if any(marker in str(key).lower() for marker in SECRET_KEY_MARKERS):
            offenders.append(here)
        elif isinstance(value, dict):
            offenders.extend(_secret_like(value, here))
    return offenders


def _integration_or_404(db: Session, integration_id: int) -> Integration:
    integration = db.get(Integration, integration_id)
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    return integration


def _catalogue_note(integration: Integration, shown: int, total: int) -> str:
    """State what this course list is, and what it is not.

    Written per sync status rather than per row count, because the dangerous
    case is the one that looks fine: a short list from a partial sync renders
    exactly like a complete small catalogue.
    """
    when = integration.last_sync_at.isoformat() if integration.last_sync_at else "an unrecorded time"
    if integration.last_sync_status == SyncStatus.NEVER:
        return (
            "This integration has never synced. Nothing has been requested from the provider, "
            f"so these {total} course(s) are not its catalogue — they are whatever was entered here."
        )
    if integration.last_sync_status == SyncStatus.PARTIAL:
        return (
            f"The last sync ({when}) was partial, so this list is incomplete: "
            f"{integration.last_sync_error or 'the provider refused part of the catalogue.'} "
            "Courses you expect to see may exist at the provider and not here."
        )
    if integration.last_sync_status == SyncStatus.FAILED:
        return (
            f"The last sync ({when}) failed: "
            f"{integration.last_sync_error or 'no error was recorded.'} "
            "This list is whatever an earlier sync left behind, not the provider's catalogue today."
        )
    return f"Imported by the last successful sync ({when}). {shown} of {total} shown."


@router.get("", response_model=list[IntegrationOut])
def list_integrations(
    status: str | None = None,
    provider: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """Every configured connection and its real state.

    Unpaginated on purpose: the set is bounded by how many providers an
    organisation has connected, and a truncated integrations list would hide a
    broken connector behind a page boundary.
    """
    query = select(Integration).order_by(Integration.created_at.desc())
    if status:
        query = query.where(Integration.status == status)
    if provider:
        query = query.where(Integration.provider == provider)
    return db.execute(query).scalars().all()


def _detail(db: Session, integration: Integration) -> IntegrationDetail:
    """One integration plus a capped page of its courses, with the cap declared."""
    total = db.execute(
        select(func.count())
        .select_from(ExternalCourse)
        .where(ExternalCourse.integration_id == integration.id)
    ).scalar_one()
    courses = db.execute(
        select(ExternalCourse)
        .where(ExternalCourse.integration_id == integration.id)
        .order_by(ExternalCourse.id)
        .limit(MAX_PAGE)
    ).scalars().all()
    detail = IntegrationDetail.model_validate(integration)
    detail.courses = [ExternalCourseOut.model_validate(c) for c in courses]
    detail.courses_total = total
    detail.courses_truncated = total > len(courses)
    return detail


@router.get("/{integration_id}", response_model=IntegrationDetail)
def get_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """One integration with its mirrored courses (capped, and said to be capped)."""
    return _detail(db, _integration_or_404(db, integration_id))


@router.post("/{integration_id}/configure", response_model=IntegrationDetail)
def configure(
    integration_id: int,
    payload: IntegrationConfigure,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Store non-secret connection shape: base URL, account name, scope, seats.

    Credentials are refused rather than dropped silently. An operator who pastes
    an API key into this endpoint needs to be told it did not land, or they will
    believe the integration is authenticated when it is not.
    """
    integration = _integration_or_404(db, integration_id)

    incoming = dict(payload.config_summary or {})
    if payload.base_url is not None:
        incoming["base_url"] = payload.base_url
    if payload.account_name is not None:
        incoming["account_name"] = payload.account_name
    offenders = _secret_like(incoming)
    if offenders:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Refusing to store credential-shaped keys: {', '.join(offenders)}. "
                "Secrets belong in the deployment's secret store; this endpoint holds "
                "non-sensitive configuration only."
            ),
        )
    if payload.status is not None and payload.status not in SETTABLE_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"status must be one of {', '.join(SETTABLE_STATUSES)}. "
                "'connected', 'degraded' and 'error' describe a live connection and are "
                "set by a sync that actually reached the provider, never by hand."
            ),
        )

    before = {
        "status": integration.status,
        "display_name": integration.display_name,
        "capabilities": list(integration.capabilities or []),
        "config_summary": dict(integration.config_summary or {}),
    }

    # JSON columns are compared by equality: copy, modify, reassign — mutating
    # in place leaves SQLAlchemy seeing no change and the update never lands.
    summary = dict(integration.config_summary or {})
    summary.update(incoming)
    integration.config_summary = summary

    if payload.display_name is not None:
        integration.display_name = payload.display_name[:120]
    if payload.capabilities is not None:
        integration.capabilities = list(payload.capabilities)
    if payload.status is not None:
        integration.status = payload.status
    elif integration.status == IntegrationStatus.NOT_CONFIGURED and summary:
        # "configured" is a statement about local settings only, which is
        # exactly what just happened. It claims nothing about the provider.
        integration.status = IntegrationStatus.CONFIGURED
    integration.updated_at = utcnow()

    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="integration.configure",
        object_type="integration",
        object_id=integration.id,
        object_label=integration.display_name or integration.provider,
        summary=(
            f"Updated configuration for {integration.display_name or integration.provider} "
            f"(status {before['status']} → {integration.status}). No credential was submitted or stored."
        ),
        before=before,
        after={
            "status": integration.status,
            "display_name": integration.display_name,
            "capabilities": list(integration.capabilities or []),
            "config_summary": dict(integration.config_summary or {}),
        },
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(integration)
    return _detail(db, integration)


@router.post("/{integration_id}/sync", response_model=IntegrationSyncResult)
def sync(
    integration_id: int,
    payload: IntegrationSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Ask the provider for courses and completions — which this build cannot do.

    There is no client for any provider here, so no request leaves the process.
    The response says ``attempted: false`` and the row's ``last_sync_*`` is left
    untouched: a non-attempt is not a failed sync, and overwriting a real
    outcome with it would erase the only true sync record the row has.
    """
    if payload.scope not in SYNC_SCOPES:
        raise HTTPException(status_code=422, detail=f"scope must be one of {', '.join(SYNC_SCOPES)}")

    integration = _integration_or_404(db, integration_id)
    if integration.status in (IntegrationStatus.NOT_CONFIGURED, IntegrationStatus.DISABLED):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Integration is {integration.status}; there is nothing to sync against. "
                "Configure it (and enable it) first."
            ),
        )

    error = (
        f"No sync client is implemented for provider '{integration.provider}' in this build, "
        f"so nothing was requested from {integration.display_name or integration.provider}. "
        f"The stored sync state is unchanged (last result: {integration.last_sync_status}"
        + (f" — {integration.last_sync_error}" if integration.last_sync_error else "")
        + ")."
    )
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="integration.sync.not_attempted",
        object_type="integration",
        object_id=integration.id,
        object_label=integration.display_name or integration.provider,
        summary=(
            f"Sync requested (scope: {payload.scope}). No provider client exists in this build, "
            "so the provider was not contacted and last_sync_* was left unchanged."
        ),
        # Nothing changed, so nothing is snapshotted. NULL is "not captured";
        # an empty object would read as "the row was blank".
        before=None,
        after=None,
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    return IntegrationSyncResult(
        integration_id=integration.id,
        attempted=False,
        status=SYNC_NOT_ATTEMPTED,
        courses_imported=0,
        completions_synced=0,
        error=error,
        synced_at=None,
        last_sync_status=integration.last_sync_status,
        last_sync_at=integration.last_sync_at,
    )


@router.post("/{integration_id}/disable", response_model=IntegrationOut)
def disable(
    integration_id: int,
    payload: IntegrationDisable,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Stop using an integration, on the record.

    ``last_sync_*`` is preserved: how the connection was last actually behaving
    is the context somebody will need when deciding whether to turn it back on.
    """
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="A reason is required to disable an integration.")

    integration = _integration_or_404(db, integration_id)
    if integration.status == IntegrationStatus.DISABLED:
        raise HTTPException(status_code=409, detail="Integration is already disabled")

    before = {"status": integration.status}
    integration.status = IntegrationStatus.DISABLED
    integration.updated_at = utcnow()
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="integration.disable",
        object_type="integration",
        object_id=integration.id,
        object_label=integration.display_name or integration.provider,
        summary=f"Disabled {integration.display_name or integration.provider}: {reason}",
        before=before,
        after={"status": integration.status},
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(integration)
    return integration


@router.get("/{integration_id}/courses", response_model=ExternalCoursePage)
def list_courses(
    integration_id: int,
    q: str | None = None,
    active: bool | None = None,
    mapped: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_exec),
):
    """The provider's catalogue as last imported, with its provenance attached.

    ``mapped`` filters on whether a human has claimed the course moves one of
    our behaviours — the provider's own topic tags do not count as a mapping.
    """
    limit, offset = max(1, min(limit, MAX_PAGE)), max(0, offset)
    integration = _integration_or_404(db, integration_id)

    conditions = [ExternalCourse.integration_id == integration.id]
    if active is not None:
        conditions.append(ExternalCourse.active == active)
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        conditions.append(
            or_(
                ExternalCourse.title.ilike(pattern, escape="\\"),
                ExternalCourse.description.ilike(pattern, escape="\\"),
                ExternalCourse.external_ref.ilike(pattern, escape="\\"),
            )
        )

    rows = db.execute(
        select(ExternalCourse).where(*conditions).order_by(ExternalCourse.id)
    ).scalars().all()
    if mapped is not None:
        # Filtered in Python: "has at least one mapped behaviour" is a question
        # about JSON list contents, which SQLite and PostgreSQL do not answer the
        # same way. The set is bounded by one provider's catalogue.
        rows = [r for r in rows if bool(r.mapped_behaviors) is mapped]

    total = len(rows)
    window = rows[offset : offset + limit]
    return ExternalCoursePage(
        items=[ExternalCourseOut.model_validate(c) for c in window],
        total=total,
        limit=limit,
        offset=offset,
        truncated=offset + len(window) < total,
        last_sync_status=integration.last_sync_status,
        last_sync_at=integration.last_sync_at,
        catalogue_note=_catalogue_note(integration, len(window), total),
    )


@router.post("/courses/{course_id}/map", response_model=ExternalCourseOut)
def map_course(
    course_id: int,
    payload: ExternalCourseMapping,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Assert which of our behaviours a third-party course actually moves.

    Recorded as a human's claim, with before and after, because targeting later
    depends on it: an over-claimed mapping sends the wrong people to the wrong
    course and the run afterwards reads as a training failure.
    """
    course = db.get(ExternalCourse, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="External course not found")

    behaviors = [b.strip() for b in payload.mapped_behaviors if b and b.strip()]
    before = {
        "mapped_behaviors": list(course.mapped_behaviors or []),
        "topics": list(course.topics or []),
    }
    # Reassigned rather than mutated: SQLAlchemy compares JSON by equality.
    course.mapped_behaviors = behaviors
    if payload.topics is not None:
        course.topics = [t.strip() for t in payload.topics if t and t.strip()]

    summary = (
        f"Mapped '{course.title}' to {', '.join(behaviors)}."
        if behaviors
        else f"Removed every behaviour mapping from '{course.title}'."
    )
    if payload.note.strip():
        summary += f" {payload.note.strip()}"
    ip, agent = _client(request)
    record(
        db,
        actor=user,
        action="integration.course.map",
        object_type="external_course",
        object_id=course.id,
        object_label=course.external_ref or course.title,
        summary=summary,
        before=before,
        after={
            "mapped_behaviors": list(course.mapped_behaviors),
            "topics": list(course.topics or []),
        },
        ip_address=ip,
        user_agent=agent,
    )
    db.commit()
    db.refresh(course)
    return course
