"""ZORBOX API — submit a sample, watch it analysed, read the verdict, export it.

Analysis runs on the task runner, not inside the request, for a reason beyond
latency: a request that blocks for the length of a full analysis is a request an
attacker can hold open to exhaust the server. Submission returns a job id
immediately; the client polls, exactly as the awareness dashboard already does.

Every mutating route is analyst-only. File analysis is a privileged operation —
it accepts hostile input by design — and must never be exposed to an employee
account, let alone anonymously.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, session_scope
from ..core.task_runner import get_task_runner
from ..models import User
from ..sandbox import pipeline, report as report_mod
from ..sandbox.fetcher import FetchFailed, UnsafeURL, fetch
from ..sandbox.models import Feedback, JobSource, JobStatus, SandboxJob
from ..sandbox.schemas import (
    FeedbackRequest,
    JobDetail,
    JobSummary,
    PasswordRequest,
    SubmitURLRequest,
)
from ..sandbox.storage import EmptySample, SampleTooLarge, store_stream
from ..security import require_analyst

logger = logging.getLogger("zorbox.api")

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


def _job_or_404(db: Session, public_id: str) -> SandboxJob:
    job = db.execute(
        select(SandboxJob).where(SandboxJob.public_id == public_id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


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


def _dynamic_available() -> bool:
    from ..sandbox import native

    return native.dynamic_available()


@router.get("/capabilities")
def sandbox_capabilities():
    """Which analyzers and tiers this deployment actually has.

    The UI reads this so it can state, honestly, what it can and cannot do on
    this host — how many YARA rules loaded, whether a dynamic worker is
    attached — instead of implying a capability that is not present.
    """
    from ..sandbox import analyzers

    yara_status: dict = {"loaded": 0}
    try:
        from ..sandbox import yara_engine

        raw = yara_engine.rules_loaded()
        # Normalise to the `loaded` key the UI reads, keeping the rest for detail.
        yara_status = {
            "loaded": raw.get("rules_active", raw.get("loaded", 0)),
            "files": raw.get("files_loaded"),
            "failed": raw.get("failed_files") or None,
            "available": raw.get("available", True),
        }
    except Exception as exc:  # noqa: BLE001
        yara_status = {"loaded": 0, "error": f"{type(exc).__name__}"}

    return {
        "static_analyzers": list(analyzers.all_names()),
        "unavailable_analyzers": analyzers.unavailable_analyzers(),
        "yara": yara_status,
        # Dynamic detonation needs an isolated worker the web host does not
        # provide; the UI states this rather than pretending otherwise. See
        # sandbox/native.py for the worker contract.
        "dynamic_worker": _dynamic_available(),
        "supported_extensions": [
            ".exe", ".dll", ".sys", ".ps1", ".js", ".vbs", ".bat", ".cmd",
            ".py", ".sh", ".hta", ".elf", ".bin", ".so", ".jar", ".apk",
            ".zip", ".rar", ".7z", ".pdf", ".doc", ".docx", ".xls", ".xlsx",
            ".ppt", ".pptx",
        ],
    }


@router.post("/upload", response_model=JobDetail, status_code=201)
async def upload(
    file: UploadFile = File(...),
    password: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Submit a file. The bytes are streamed straight into quarantine."""
    try:
        stored = store_stream(file.file)
    except SampleTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except EmptySample as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        await file.close()

    job = pipeline.new_job(
        db,
        stored,
        original_name=file.filename or "upload",
        source=JobSource.UPLOAD,
        submitted_by_user_id=user.id,
    )
    db.commit()
    get_task_runner().submit(
        _run_async(job.id, password), name=f"zorbox-{job.public_id}"
    )
    db.refresh(job)
    return JobDetail.of(job)


@router.post("/url", response_model=JobDetail, status_code=201)
def submit_url(
    payload: SubmitURLRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Submit a URL. The server downloads it — after refusing to fetch anything
    that resolves to a private, loopback or cloud-metadata address."""
    try:
        fetched = fetch(payload.url)
    except UnsafeURL as exc:
        raise HTTPException(status_code=422, detail=f"Refusing to fetch: {exc}") from exc
    except SampleTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except FetchFailed as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    job = pipeline.new_job(
        db,
        fetched.stored,
        original_name=fetched.suggested_name,
        source=JobSource.URL,
        submitted_url=payload.url[:2000],
        submitted_by_user_id=user.id,
    )
    db.commit()
    get_task_runner().submit(_run_async(job.id), name=f"zorbox-{job.public_id}")
    db.refresh(job)
    return JobDetail.of(job)


@router.post("/jobs/{public_id}/password", response_model=JobDetail)
def provide_password(
    public_id: str,
    payload: PasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Supply the password for an encrypted archive that parked itself.

    The password is used once and never stored — supplying it is the deliberate
    analyst action the brief requires, and the engine does not brute-force.
    """
    job = _job_or_404(db, public_id)
    if job.status != JobStatus.AWAITING_PASSWORD:
        raise HTTPException(status_code=409, detail="This job is not waiting for a password")
    db.commit()
    get_task_runner().submit(
        _run_async(job.id, payload.password), name=f"zorbox-{job.public_id}-pw"
    )
    db.refresh(job)
    return JobDetail.of(job)


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
    job.status = JobStatus.QUEUED
    db.commit()
    get_task_runner().submit(_run_async(job.id), name=f"zorbox-{job.public_id}-re")
    db.refresh(job)
    return JobDetail.of(job)


@router.post("/jobs/{public_id}/feedback", response_model=JobDetail)
def submit_feedback(
    public_id: str,
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Record an analyst's dispute of a verdict — the feedback loop the brief asks for."""
    if payload.verdict not in (Feedback.FALSE_POSITIVE, Feedback.TRUE_POSITIVE):
        raise HTTPException(status_code=422, detail="verdict must be false_positive or true_positive")
    job = _job_or_404(db, public_id)
    job.feedback = payload.verdict
    job.feedback_note = (payload.note or "")[:2000] or None
    db.commit()
    db.refresh(job)
    return JobDetail.of(job)


@router.get("/jobs", response_model=list[JobSummary])
def list_jobs(
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    query = (
        select(SandboxJob)
        # Top-level jobs only; archive members are shown nested under their parent.
        .where(SandboxJob.parent_job_id.is_(None))
        .order_by(SandboxJob.created_at.desc())
        .limit(min(limit, 200))
    )
    if status:
        query = query.where(SandboxJob.status == status)
    return [JobSummary.of(j) for j in db.execute(query).scalars().all()]


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
    return JobDetail.of(job, children=children)


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


@router.get("/jobs/{public_id}/export.pdf")
def export_pdf(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    job = _job_or_404(db, public_id)
    pdf = report_mod.as_pdf(job)
    safe_name = "".join(c for c in (job.original_name or "report") if c.isalnum() or c in "._-")[:60]
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="zorbox-{safe_name or job.public_id}.pdf"'},
    )


async def _run_async(job_id: int, password: str | None = None) -> None:
    """Adapter so the synchronous pipeline runs on the task runner.

    The task runner drives coroutines; analysis is CPU/parse-bound and
    synchronous, so it is handed to a thread to avoid blocking the event loop
    (and with it every other request and the live loop stream).
    """
    import anyio

    await anyio.to_thread.run_sync(_analyse_in_background, job_id, password)
