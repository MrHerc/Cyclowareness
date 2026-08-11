"""Cyclowareness Sandbox API — submit a sample, watch it analysed, read the
verdict, export it.

The engine behind these routes is vendored verbatim from the standalone
Cyclowareness Sandbox (`app/sandbox/engine/`), so a verdict reached here and a
verdict reached there are reached by the same code. This module is the portal's
half: its users, its roles, its awareness loop.

Analysis runs on the task runner, not inside the request, for a reason beyond
latency: a request that blocks for the length of a full analysis is a request an
attacker can hold open to exhaust the server. Submission returns a job id
immediately; the client polls.

Every mutating route is analyst-only. File analysis is a privileged operation —
it accepts hostile input by design — and must never be exposed to an employee
account, let alone anonymously.

Nothing here executes a sample. Static parsers and YARA run in-process;
detonation happens only on the off-host worker, through `routers/sandbox_dynamic.py`.
"""
from __future__ import annotations

import logging
import math

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..core.task_runner import get_task_runner
from ..database import get_db, session_scope
from ..models import User
from ..sandbox import handoff, links as links_mod
from ..sandbox.engine import attestation, incident as incident_mod, pipeline, report as report_mod
from ..sandbox.engine.fetcher import FetchFailed, UnsafeURL, fetch
from ..sandbox.engine.models import Feedback, JobSource, JobStatus, SandboxJob
from ..sandbox.engine.storage import EmptySample, QuarantineFull, SampleTooLarge, store_stream
from ..sandbox.links import SandboxJobLink
from ..sandbox.schemas import (
    FamilyCount,
    FeedbackRequest,
    JobDetail,
    JobPage,
    JobStats,
    JobSummary,
    PasswordRequest,
    SubmitURLRequest,
)
from ..security import require_analyst

logger = logging.getLogger("sandbox.api")

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

#: The largest `offset` this endpoint accepts. Not a guess at a real table size:
#: a number far past any deployment this product can physically hold, that still
#: leaves the arithmetic nowhere near int64's edge — an unbounded offset reaches
#: Postgres, whose OFFSET is a bigint, and one past int64 comes back as a 500.
MAX_OFFSET = 1_000_000_000

#: A verdict the engine actually issued, as opposed to the absence of one. The
#: column is JSON and may be NULL, `{}`, or hold a verdict this version does not
#: know about; only these three count as classified.
_VERDICTS = ("malicious", "suspicious", "clean")

#: A classified job needs attention unless it is clean; an unclassified one
#: needs attention on score alone. Kept in one place because two definitions of
#: "needs attention" is a defect waiting to happen.
_ATTENTION_FLOOR = 30.0


def _job_or_404(db: Session, public_id: str) -> SandboxJob:
    job = db.execute(
        select(SandboxJob).where(SandboxJob.public_id == public_id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


def _loop_run_id(db: Session, job: SandboxJob) -> int | None:
    """The awareness loop run that raised this job, if one did."""
    link = db.get(SandboxJobLink, job.id)
    return link.loop_run_id if link else None


def _detail(db: Session, job: SandboxJob, children=None) -> JobDetail:
    return JobDetail.of(job, children=children, loop_run_id=_loop_run_id(db, job))


def _analyse_in_background(job_id: int, password: str | None = None) -> None:
    """Run one job on its own session, off the request thread."""
    db = session_scope()
    try:
        job = db.get(SandboxJob, job_id)
        if job is None:
            return
        pipeline.run(db, job, password=password)
        db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("background analysis crashed for job %s", job_id)
    finally:
        db.close()


async def _run_async(job_id: int, password: str | None = None) -> None:
    """Adapter so the synchronous pipeline runs on the task runner.

    The task runner drives coroutines; analysis is CPU/parse-bound and
    synchronous, so it is handed to a thread to avoid blocking the event loop
    (and with it every other request and the live loop stream).
    """
    import anyio

    await anyio.to_thread.run_sync(_analyse_in_background, job_id, password)


def _queue(job: SandboxJob, password: str | None = None, *, suffix: str = "") -> None:
    get_task_runner().submit(
        _run_async(job.id, password), name=f"sandbox-{job.public_id}{suffix}"
    )


def _link(db: Session, job: SandboxJob, *, user_id: int | None = None,
          loop_run_id: int | None = None) -> None:
    """Record what the portal knows about this job that the engine does not."""
    db.add(SandboxJobLink(job_id=job.id, submitted_by_user_id=user_id,
                          loop_run_id=loop_run_id))


# --- capability disclosure ---------------------------------------------------
def _dynamic_state(settings: Settings) -> tuple[bool, str | None]:
    """Whether behaviour can actually be observed here, and if not, what is missing.

    TWO SWITCHES, AND THEY CAN DISAGREE. `SANDBOX_DYNAMIC_WORKER` is the engine's
    declaration that an operator has attached isolated hardware.
    `DYNAMIC_WORKER_TOKEN` is the credential that lets that hardware post its
    findings back. Either one alone is a half-configured deployment, and reading
    only the first is how this endpoint came to report "static analysis only" on
    a deployment whose ingest seam was open and had already accepted a detonation
    report — the UI told an analyst the sample had never been run while its own
    report page showed the behaviour.

    So: available when both are set; otherwise say which one is missing, because
    "no worker attached" and "a worker is attached but cannot report" send an
    operator to two different places.
    """
    from ..sandbox.engine import native

    declared = native.dynamic_available()
    ingest_open = bool((settings.dynamic_worker_token or "").strip())

    if declared and ingest_open:
        return True, None
    if declared and not ingest_open:
        return False, (
            "A dynamic worker is declared for this deployment, but no "
            "DYNAMIC_WORKER_TOKEN is configured — so the worker cannot post its "
            "findings back and the ingest endpoints refuse every request. "
            "Nothing has been detonated."
        )
    if ingest_open and not declared:
        # A TOKEN IS A CREDENTIAL, NOT HARDWARE. This branch used to return True,
        # and the docstring three lines above it says both switches are required
        # — so the code contradicted its own comment in the flattering direction.
        #
        # What that produced, live: `/api/sandbox/capabilities` answered
        # `dynamic_worker: true`, the UI drew the green panel reading "Samples
        # are parsed and also executed under supervision", and the one job on
        # the estate said in its own tier record "the sample was not run - only
        # statically analysed". Two screens of the same deployment making
        # opposite claims about whether hostile code had been executed, with the
        # analyst reading a verdict as though a behavioural tier stood behind it.
        return False, (
            "A DYNAMIC_WORKER_TOKEN is configured, but SANDBOX_DYNAMIC_WORKER is "
            "not set, so no worker has been declared for this deployment and none "
            "has claimed a job. Nothing has been detonated. Set both to open the "
            "tier — the token lets a worker post its findings back, the flag is "
            "the operator's statement that the isolated hardware really exists."
        )
    return False, native.unavailable_reason()


@router.get("/capabilities")
def sandbox_capabilities(settings: Settings = Depends(get_settings)):
    """Which analyzers and tiers this deployment actually has.

    The UI reads this so it can state, honestly, what it can and cannot do on
    this host — how many YARA rules loaded, whether behaviour can be observed at
    all — instead of implying a capability that is not present.
    """
    from ..sandbox.engine import analyzers, storage, yara_engine

    yara_status: dict = {"loaded": 0}
    try:
        raw = yara_engine.rules_loaded()
        yara_status = {
            "loaded": raw.get("rules_active", raw.get("loaded", 0)),
            "files": raw.get("files_loaded"),
            "failed": raw.get("failed_files") or None,
            "available": raw.get("available", True),
        }
    except Exception as exc:  # noqa: BLE001
        yara_status = {"loaded": 0, "error": f"{type(exc).__name__}"}

    dynamic_ready, dynamic_reason = _dynamic_state(settings)

    # WHERE THIS DEPLOYMENT'S SAMPLES GO. The engine has always been able to say
    # — `integrations.capability_report()` describes every open-source sandbox it
    # can hand a file to — and the portal never asked. So a deployment with
    # CAPEV2_URL or CUCKOO_URL set uploads every detonatable sample to a third
    # party, and no screen and no API response named the engine or the
    # destination: `dynamic_worker: true` and nothing more.
    #
    # It publishes no secrets. `Engine.describe()` emits `configured` as a bool
    # and never the credential; the variable NAMES appear only inside the
    # human-readable `requires` line, which is documentation.
    try:
        from ..sandbox.engine.integrations import capability_report

        integrations = capability_report()
    except Exception:  # noqa: BLE001 — the integrations layer is optional
        integrations = []

    return {
        "integrations": integrations,
        # PUBLISHED SO THE LIMIT CAN BE STATED BEFORE THE UPLOAD, not after it.
        # `SampleTooLarge` already names the ceiling, but only once somebody has
        # sent a file and waited for it to be refused.
        "max_sample_mb": settings.max_sample_mb,
        "static_analyzers": sorted(analyzers.all_names()),
        "unavailable_analyzers": analyzers.unavailable_analyzers(),
        "yara": yara_status,
        # WOULD THE KERNEL REFUSE TO RUN A FILE IN THE QUARANTINE. Arrived with
        # the re-vendor and published nowhere until now — the same half-applied
        # shape the engine drift keeps producing. It is a real security fact:
        # True/False read from /proc/mounts, None where that cannot be read.
        # The docs asserted `noexec`; the standalone measured a live host that
        # did not have it and 1,362 samples on a plain rw mount, so the product
        # reports the fact rather than repeating the claim.
        "quarantine_noexec": storage.quarantine_is_noexec(),
        # Detonation needs an isolated worker the web host does not provide.
        # The UI states this rather than pretending otherwise.
        "dynamic_worker": dynamic_ready,
        "dynamic_unavailable_reason": dynamic_reason,
        "supported_extensions": [
            ".exe", ".dll", ".sys", ".ps1", ".js", ".vbs", ".bat", ".cmd",
            ".py", ".sh", ".hta", ".elf", ".bin", ".so", ".jar", ".apk",
            ".lnk", ".rtf", ".iso", ".img", ".vhd",
            ".zip", ".rar", ".7z", ".pdf", ".doc", ".docx", ".xls", ".xlsx",
            ".ppt", ".pptx",
        ],
    }


# --- hand-off to the standalone deployment -----------------------------------
@router.post("/app-session")
def app_session(
    user: User = Depends(require_analyst),
    settings: Settings = Depends(get_settings),
):
    """Mint a session for the standalone Cyclowareness Sandbox, for this analyst.

    The standalone is a separate product with its own database and its own chain
    of custody. This portal links to it rather than re-implementing it, and this
    is the whole of the integration: an analyst who is already signed in here
    does not sign in again there.

    THE TOKEN NAMES THE PERSON. It would be less work to hold one shared
    standalone credential and hand the same session to all 26 portal users, and
    the standalone's audit trail would then record `analyst` for every action
    any of them took — hollowing out the one claim that product is sold on. The
    subject is this user's own address.

    404, not 501, when unconfigured: to a client, an integration the operator
    has not set up is indistinguishable from one this build does not have, and
    404 is the honest shape for "there is nothing at this address here".
    """
    if not settings.sandbox_app_url:
        raise HTTPException(status_code=404, detail="No standalone sandbox is configured")
    try:
        token, expires_at = handoff.mint(
            user.email,
            secret=settings.sandbox_app_secret,
            ttl_minutes=settings.sandbox_app_ttl_minutes,
            tenant=settings.sandbox_app_tenant,
        )
    except handoff.HandoffUnavailable as exc:
        # The secret is missing while a URL is set — a half-configured link.
        # Saying so beats a 401 from the other product that nobody can explain.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "url": settings.sandbox_app_url.rstrip("/"),
        "token": token,
        "subject": user.email,
        "expires_at": expires_at,
    }


# --- submission --------------------------------------------------------------
@router.post("/upload", response_model=JobDetail, status_code=201)
async def upload(
    file: UploadFile = File(...),
    password: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
    settings: Settings = Depends(get_settings),
):
    """Submit a file. The bytes are streamed straight into quarantine."""
    try:
        stored = store_stream(file.file, max_bytes=settings.max_sample_mb * 1024 * 1024)
    except SampleTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except QuarantineFull as exc:
        # 507 Insufficient Storage, not 500: this is a fault on the operator's
        # volume, and a 5xx that reads as a bug sends them looking in the
        # application. The message names the remedy, so it is passed through.
        raise HTTPException(status_code=507, detail=str(exc)) from exc
    except EmptySample as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        await file.close()

    job = pipeline.new_job(
        db,
        stored,
        original_name=file.filename or "upload",
        source=JobSource.UPLOAD,
        submitted_by=user.email,
        tenant=links_mod.TENANT,
    )
    db.flush()
    _link(db, job, user_id=user.id)
    db.commit()
    _queue(job, password)
    db.refresh(job)
    return _detail(db, job)


@router.post("/url", response_model=JobDetail, status_code=201)
def submit_url(
    payload: SubmitURLRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
    settings: Settings = Depends(get_settings),
):
    """Submit a URL. The server downloads it — after refusing to fetch anything
    that resolves to a private, loopback or cloud-metadata address."""
    try:
        fetched = fetch(payload.url, max_bytes=settings.max_sample_mb * 1024 * 1024)
    except UnsafeURL as exc:
        raise HTTPException(status_code=422, detail=f"Refusing to fetch: {exc}") from exc
    except SampleTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except QuarantineFull as exc:
        raise HTTPException(status_code=507, detail=str(exc)) from exc
    except FetchFailed as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    job = pipeline.new_job(
        db,
        fetched.stored,
        original_name=fetched.suggested_name,
        source=JobSource.URL,
        submitted_url=payload.url[:2000],
        submitted_by=user.email,
        tenant=links_mod.TENANT,
    )
    db.flush()
    _link(db, job, user_id=user.id)
    db.commit()
    _queue(job)
    db.refresh(job)
    return _detail(db, job)


# --- job-centric actions -----------------------------------------------------
@router.post("/jobs/{public_id}/password", response_model=JobDetail)
def provide_password(
    public_id: str,
    payload: PasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Supply the password for an encrypted archive that parked itself.

    The password is used once and never stored — supplying it is the deliberate
    analyst action the design requires, and the engine does not brute-force.
    """
    job = _job_or_404(db, public_id)
    if job.status != JobStatus.AWAITING_PASSWORD:
        raise HTTPException(status_code=409, detail="This job is not waiting for a password")
    db.commit()
    _queue(job, payload.password, suffix="-pw")
    db.refresh(job)
    return _detail(db, job)


@router.post("/jobs/{public_id}/reanalyze", response_model=JobDetail)
def reanalyze(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Re-run analysis on the same quarantined bytes (e.g. after new YARA rules)."""
    job = _job_or_404(db, public_id)
    if job.status == JobStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Analysis is already running")
    if job.sample_deleted_at is not None:
        raise HTTPException(
            status_code=409,
            detail="The sample for this job has been deleted by retention; there is nothing left to re-analyse",
        )
    job.status = JobStatus.QUEUED
    db.commit()
    _queue(job, suffix="-re")
    db.refresh(job)
    return _detail(db, job)


@router.post("/jobs/{public_id}/feedback", response_model=JobDetail)
def submit_feedback(
    public_id: str,
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Record an analyst's dispute of a verdict — the engine's feedback loop."""
    if payload.verdict not in (Feedback.FALSE_POSITIVE, Feedback.TRUE_POSITIVE):
        raise HTTPException(
            status_code=422, detail="verdict must be false_positive or true_positive"
        )
    job = _job_or_404(db, public_id)
    job.feedback = payload.verdict
    job.feedback_note = (payload.note or "")[:2000] or None
    db.commit()
    db.refresh(job)
    return _detail(db, job)


# --- reading the queue -------------------------------------------------------
def _scope(status: str | None = None) -> list:
    """The rows a caller may see, before any paging.

    Scoped BEFORE the limit, never after: filtering a page of results in Python
    would silently shrink every page.
    """
    conditions = [
        # Top-level jobs only; archive members are shown nested under their parent.
        SandboxJob.parent_job_id.is_(None),
    ]
    if status:
        conditions.append(SandboxJob.status == status)
    return conditions


@router.get("/jobs", response_model=JobPage)
def list_jobs(
    # Shaped, not just typed. An unshaped status goes to the driver as whatever
    # arrived, and `?status=%00` is a 500 in text/plain on Postgres. A status is
    # a lower-case word; nothing else can reach the query.
    status: str | None = Query(default=None, max_length=24, pattern=r"^[a-z_]+$"),
    # Bounded at the edge rather than with `min(limit, 200)`: that lets a
    # negative through, and SQLite reads `LIMIT -1` as unbounded — one
    # authenticated `?limit=-1` would serialise the whole table.
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=MAX_OFFSET),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """One page of the queue, with the total the caller needs to page through it."""
    # A status no job can hold is a caller mistake, not an empty result.
    # `?status=zzz` returning `200 []` is byte-identical to the answer for
    # `?status=failed` on a healthy deployment, and means something completely
    # different — so a typo in a dashboard filter would read as "nothing failed".
    if status is not None and status not in JobStatus.ALL:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown status {status!r}. A job's status is one of: "
                + ", ".join(JobStatus.ALL)
            ),
        )
    conditions = _scope(status)
    total = db.execute(
        select(func.count()).select_from(SandboxJob).where(*conditions)
    ).scalar_one()
    rows = db.execute(
        select(SandboxJob)
        .where(*conditions)
        .order_by(SandboxJob.created_at.desc(), SandboxJob.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    return JobPage(
        items=[JobSummary.of(j) for j in rows],
        total=int(total or 0),
        limit=limit,
        offset=offset,
    )


@router.get("/jobs/stats", response_model=JobStats)
def job_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Counts over EVERY job, not over one page of them.

    A dashboard cannot be honest by paging: the page limit is smaller than the
    table will be, so counts computed from a page are a property of how many
    rows the last poll happened to fetch. They have to be counted where the rows
    are.
    """
    scope = _scope()
    verdict_of = SandboxJob.verdict["verdict"].as_string()
    is_done = SandboxJob.status == JobStatus.COMPLETED

    attention = (
        verdict_of.in_(("malicious", "suspicious"))
        | (~verdict_of.in_(_VERDICTS) & (SandboxJob.final_score >= _ATTENTION_FLOOR))
        | (verdict_of.is_(None) & (SandboxJob.final_score >= _ATTENTION_FLOOR))
    )

    def _tally(condition):
        return func.sum(case((condition, 1), else_=0))

    # ONE pass over the rows for all seven figures, not seven. Seven separate
    # statements are seven separate snapshots, so a single response could carry
    # `completed: 20` beside `needs_attention: 220` on a deployment ingesting
    # continuously — a donut totalling one number next to bars totalling another.
    counts = db.execute(
        select(
            func.count(),
            _tally(is_done),
            _tally(SandboxJob.status.in_([JobStatus.QUEUED, JobStatus.RUNNING])),
            *[_tally(is_done & (verdict_of == name)) for name in _VERDICTS],
            _tally(is_done & attention),
            func.avg(case((is_done, SandboxJob.final_score))),
        ).where(*scope)
    ).one()
    total, done, in_flight, n_mal, n_susp, n_clean, needs_attention, average = counts

    completed = int(done or 0)
    verdicts = {
        "malicious": int(n_mal or 0),
        "suspicious": int(n_susp or 0),
        "clean": int(n_clean or 0),
    }
    # Whatever is left: NULL verdicts, `{}`, and any verdict a later version
    # introduces. Derived rather than counted so the four keys the UI draws
    # always add up to `completed` — a donut that does not sum is a donut that
    # is wrong about something.
    verdicts["unclassified"] = completed - sum(verdicts.values())

    families = [
        FamilyCount(family=name, count=int(n))
        for name, n in db.execute(
            select(SandboxJob.family, func.count())
            .where(*scope)
            .group_by(SandboxJob.family)
            .order_by(func.count().desc(), SandboxJob.family)
        ).all()
    ]

    # Verdict first, magnitude second — a malicious sample outranks a suspicious
    # one whatever their scores, which is the whole point of having a verdict.
    rank = case({"malicious": 2, "suspicious": 1}, value=verdict_of, else_=0)
    top_risk = db.execute(
        select(SandboxJob)
        .where(*scope, is_done, attention)
        .order_by(rank.desc(), SandboxJob.final_score.desc(), SandboxJob.id.desc())
        .limit(5)
    ).scalars().all()

    # `average or 0.0` is not enough on its own: NaN is truthy, so one legacy
    # row with a non-finite score would carry NaN out through the single field
    # here that is an average rather than a count, and the dashboard calls
    # `.toFixed()` on it — blanking the page rather than one tile.
    mean = float(average) if average is not None else 0.0
    if not math.isfinite(mean):
        mean = 0.0

    return JobStats(
        total=int(total or 0),
        completed=completed,
        in_flight=int(in_flight or 0),
        verdicts=verdicts,
        needs_attention=int(needs_attention or 0),
        average_score=round(mean, 1),
        families=families,
        top_risk=[JobSummary.of(j) for j in top_risk],
    )


@router.get("/jobs/{public_id}", response_model=JobDetail)
def get_job(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    job = _job_or_404(db, public_id)
    children = db.execute(
        select(SandboxJob)
        .where(SandboxJob.parent_job_id == job.id)
        .order_by(SandboxJob.final_score.desc())
    ).scalars().all()
    return _detail(db, job, children=children)


# --- exports -----------------------------------------------------------------
def _attachment(job: SandboxJob, suffix: str) -> dict[str, str]:
    safe = "".join(
        c for c in (job.original_name or "") if c.isalnum() or c in "._-"
    )[:60]
    return {
        "Content-Disposition": (
            f'attachment; filename="cyclowareness-{safe or job.public_id}{suffix}"'
        )
    }


@router.get("/jobs/{public_id}/export.json")
def export_json(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    return report_mod.as_json(_job_or_404(db, public_id))


@router.get("/jobs/{public_id}/export.stix")
def export_stix(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    return report_mod.as_stix(_job_or_404(db, public_id))


@router.get("/jobs/{public_id}/export.incident")
def export_incident(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """The same evidence laid out in the fields a regulator asks for.

    The JSON and STIX exports serve an analyst and a threat-intel platform. This
    one serves the compliance function that has 24 hours under NIS2 Article
    23(4)(a) to send an early warning and needs the technical facts already
    sorted into the shape the notification takes. It is explicitly a draft: the
    fields only the entity can answer are emitted empty and named, and the record
    says on its face that it is not a filing.
    """
    return incident_mod.build(_job_or_404(db, public_id))


@router.get("/jobs/{public_id}/export.signed")
def export_signed(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
    settings: Settings = Depends(get_settings),
):
    """The report as evidence: engine manifest, canonical bytes, detached signature.

    The other exports are views for a human or a threat-intel platform. This one
    is for a recipient who does not trust us — a regulator, opposing counsel, an
    insurer — and who must be able to check, offline and with no access to this
    system, that the bytes in front of them are the bytes this deployment
    produced.

    Without a SIGNING_KEY the document is still produced in full, and says
    plainly that it is unsigned rather than implying an assurance it lacks.
    """
    return attestation.attest(_job_or_404(db, public_id), settings=settings)


@router.get("/jobs/{public_id}/export.pdf")
def export_pdf(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    job = _job_or_404(db, public_id)
    return Response(
        content=report_mod.as_pdf(job),
        media_type="application/pdf",
        headers=_attachment(job, ".pdf"),
    )


# Deliberately unauthenticated: a public key only an authenticated analyst can
# fetch cannot be used by the outside party the signature exists to convince. It
# publishes nothing but the public half of a signing key.
@router.get("/attestation/pubkey")
def attestation_pubkey(settings: Settings = Depends(get_settings)):
    """This deployment's Ed25519 public key, so a recipient can verify alone."""
    return attestation.public_key_info(settings)
