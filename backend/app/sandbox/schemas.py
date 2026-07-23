"""Response shapes for the ZORBOX API.

Deliberately thin: the heavy analysis payload is already well-structured JSON on
the job row, so these models pick which parts of it a given caller is allowed to
see rather than re-describing all of it. The list view never carries the full
analysis — a queue of fifty jobs should be fifty summaries, not fifty forensic
reports.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


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
            created_at=job.created_at,
            completed_at=job.completed_at,
        )


class JobDetail(JobSummary):
    md5: str
    magic: str
    extension_mismatch: bool
    error: str | None
    tiers: dict[str, Any]
    analysis: dict[str, Any]
    iocs: dict[str, list[str]]
    score_breakdown: dict[str, Any]
    rule_score: float
    ai_score: float
    feedback: str | None
    archive_path: str | None
    duration_ms: int | None
    children: list[JobSummary]

    @classmethod
    def of(cls, job, children=None) -> "JobDetail":  # type: ignore[override]
        base = JobSummary.of(job).model_dump()
        return cls(
            **base,
            md5=job.md5,
            magic=job.magic,
            extension_mismatch=bool(job.extension_mismatch),
            error=job.error,
            tiers=job.tiers or {},
            analysis=job.analysis or {},
            iocs=job.iocs or {},
            score_breakdown=job.score_breakdown or {},
            rule_score=job.rule_score,
            ai_score=job.ai_score,
            feedback=job.feedback,
            archive_path=job.archive_path,
            duration_ms=job.duration_ms,
            children=[JobSummary.of(c) for c in (children or [])],
        )


class SubmitURLRequest(BaseModel):
    url: str


class PasswordRequest(BaseModel):
    password: str


class FeedbackRequest(BaseModel):
    verdict: str  # "false_positive" | "true_positive"
    note: str | None = None
