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
    status: str
    approved_by: str | None
    created_at: datetime


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


class ReportDetail(ReportOut):
    employee_name: str = ""
    department_name: str = ""


# --- Simulations -----------------------------------------------------------

class SimulationCreate(BaseModel):
    name: str
    template_threat_id: int | None = None
    channel: str = "email"
    target_employee_ids: list[int] = Field(default_factory=list)
    target_department_ids: list[int] = Field(default_factory=list)


class SimTargetOut(ORMModel):
    id: int
    employee_id: int
    outcome: str
    outcome_at: datetime | None


class SimulationOut(ORMModel):
    id: int
    name: str
    template_threat_id: int | None
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


class LoopRunDetail(LoopRunOut):
    threat: ThreatOut | None = None
    training_module: TrainingModuleOut | None = None
    assignments: list[dict[str, Any]] = []


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
