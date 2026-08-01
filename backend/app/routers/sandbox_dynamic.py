"""The dynamic tier's HTTP seam.

The web application never detonates anything (see `sandbox/engine/native.py` for
why). Instead it defines the contract an off-host worker fulfils:

    GET  /api/dynamic/queue        -> jobs awaiting behavioural analysis
    GET  /api/dynamic/sample/{id}  -> the quarantined bytes to detonate
    POST /api/dynamic/report/{id}  -> the worker's findings, merged + re-scored

THE PREFIX IS `/api/dynamic`, NOT `/api/sandbox/dynamic`, AND THAT IS DELIBERATE.
Every other sandbox route in this application is namespaced under `/api/sandbox`,
so this one looks out of place — but the worker that fulfils this contract is a
separate program, already built and already running on the operator's detonation
host against the standalone Cyclowareness Sandbox. Namespacing these three routes
to match the rest of the portal would mean forking that worker, which is exactly
the drift this integration exists to prevent. One worker, one contract, either
deployment: the only thing an operator changes is the base URL.

The worker runs on hardware the operator controls — a Firejail/seccomp jail, a
Qiling emulator, a snapshotted VM behind a sinkhole. It authenticates with a
shared token, never an analyst session: it is infrastructure, not a user. When no
token is configured the whole seam is closed, because accepting externally
supplied "behaviour" into a verdict is a trust decision the operator must make
deliberately.

A stolen worker token buys every sample's bytes and the ability to fabricate
behaviour for any job. That makes it the widest credential in the system, and it
should be treated as such.
"""
from __future__ import annotations

import hmac
import logging
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..database import get_db
from ..platform import models as platform_models
from ..sandbox.engine import identify, scoring
from ..sandbox.engine.contracts import IOCs, AnalyzerResult, Signal
from ..sandbox.engine.models import JobSource, JobStatus, SandboxJob
from ..sandbox.engine.storage import quarantine_root
from ..sandbox.safejson import json_safe
from ..sandbox.schemas import DynamicReportIn, JobDetail

logger = logging.getLogger("sandbox.dynamic")

router = APIRouter(prefix="/api/dynamic", tags=["sandbox"])

#: Families a dynamic worker can meaningfully detonate or emulate. An RTF
#: exploit and a LNK command line are exactly what a detonation shows.
_DYNAMIC_FAMILIES = {"pe", "elf", "script", "office", "pdf", "rtf", "lnk"}


class _WorkerActor:
    """The audit trail's name for the detonation worker.

    Not a `User` row: the worker is infrastructure and has no account. It still
    has to appear in the trail under a name an auditor can read, because the
    ingest below is the single largest mutation this product performs on a
    verdict.
    """

    role = "worker"

    def __init__(self, name: str) -> None:
        self.email = f"worker:{name}"[:255]


def require_worker(
    x_worker_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    configured = (settings.dynamic_worker_token or "").strip()
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dynamic ingest is not enabled on this deployment (no worker token set)",
        )
    supplied = (x_worker_token or "").strip()
    if not supplied or not hmac.compare_digest(supplied, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid worker token"
        )
    return "worker"


def _looks_like_public_id(value: str) -> bool:
    """Could this string possibly be a job's public id?

    `public_id` is `str(uuid.uuid4())`, so anything that is not a UUID cannot
    match a row. It refuses one thing loudly: a NUL byte. PostgreSQL's driver
    raises `ValueError` on a NUL inside a text parameter, which is a 500 rather
    than a miss.
    """
    if not value or len(value) > 64 or "\x00" in value:
        return False
    try:
        uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


def _dynamic_is_attributable(job: SandboxJob) -> bool:
    """Can Windows run this file at all — and so, is the observed behaviour the
    SAMPLE's rather than the guest's?

    One definition, read by two callers that must not disagree: the queue uses it
    to decide whether to spend a guest, and ingest uses it to decide whether a
    report that arrives anyway may raise the score.

    Only `script` is gated. `identify()` puts every `text/*` mime in family
    `script`, so without this predicate LICENSE files, READMEs, man pages and CA
    bundles get sent to a live Windows VM — and every one comes back with signals
    describing what the GUEST did when asked to open something inert. A PE, an
    ELF, an Office document and a PDF all have an execution path by construction.
    """
    if job.family != "script":
        return True
    name = (job.original_name or job.archive_path or "").rsplit("/", 1)[-1]
    extension = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
    return identify.has_execution_path(extension, job.mime or "")


def _needs_dynamic(job: SandboxJob) -> bool:
    tiers = job.tiers or {}
    dynamic = tiers.get("dynamic") or {}
    if dynamic.get("ran"):
        return False
    # A sandbox that declined this sample will decline it again — the request is
    # byte-identical. Without this, samples a worker refuses are re-downloaded,
    # re-submitted and re-refused on every poll, forever.
    if dynamic.get("refused"):
        return False
    if job.status != JobStatus.COMPLETED or job.family not in _DYNAMIC_FAMILIES:
        return False
    # The bytes are gone, so there is nothing to detonate. Retention purges the
    # quarantined file and leaves the row, which still reads "detonation has not
    # run" — so without this the worker is offered a job it can never complete on
    # every poll, and the queue being oldest-first, it is offered FIRST.
    if job.sample_deleted_at is not None:
        return False
    if not _dynamic_is_attributable(job):
        return False
    return True


#: A file extension, and nothing else: one dot, then 1-8 ASCII alphanumerics.
_SUFFIX_RE = re.compile(r"^[A-Za-z0-9]{1,8}$")


def _safe_suffix(original_name: str | None) -> str:
    """The submitted name's extension, sanitised — or "" if there isn't a sane one.

    A detonation sandbox chooses how to *run* a sample from its file name. Handed
    a meaningless extension, CAPEv2 falls back to its generic package, and a rich
    PowerShell detonation quietly becomes a thin one. Nothing errors; the
    behavioural evidence is just much weaker.

    The extension is the only part of an attacker-controlled string propagated to
    the worker, and only when it matches `_SUFFIX_RE`: no dots, separators,
    spaces or non-ASCII survive, so nothing here can climb a path or smuggle a
    second extension past the sandbox's own parsing.
    """
    if not original_name or "." not in original_name:
        return ""
    ext = original_name.rsplit(".", 1)[1]
    # fullmatch, not match: in Python `$` also matches immediately before a
    # trailing newline, so `.exe\n` would survive — a newline in a value that
    # goes on to build a Content-Disposition header and a path on the worker.
    return f".{ext.lower()}" if _SUFFIX_RE.fullmatch(ext) else ""


@router.get("/queue")
def dynamic_queue(
    limit: int = 20,
    db: Session = Depends(get_db),
    _worker: str = Depends(require_worker),
):
    """Completed jobs whose dynamic tier has not run yet — the worker's work list.

    Two things here are load-bearing.

    **Oldest first.** Newest-first starves a backlog under sustained submission:
    freshly finished jobs keep arriving at the head of the queue and anything
    that missed its turn is never offered again.

    **Filter, then limit.** `_needs_dynamic` reads a JSON column, so it runs in
    Python — and applying LIMIT in SQL first means fetching N rows, discarding
    the ones already detonated, and returning whatever is left. Once the newest N
    have all run, that returns an EMPTY queue while the backlog sits untouched.
    """
    wanted = min(max(limit, 1), 100)
    #: How far one poll may walk. A worker polls every few seconds, so a page it
    #: cannot fill this time it fills on the next one.
    SCAN_CEILING = 2000
    PAGE = 200

    candidates: list[SandboxJob] = []
    offset = 0
    while len(candidates) < wanted and offset < SCAN_CEILING:
        page = db.execute(
            select(SandboxJob)
            .where(SandboxJob.status == JobStatus.COMPLETED)
            .where(SandboxJob.family.in_(tuple(_DYNAMIC_FAMILIES)))
            .order_by(SandboxJob.created_at.asc())
            .offset(offset)
            .limit(PAGE)
        ).scalars().all()
        if not page:
            break
        candidates.extend(j for j in page if _needs_dynamic(j))
        offset += PAGE

    return [
        {
            "public_id": j.public_id,
            "sha256": j.sha256,
            "family": j.family,
            "size_bytes": j.size_bytes,
            "sample_url": f"/api/dynamic/sample/{j.public_id}",
            # So the worker can write the sample to a path the sandbox will
            # recognise. See _safe_suffix.
            "suffix": _safe_suffix(j.original_name),
        }
        for j in candidates[:wanted]
    ]


@router.get("/sample/{public_id}")
def dynamic_sample(
    request: Request,
    public_id: str,
    db: Session = Depends(get_db),
    _worker: str = Depends(require_worker),
):
    """Hand the quarantined bytes to the worker for detonation.

    The path is derived from the content hash, never from a submitted name, and
    the endpoint is reachable only with the worker token.
    """
    if not _looks_like_public_id(public_id):
        raise HTTPException(status_code=404, detail="Job not found")
    job = db.execute(
        select(SandboxJob).where(SandboxJob.public_id == public_id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    path = quarantine_root() / job.sha256[:2] / job.sha256
    if not path.is_file():
        raise HTTPException(status_code=410, detail="Sample no longer in quarantine")

    # The only point at which a sample LEAVES this system. Everything else in the
    # chain of custody records something done to the evidence here; this hands
    # the raw bytes to another machine. "Was this sample ever copied off the
    # platform, and where to" is the first question a data-protection review
    # asks, and without this the answer lives in nothing but a proxy log.
    platform_models.record(
        db,
        actor=_WorkerActor("detonation"),
        action="sandbox.sample_released_to_worker",
        object_type="sandbox_job",
        object_id=job.id,
        object_label=job.public_id,
        summary="Quarantined sample released to the off-host detonation worker",
        after={"sha256": job.sha256, "size_bytes": job.size_bytes},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    return FileResponse(
        str(path),
        media_type="application/octet-stream",
        # Content hash plus the sanitised original extension — never the
        # submitted string. The extension is load-bearing for the sandbox's
        # package selection; see _safe_suffix.
        filename=f"{job.sha256}{_safe_suffix(job.original_name)}",
    )


def _result_from_stored(name: str, payload: dict) -> AnalyzerResult:
    signals = [
        Signal(
            id=s.get("id", ""),
            title=s.get("title", ""),
            severity=s.get("severity", "info"),
            detail=s.get("detail", ""),
            evidence=s.get("evidence", {}) or {},
        )
        for s in payload.get("signals", [])
    ]
    iocs_dict = payload.get("iocs", {}) or {}
    iocs = IOCs(**{f: list(iocs_dict.get(f, []) or []) for f in IOCs.FIELDS})
    return AnalyzerResult(
        analyzer=name,
        ran=bool(payload.get("ran", True)),
        unavailable_reason=payload.get("unavailable_reason"),
        signals=signals,
        facts=payload.get("facts", {}) or {},
        iocs=iocs,
        duration_ms=int(payload.get("duration_ms", 0) or 0),
    )


#: A detonation produces tens to hundreds of interesting events. A worker that
#: sends a hundred thousand produces a graph with a hundred thousand nodes in it,
#: which is a blank tab and a pinned CPU on the analyst's laptop.
_MAX_TIMELINE = 2000
#: Long enough for a command line, short enough that a hostile worker cannot use
#: the timeline as storage.
_MAX_TIMELINE_TEXT = 500


def _as_text(value: Any) -> str:
    """Whatever the worker sent, as something React can render."""
    if isinstance(value, str):
        return value[:_MAX_TIMELINE_TEXT]
    if value is None:
        return ""
    return repr(value)[:_MAX_TIMELINE_TEXT]


def _timeline(raw: Any) -> list[dict[str, Any]]:
    """The behaviour timeline, in the shape the graph actually draws.

    The worker decides what is in each entry, and the graph renders `kind`
    straight into JSX. A non-string there is "Objects are not valid as a React
    child", which unmounts the whole tree — the report page goes permanently
    blank, from a 200 the API accepted without complaint.

    Fixed at the seam rather than in the one component, because the same data
    reaches the PDF, the JSON export and the signed evidence.
    """
    out: list[dict[str, Any]] = []
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        try:
            t_ms = int(float(item.get("t_ms", 0)))
        except (TypeError, ValueError, OverflowError):
            t_ms = 0
        out.append({
            "t_ms": max(0, t_ms),
            # "event" rather than "" — the graph groups into one lane per kind,
            # and an empty lane label is a row of dots against nothing.
            "kind": _as_text(item.get("kind")).strip() or "event",
            "detail": _as_text(item.get("detail")),
        })
        if len(out) >= _MAX_TIMELINE:
            break
    return out


def _static_results(job: SandboxJob) -> list[AnalyzerResult]:
    """The job's static findings, re-run against the CURRENT engine if it can be.

    Rebuilding the static half purely from stored JSON freezes it at whatever
    engine version first scored the sample. A detonation arrives minutes to days
    later, so the two halves of one verdict can come from two different builds —
    and an operator re-scoring their database after a rules change silently
    misses every job that happened to be in the detonation queue at the time.

    The bytes are already on disk and the static tier costs milliseconds, so
    re-running it is the honest answer. Retention may have purged the sample,
    though, and a report is not worth losing over that: with no bytes, fall back
    to the stored findings.
    """
    stored = {
        name: payload
        for name, payload in (job.analysis or {}).items()
        if not name.startswith("dynamic.") and isinstance(payload, dict)
    }
    by_name: dict[str, AnalyzerResult] = {}

    path = quarantine_root() / job.sha256[:2] / job.sha256
    if job.sample_deleted_at is None and path.exists():
        from ..sandbox.engine import analyzers
        from ..sandbox.engine.pipeline import _sample_from, _yara_result

        try:
            sample = _sample_from(job, str(path))
            fresh = analyzers.run_all(sample, sample.family)
            fresh.append(_yara_result(sample))
            by_name = {r.analyzer: r for r in fresh}
        except Exception:  # noqa: BLE001
            # A failed re-run must not cost the detonation. Report it and use
            # what is on the row.
            logger.exception("static re-run failed on ingest for %s", job.public_id)
            by_name = {}

    for name, payload in stored.items():
        by_name.setdefault(name, _result_from_stored(name, payload))
    return list(by_name.values())


@router.post("/report/{public_id}", response_model=JobDetail)
def ingest_report(
    public_id: str,
    report: DynamicReportIn,
    db: Session = Depends(get_db),
    _worker: str = Depends(require_worker),
):
    """Merge a worker's behavioural findings into the job and re-score.

    A dynamic finding scores, exports and displays exactly like a static one,
    because it arrives in the same Signal vocabulary.
    """
    if not _looks_like_public_id(public_id):
        raise HTTPException(status_code=404, detail="Job not found")
    job = db.execute(
        select(SandboxJob).where(SandboxJob.public_id == public_id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Read the "before" BEFORE anything is written. These feed the audit entry
    # that records what this ingest changed; read afterwards they would record
    # `score_before == score_after` on every row, and the trail would say nothing
    # had happened during the largest automated verdict change the product makes.
    verdict_before = (job.verdict or {}).get("verdict")
    score_before = job.final_score

    # Every free-form value the worker sent, made storable. `facts`, a signal's
    # `evidence` and the timeline are `dict[str, Any]`. `json.loads` accepts
    # `NaN` and `Infinity` — they are what `json.dumps` emits by default — and
    # Starlette refuses to serialise them on the way out. So a non-finite float
    # is easy to get in and impossible to get back out: accepted with a 200, then
    # every export of that job is a 500 for ever. Sanitised at the seam rather
    # than at each of the places that later read it.
    dyn_signals = [
        Signal(
            id=s.id,
            title=s.title,
            severity=s.severity,
            detail=s.detail,
            evidence=json_safe(s.evidence),
        )
        for s in report.signals
    ]
    dyn_facts = json_safe(report.facts)
    dyn_timeline = _timeline(report.timeline)
    dyn_iocs = IOCs(**report.iocs.model_dump())
    dyn_result = AnalyzerResult(
        analyzer=f"dynamic.{report.engine}",
        ran=report.ran,
        unavailable_reason=report.unavailable_reason,
        signals=dyn_signals,
        facts={**dyn_facts, "engine": report.engine, "worker": report.worker},
        iocs=dyn_iocs,
        duration_ms=report.duration_ms,
    )

    # Re-run the static tier, drop any prior dynamic entry, add this one.
    results = _static_results(job)
    results.append(dyn_result)

    merged = IOCs()
    for result in results:
        if result.ran:
            merged = merged.merge(result.iocs)

    tiers = dict(job.tiers or {})
    tiers["dynamic"] = {
        "ran": report.ran,
        "engine": report.engine,
        "worker": report.worker,
        "detail": report.unavailable_reason
        # The ENGINE, not the machine. This sentence is copied verbatim into the
        # PDF, the incident record and the signed evidence — documents that leave
        # the building — so naming the host would publish the hostname of the
        # machine that runs live malware for this organisation.
        or f"Detonated on the {report.engine} worker attached to this deployment.",
    }
    if report.refused:
        tiers["dynamic"]["refused"] = True

    # The same assessment the pipeline would have made, including
    # `dynamic_attributable` — the argument that stops the guest's behaviour
    # being charged to a file Windows cannot run. Without it, a report arriving
    # here overwrites the pipeline's correct score with the answer the pipeline
    # had already rejected.
    attributable = _dynamic_is_attributable(job)
    assessment = scoring.assess(
        results,
        ioc_total=merged.total(),
        tiers=tiers,
        family=job.family,
        dynamic_attributable=attributable,
    )
    if not attributable and report.ran:
        assessment.breakdown["dynamic_not_attributable"] = {
            "claimed_extension": _safe_suffix(job.original_name),
            "mime": job.mime,
            "reason": (
                "Windows has no way to run a file of this type, so everything "
                "the guest was observed doing belongs to the guest - a default "
                "handler opening it, the agent copying it into place - and not "
                "to this sample. The behavioural findings are reported in full "
                "and excluded from the score."
            ),
        }

    job.analysis = {r.analyzer: r.to_dict() for r in results}
    job.iocs = merged.to_dict()
    job.tiers = tiers
    job.dynamic = {
        "engine": report.engine,
        "worker": report.worker,
        "ran": report.ran,
        # Without this the reason exists only in `tiers`, and the field the UI
        # and the exports read says nothing at all — a refused sample becomes
        # indistinguishable from a detonation that observed nothing.
        "unavailable_reason": report.unavailable_reason,
        "refused": bool(report.refused),
        "timeline": dyn_timeline,
        "signals": [s.to_dict() for s in dyn_signals],
        "facts": dyn_result.facts,
        "duration_ms": report.duration_ms,
    }
    # A refused sample is a hole in the evidence, not a quiet result. Recording
    # it on the job is what stops a live binary reading `completed` / `low` with
    # no error at all.
    if report.refused:
        job.error = report.unavailable_reason
    job.score_breakdown = assessment.breakdown
    job.rule_score = assessment.rule_score
    job.ai_score = assessment.ai_score
    job.final_score = assessment.final_score
    job.risk_level = assessment.risk_level

    # Recompute the analyst outputs now that behaviour has been folded in.
    from ..sandbox.engine import (
        impact as impact_mod,
        mitre as mitre_mod,
        pipeline as pipeline_mod,
        verdict as verdict_mod,
    )

    all_signals = [s for r in results if r.ran for s in r.signals]
    # `from_url` is what makes Attack Vector Network for a sample the analyst
    # fetched from the internet. Omitting it here would mean detonating a
    # URL-delivered sample LOWERED its impact rating, because this recomputation
    # replaces the pipeline's rating with one that forgot where the file came from.
    impact_res = impact_mod.assess(
        job.family, all_signals, merged, from_url=(job.source == JobSource.URL)
    )
    verdict_res = verdict_mod.classify(
        job.family, job.mime, results, merged, assessment.final_score
    )
    # The same rule the pipeline applies: a clean verdict rates nothing.
    if verdict_res.verdict == "clean":
        impact_res = impact_mod.unrated(
            "The engine's verdict for this sample is clean: no finding reached "
            "the threshold to flag it, so there is no demonstrated impact to rate."
        )
    job.impact = impact_res.to_dict()
    job.verdict = verdict_res.to_dict()
    job.mitre = mitre_mod.map_techniques(all_signals)

    # And the container above it. `pipeline.run` enforces "a container carries
    # the verdict of the worst thing found in it" once, at static time. Re-scoring
    # only the job the report was posted for leaves an archive member that
    # detonated to malicious sitting inside a zip that still reads its
    # pre-detonation verdict — and the queue and the stats both scope to
    # top-level jobs, so they would see only the container.
    #
    # Not `pipeline.run` on the ancestor: that would re-unpack the container and
    # reset its completed_at, which is evidence.
    raised_ancestors = pipeline_mod.reapply_to_ancestors(db, job)
    if raised_ancestors:
        logger.info(
            "detonation of %s raised %d container(s) above it",
            job.public_id, raised_ancestors,
        )

    # The chain of custody has to see this: a sample can go from suspicious to
    # malicious on the strength of a report posted by an off-host machine, and
    # "the verdict moved, and here is from what to what" is the first question
    # asked about an automated decision.
    platform_models.record(
        db,
        actor=_WorkerActor(report.worker),
        action="sandbox.dynamic_report_ingested",
        object_type="sandbox_job",
        object_id=job.id,
        object_label=job.public_id,
        summary=f"Behavioural report ingested from the {report.engine} engine",
        before={"verdict": verdict_before, "final_score": score_before},
        after={
            "verdict": verdict_res.verdict,
            "final_score": job.final_score,
            "engine": report.engine,
            "ran": bool(report.ran),
            "refused": bool(report.refused),
            "signals": len(dyn_signals),
            "duration_ms": report.duration_ms,
        },
    )

    db.commit()
    db.refresh(job)
    return JobDetail.of(job)
