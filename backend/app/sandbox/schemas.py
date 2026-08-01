"""Request/response shapes for the sandbox API.

Deliberately thin: the heavy analysis payload is already well-structured JSON on
the job row, so these models choose which parts of it a caller sees rather than
re-describing all of it. The list view never carries the full analysis — a queue
of fifty jobs should be fifty summaries, not fifty forensic reports.

These mirror the standalone Cyclowareness Sandbox's own schemas, because the
engine writing the rows is the same engine, byte for byte (see `db.py`). Where
they differ it is because the portal has real users and no tenants: the queue is
scoped by the portal's own roles, not by an API key's tenant prefix.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class JobSummary(BaseModel):
    public_id: str
    source: str
    original_name: str
    submitted_url: str | None
    sha256: str
    size_bytes: int
    mime: str
    family: str
    status: str
    stage: str
    risk_level: str
    final_score: float
    #: The engine's answer, carried on the summary because it is the first thing
    #: anyone looks at. Omitting it once made a dashboard read "MALICIOUS 0" for
    #: five jobs that were every one of them malicious — the frontend handled a
    #: missing verdict gracefully, so nothing errored and the numbers were simply
    #: wrong. It costs nothing: the column is JSON on the row already loaded.
    verdict: dict | None = None
    created_at: datetime
    completed_at: datetime | None

    @classmethod
    def of(cls, job) -> "JobSummary":
        return cls(
            public_id=job.public_id,
            source=job.source,
            original_name=job.original_name,
            submitted_url=job.submitted_url,
            sha256=job.sha256,
            size_bytes=job.size_bytes,
            mime=job.mime,
            family=job.family,
            status=job.status,
            stage=job.stage,
            risk_level=job.risk_level,
            final_score=job.final_score,
            verdict=job.verdict,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )


class JobPage(BaseModel):
    """One page of the queue, and how much of it there is.

    `total` is the count BEFORE limit and offset and after every filter, which
    is what makes "showing 50 of 269" a sentence the UI can write truthfully. A
    bare array would let the queue's own lede ("every sample submitted to this
    deployment") be false the moment the table outgrew one page.
    """

    items: list[JobSummary]
    total: int
    limit: int
    offset: int


class FamilyCount(BaseModel):
    family: str
    count: int


class JobStats(BaseModel):
    """The dashboard's numbers, counted in SQL over the whole table.

    The dashboard cannot be honest by paging: it needs counts over everything,
    and the page limit is smaller than the table already is. Every figure here is
    an aggregate, so the tiles stop being a property of how many rows the last
    poll happened to fetch.
    """

    total: int
    completed: int
    in_flight: int
    #: Keyed by verdict, over completed jobs. Always carries all four keys, so
    #: the UI never has to distinguish "none" from "not reported".
    verdicts: dict[str, int]
    needs_attention: int
    average_score: float
    families: list[FamilyCount]
    #: Worst first, by verdict and then by score.
    top_risk: list[JobSummary]


class JobDetail(JobSummary):
    md5: str
    magic: str
    extension_mismatch: bool
    submitted_by: str | None
    error: str | None
    tiers: dict[str, Any]
    analysis: dict[str, Any]
    dynamic: dict[str, Any]
    iocs: dict[str, list[str]]
    score_breakdown: dict[str, Any]
    impact: dict[str, Any]
    verdict: dict[str, Any]
    mitre: list[dict[str, Any]]
    rule_score: float
    ai_score: float
    feedback: str | None
    archive_path: str | None
    duration_ms: int | None
    children: list[JobSummary]
    #: The awareness loop run that raised this job, when one did. Read from the
    #: portal-side link table (see `links.py`), never from the engine's row —
    #: the engine has no loop to know about.
    loop_run_id: int | None = None

    @classmethod
    def of(cls, job, children=None, *, loop_run_id: int | None = None) -> "JobDetail":  # type: ignore[override]
        base = JobSummary.of(job).model_dump()
        # The summary carries the verdict too, but as `dict | None` — a job
        # mid-analysis has no verdict yet. The detail view promises a dict and
        # normalises None to {} below, so drop the summary's copy rather than
        # passing the same keyword twice.
        base.pop("verdict", None)
        return cls(
            **base,
            md5=job.md5,
            magic=job.magic,
            extension_mismatch=bool(job.extension_mismatch),
            submitted_by=job.submitted_by,
            error=job.error,
            tiers=job.tiers or {},
            analysis=job.analysis or {},
            dynamic=job.dynamic or {},
            iocs=job.iocs or {},
            score_breakdown=job.score_breakdown or {},
            impact=getattr(job, "impact", None) or {},
            verdict=job.verdict or {},
            mitre=job.mitre or [],
            rule_score=job.rule_score,
            ai_score=job.ai_score,
            feedback=job.feedback,
            archive_path=job.archive_path,
            duration_ms=job.duration_ms,
            children=[JobSummary.of(c) for c in (children or [])],
            loop_run_id=loop_run_id,
        )


class SubmitURLRequest(BaseModel):
    url: str


class PasswordRequest(BaseModel):
    password: str


class FeedbackRequest(BaseModel):
    verdict: str  # "false_positive" | "true_positive"
    note: str | None = None


# --- dynamic tier ingest -----------------------------------------------------
class SignalIn(BaseModel):
    id: str
    title: str
    severity: str = "info"
    detail: str = ""
    evidence: dict[str, Any] = Field(default_factory=dict)


class IOCsIn(BaseModel):
    urls: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    ips: list[str] = Field(default_factory=list)
    emails: list[str] = Field(default_factory=list)
    hashes: list[str] = Field(default_factory=list)
    file_paths: list[str] = Field(default_factory=list)
    registry_keys: list[str] = Field(default_factory=list)
    mutexes: list[str] = Field(default_factory=list)


class DynamicReportIn(BaseModel):
    """What an off-host worker posts back after detonating a sample."""

    engine: str  # "native" | "cuckoo" | "capev2" | "firejail" | "qiling" | ...
    worker: str = "worker"
    ran: bool = True
    unavailable_reason: str | None = None
    #: The sandbox declined this sample, rather than being unavailable. Terminal:
    #: the job is not offered for detonation again. Defaults False, so a worker
    #: that predates the field keeps the old retrying behaviour.
    refused: bool = False
    signals: list[SignalIn] = Field(default_factory=list)
    facts: dict[str, Any] = Field(default_factory=dict)
    iocs: IOCsIn = Field(default_factory=IOCsIn)
    duration_ms: int = 0
    #: A behaviour timeline the UI graphs: ordered {t_ms, kind, detail} events.
    timeline: list[dict[str, Any]] = Field(default_factory=list)
