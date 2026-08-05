"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth ------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    employee_id: int | None = None
    employee_name: str | None = None


class IdentityResponse(BaseModel):
    """Who the caller is — deliberately without a token.

    /auth/me used to answer with a TokenResponse, which meant it minted a fresh
    12-hour credential on every call. Anyone holding a stolen token could renew
    it indefinitely by pinging an endpoint whose only job is to say a name, so
    revocation by expiry never actually arrived.
    """

    role: str
    email: str
    employee_id: int | None = None
    employee_name: str | None = None


# --- Org -------------------------------------------------------------------

class DepartmentOut(ORMModel):
    id: int
    name: str


class EmployeeOut(ORMModel):
    id: int
    name: str
    email: str
    department_id: int
    role_title: str
    role_sensitivity: float
    current_risk_score: float


class EmployeeDetail(EmployeeOut):
    department_name: str = ""
    risk_breakdown: list[dict[str, Any]] = []
    recent_events: list[dict[str, Any]] = []


class DepartmentRisk(BaseModel):
    id: int
    name: str
    avg_risk: float
    employee_count: int
    high_risk_count: int


# --- Threats ---------------------------------------------------------------

class ThreatSubmit(BaseModel):
    artifact_type: str = "email"          # email | url | file | sms | qr | chat
    artifact_ref: str                     # raw content / URL / filename
    title: str = ""
    artifact_meta: dict[str, Any] = Field(default_factory=dict)


class ThreatOut(ORMModel):
    id: int
    source: str
    artifact_type: str
    artifact_ref: str
    artifact_meta: dict[str, Any]
    title: str
    verdict: str | None
    confidence: float | None
    threat_type: str | None
    iocs: dict[str, Any] | None
    behavior_summary: str | None
    explanation: str | None
    reported_by_employee_id: int | None
    created_at: datetime


# --- Training --------------------------------------------------------------

class TrainingModuleOut(ORMModel):
    id: int
    threat_id: int | None
    title: str
    description: str
    content: list[Any]
    quiz: list[Any]
    takeaway: str
    channel: str
    est_minutes: int
    ai_generated: bool
    generation_source: str
    status: str
    approved_by: str | None
    created_at: datetime


class ModuleCreate(BaseModel):
    """A hand-authored module. No AI fields on purpose — the server pins them."""

    title: str = Field(min_length=3, max_length=255)
    description: str = ""
    content: list[Any] = Field(default_factory=list)
    quiz: list[Any] = Field(default_factory=list)
    takeaway: str = ""
    channel: str = "email"
    est_minutes: int = Field(default=3, ge=1, le=60)


class ModuleEdit(BaseModel):
    title: str | None = None
    description: str | None = None
    content: list[Any] | None = None
    quiz: list[Any] | None = None
    takeaway: str | None = None


class AssignmentOut(ORMModel):
    id: int
    module_id: int
    employee_id: int
    loop_run_id: int | None
    status: str
    score: float | None
    time_spent_seconds: int | None
    targeting_reasons: list[Any]
    assigned_at: datetime
    completed_at: datetime | None


class AssignmentDetail(AssignmentOut):
    module: TrainingModuleOut
    employee_name: str = ""


class QuizSubmission(BaseModel):
    answers: list[int]                    # chosen option index per question
    time_spent_seconds: int = 0


class QuizResult(BaseModel):
    score: float
    correct: int
    total: int
    passed: bool
    per_question: list[dict[str, Any]]
    risk_delta: float
    new_risk_score: float


# --- Human sensor ----------------------------------------------------------

class ReportSubmit(BaseModel):
    artifact_type: str = "email"
    artifact_ref: str
    note: str = ""
    artifact_meta: dict[str, Any] = Field(default_factory=dict)


class ReportOut(ORMModel):
    id: int
    employee_id: int
    artifact_type: str
    artifact_ref: str
    artifact_meta: dict[str, Any]
    note: str
    status: str
    triage_summary: dict[str, Any] | None
    linked_threat_id: int | None
    linked_loop_run_id: int | None
    created_at: datetime
    #: WHETHER THIS REPORT ACTUALLY MOVED THE SCORE. Credit is capped at three
    #: reports per 24 hours so the score cannot be farmed, and the cap was
    #: invisible: the confirmation told every reporter their score had gone down,
    #: including the fourth time in a day, when no risk event was written at all.
    #: The person doing the single behaviour the product most wants was told a
    #: falsehood at exactly the moment they did it most.
    risk_credited: bool = True
    #: Says why, when it was not. Empty when it was.
    risk_credit_note: str = ""


class ReportDetail(ReportOut):
    employee_name: str = ""
    department_name: str = ""


# --- Simulations -----------------------------------------------------------

class SimulationCreate(BaseModel):
    name: str
    template_threat_id: int | None = None
    lure_template_id: str | None = None
    channel: str = "email"
    target_employee_ids: list[int] = Field(default_factory=list)
    target_department_ids: list[int] = Field(default_factory=list)


class SimTemplateOut(BaseModel):
    id: str
    name: str
    channel: str
    threat_type: str
    difficulty: str
    description: str
    sample_lure: str


class SimTargetOut(ORMModel):
    id: int
    employee_id: int
    outcome: str
    outcome_at: datetime | None


class SimulationOut(ORMModel):
    id: int
    name: str
    template_threat_id: int | None
    lure_template_id: str | None
    lure_preview: str
    channel: str
    status: str
    launched_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class SimulationDetail(SimulationOut):
    targets: list[dict[str, Any]] = []
    stats: dict[str, Any] = {}


# --- Loop ------------------------------------------------------------------

class LoopRunOut(ORMModel):
    id: int
    trigger_threat_id: int
    current_stage: int
    status: str
    stage_history: list[Any]
    training_module_id: int | None
    report_id: int | None
    targeting: list[Any]
    measure_summary: dict[str, Any] | None
    created_at: datetime
    completed_at: datetime | None


class RunSummaryOut(BaseModel):
    """A loop run with enough of its threat attached to render a row.

    The analyst dashboard built this shape inline while the list endpoint
    returned the bare LoopRun, so a client reading the list had no title to show
    and every caller invented its own join. One shape, built in one place.
    """

    id: int
    status: str
    current_stage: int
    stage_history: list[Any]
    threat_title: str
    threat_type: str | None
    verdict: str | None
    source: str | None
    targets: int
    created_at: datetime | None
    completed_at: datetime | None

    @classmethod
    def from_run(cls, run: Any) -> "RunSummaryOut":
        threat = run.threat
        return cls(
            id=run.id,
            status=run.status,
            current_stage=run.current_stage,
            stage_history=run.stage_history or [],
            # An orphaned run has no threat to name. "Unknown artifact" is
            # honest; an empty string reads as a rendering bug.
            threat_title=threat.title if threat else "Unknown artifact",
            threat_type=threat.threat_type if threat else None,
            verdict=threat.verdict if threat else None,
            source=threat.source if threat else None,
            targets=len(run.targeting or []),
            created_at=run.created_at,
            completed_at=run.completed_at,
        )


class LoopRunDetail(LoopRunOut):
    threat: ThreatOut | None = None
    training_module: TrainingModuleOut | None = None
    assignments: list[dict[str, Any]] = []


# --- Approvals -------------------------------------------------------------
# A view over the loop's human gate. These shapes live here rather than in the
# platform package because everything they describe — LoopRun, TrainingModule,
# Threat — is core loop state; the approval queue adds no storage of its own.


class ProposedTarget(BaseModel):
    """One person the TARGET stage would select, and why.

    Straight from ``risk_engine.select_targets`` — the same call the loop makes
    after approval. The analyst is being asked to approve content that will be
    put in front of these people, so the reasons are theirs to disagree with.
    """

    employee_id: int
    name: str
    department_id: int | None = None
    risk_score: float | None = None
    reasons: list[str] = []
    #: True only where the artifact actually reached this person. False means
    #: they were selected on a prior (a high score, a past click), which is a
    #: reason to train them and not evidence that anything happened to them.
    exposed: bool = False


class SafetyCheck(BaseModel):
    """One pre-approval check, and whether it actually ran.

    ``checked=False`` with ``passed=None`` is the honest shape for a check this
    deployment cannot perform. Reporting it as a pass would turn "we did not
    look" into "we looked and found nothing" on the one screen where an analyst
    signs their name to the result.
    """

    check: str
    checked: bool
    passed: bool | None
    detail: str


class SafetyStatus(BaseModel):
    checks: list[SafetyCheck] = []
    checks_run: int = 0
    checks_not_run: int = 0
    failed: int = 0
    #: Reads as an all-clear only when nothing was skipped and nothing failed.
    summary: str = ""


class ApprovalQueueItem(BaseModel):
    run_id: int
    created_at: datetime
    waiting_seconds: int
    threat_id: int
    threat_title: str
    threat_type: str | None = None
    threat_verdict: str | None = None
    threat_confidence: float | None = None
    #: Derived, never stored: a Threat carries a verdict and a confidence, not a
    #: severity. ``severity_basis`` states the derivation in words so the label
    #: cannot be mistaken for something an analyzer asserted.
    severity: str
    severity_basis: str
    module_id: int | None = None
    module_title: str = ""
    quiz_questions: int = 0
    est_minutes: int | None = None
    ai_generated: bool = False
    #: "anthropic" | "mock" | "" — which engine wrote the module. Never inferred.
    generation_source: str = ""
    generation_label: str = ""
    #: Computed for the returned page only, by calling select_targets.
    proposed_target_count: int | None = None
    #: A prior endorsement from POST /decision with require_second_approval.
    awaiting_second_approval: bool = False
    endorsed_by: str | None = None


class ApprovalQueue(BaseModel):
    items: list[ApprovalQueueItem]
    total: int
    limit: int
    offset: int
    truncated: bool


class ApprovalDetail(BaseModel):
    """Everything needed to decide, on one screen.

    ``artifact_excerpt`` and ``artifact_meta`` are attacker-authored. They are
    carried here as evidence for a human to read and are never treated as
    instructions by anything downstream — which is also why the field is an
    excerpt with a stated cap rather than the whole artifact.
    """

    run_id: int
    run_status: str
    awaiting_approval: bool
    created_at: datetime
    waiting_seconds: int

    threat: ThreatOut | None = None
    artifact_excerpt: str = ""
    artifact_excerpt_truncated: bool = False
    #: Sandbox output as recorded by the ANALYZE stage, or a stated reason it is
    #: absent. Never an empty object that reads as "analysed, found nothing".
    analysis: dict[str, Any] = {}
    analysis_note: str = ""

    module: TrainingModuleOut | None = None
    generation_label: str = ""
    severity: str = ""
    severity_basis: str = ""

    proposed_targets: list[ProposedTarget] = []
    targeting_note: str = ""

    safety: SafetyStatus = SafetyStatus()
    second_approval: dict[str, Any] = {}


class ApprovalDecisionRequest(BaseModel):
    """approve | reject | request_revision.

    ``require_second_approval`` holds an approval instead of applying it: the
    run stays at the gate and the endorsement is recorded, so a second,
    different analyst has to act before any employee sees the module.
    """

    decision: str
    comment: str = ""
    require_second_approval: bool = False


class ApprovalDecisionResult(BaseModel):
    run_id: int
    decision: str
    #: The whole point of the field: request_revision and a held approval both
    #: return 200 without moving the loop, and must not read like an approval.
    loop_advanced: bool
    run_status: str
    module_status: str | None = None
    audited_action: str
    comment: str = ""
    second_approval: dict[str, Any] = {}
    detail: str = ""


class ApprovalHistoryEntry(BaseModel):
    at: datetime
    actor_email: str
    actor_role: str
    action: str
    comment: str
    detail: dict[str, Any] | None = None


# --- Feed ------------------------------------------------------------------

class FeedItemOut(ORMModel):
    id: int
    title: str
    summary: str
    threat_type: str
    severity: str
    source_name: str
    published_at: datetime
    iocs: dict[str, Any]
    artifact_example: str
    artifact_type: str
    pushed_to_loop: bool


# --- Dashboard -------------------------------------------------------------

class RiskEventOut(ORMModel):
    id: int
    employee_id: int
    type: str
    delta: float
    reason: str
    loop_run_id: int | None
    created_at: datetime


# --- External training resources -------------------------------------------


class TrainingResourceOut(ORMModel):
    """A resource the API is willing to show a learner.

    `verified_at` is on the wire deliberately. The client does not have to trust
    that the server filtered correctly — it can see the date the link was last
    confirmed to exist, and say so beside the link. A resource panel that shows
    a URL without saying when anyone last checked it is asking the reader to
    take it on faith, which is the thing this catalogue exists to avoid.
    """

    id: int
    provider: str
    url: str
    title: str
    author: str
    duration_seconds: int | None
    language: str
    topic: str
    channel: str
    verified_at: datetime | None


class TrainingResourceTopic(BaseModel):
    """One attack the catalogue can teach, with how much of it there is."""

    key: str
    label: str
    #: Verified resources only. A topic with zero is reported as zero rather
    #: than hidden — "we have nothing for quishing" is useful to know.
    count: int


class ResourceImportRequest(BaseModel):
    """Candidate URLs an analyst wants added.

    No title field: the provider supplies it during verification. Letting the
    caller name the resource is how a catalogue ends up describing a video as
    something it is not.
    """

    urls: list[str] = Field(min_length=1, max_length=25)
    topic: str
    channel: str = "email"


class ResourceImportReport(BaseModel):
    """What happened to every candidate, including the ones refused.

    Rejections are returned rather than counted. An importer that reports "3 of
    8 added" and stops leaves the operator guessing which five and why; the
    reason a link was refused is usually the thing they need to act on.
    """

    stored: list[str]
    updated: list[str]
    rejected: list[str]
