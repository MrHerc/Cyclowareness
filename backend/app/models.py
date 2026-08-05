"""Core data model.

Every stage of the loop persists state here so the loop is auditable and
observable (spec §2, §7). ``LoopRun`` is the first-class entity that makes
the closed loop visible; ``RiskEvent`` is the audit trail behind every
risk-score movement.
"""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enumerated string values (kept as plain strings for SQLite/Postgres parity)
# ---------------------------------------------------------------------------

class Role:
    ANALYST = "analyst"
    EMPLOYEE = "employee"
    EXECUTIVE = "executive"


class ThreatSource:
    HUMAN_SENSOR = "human_sensor"
    FEED = "feed"
    MANUAL = "manual"


class ArtifactType:
    EMAIL = "email"
    URL = "url"
    FILE = "file"
    SMS = "sms"
    QR = "qr"
    CHAT = "chat"


class Verdict:
    MALICIOUS = "malicious"
    SUSPICIOUS = "suspicious"
    BENIGN = "benign"


class LoopStage:
    """The seven stages of the loop, in order."""

    INGEST = 1
    ANALYZE = 2
    CONVERT = 3
    TARGET = 4
    TRAIN = 5
    MEASURE = 6
    FEEDBACK = 7

    NAMES = {
        1: "ingest",
        2: "analyze",
        3: "convert",
        4: "target",
        5: "train",
        6: "measure",
        7: "feedback",
    }


class LoopStatus:
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"   # human-in-the-loop gate after CONVERT
    AWAITING_TRAINING = "awaiting_training"   # TRAIN done, waiting for completions
    COMPLETED = "completed"
    FAILED = "failed"


class ModuleStatus:
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class AssignmentStatus:
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    EXPIRED = "expired"


class EmployeeStatus:
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    LEFT = "left"


class ReportStatus:
    NEW = "new"
    IN_LOOP = "in_loop"
    DISMISSED = "dismissed"


class SimulationStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"


class SimOutcome:
    PENDING = "pending"
    CLICKED = "clicked"
    REPORTED = "reported"
    IGNORED = "ignored"


# ---------------------------------------------------------------------------
# Identity & org
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default=Role.EMPLOYEE)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    employee: Mapped["Employee | None"] = relationship(back_populates="user")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    role_title: Mapped[str] = mapped_column(String(120), default="")
    # 0.0–1.0: how sensitive this role is (finance approver > intern)
    role_sensitivity: Mapped[float] = mapped_column(Float, default=0.3)
    #: The composite, and what most screens show: behaviour + engagement, railed
    #: to 0-100. Still the number used to select targets and rank a heatmap.
    current_risk_score: Mapped[float] = mapped_column(Float, default=30.0)
    #: THE HALF THAT MAY BE USED AS EVIDENCE OF EFFICACY. Moves only on what the
    #: person did when a threat reached them — clicked, reported, ignored it.
    #: Kept separate because completing training subtracts 10 points from the
    #: composite, which is the same number the dashboard charts as proof the
    #: training worked; charting the composite let the product claim improvement
    #: it had manufactured. See core/risk_engine.BEHAVIOUR_EVENTS.
    behaviour_risk: Mapped[float] = mapped_column(Float, default=30.0)
    #: Engagement with the programme, signed the same way as the composite:
    #: negative means credit earned. Real and worth showing, never efficacy.
    training_credit: Mapped[float] = mapped_column(Float, default=0.0)
    # Lifecycle. Without it, someone who left in March is still assigned training
    # in July and still averages into their old department's heatmap — and
    # "on_leave" is the difference between a missed deadline that means something
    # and one that means the person was on holiday.
    status: Mapped[str] = mapped_column(String(16), default=EmployeeStatus.ACTIVE, index=True)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Self-referential and nullable: needed before any feature may claim to
    # notify a manager. A schema field that is structurally always false is
    # worse than no field at all.
    manager_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    department: Mapped[Department] = relationship(back_populates="employees")
    user: Mapped[User | None] = relationship(back_populates="employee")
    risk_events: Mapped[list["RiskEvent"]] = relationship(back_populates="employee")
    assignments: Mapped[list["TrainingAssignment"]] = relationship(back_populates="employee")


# ---------------------------------------------------------------------------
# Threats & analysis
# ---------------------------------------------------------------------------

class Threat(Base):
    __tablename__ = "threats"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(20))            # ThreatSource
    artifact_type: Mapped[str] = mapped_column(String(20))     # ArtifactType
    artifact_ref: Mapped[str] = mapped_column(Text)            # raw content / URL / filename
    artifact_meta: Mapped[dict] = mapped_column(JSON, default=dict)  # subject, sender, filename…
    title: Mapped[str] = mapped_column(String(255), default="")

    # Filled by ANALYZE stage (analyzer contract, spec §6.2)
    verdict: Mapped[str | None] = mapped_column(String(20), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    threat_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    iocs: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    behavior_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # raw_report

    # Filled by CONVERT stage — AI plain-language explanation
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    reported_by_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

class TrainingModule(Base):
    __tablename__ = "training_modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    threat_id: Mapped[int | None] = mapped_column(ForeignKey("threats.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    # Lesson body: list of {heading, body} sections (2–4 minute micro-lesson)
    content: Mapped[list] = mapped_column(JSON, default=list)
    # Quiz: list of {question, options[], correct_index, explanation}
    quiz: Mapped[list] = mapped_column(JSON, default=list)
    takeaway: Mapped[str] = mapped_column(Text, default="")
    # Channel the threat arrived on: email | sms | qr | chat | web
    channel: Mapped[str] = mapped_column(String(20), default="email")
    est_minutes: Mapped[int] = mapped_column(Integer, default=3)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    # Which engine actually wrote this: "anthropic" | "mock" | "" (human-authored).
    # Never inferred from ai_generated — the analyst must be able to see when a
    # module came from the offline generator rather than a live model.
    generation_source: Mapped[str] = mapped_column(String(20), default="")
    status: Mapped[str] = mapped_column(String(20), default=ModuleStatus.PENDING_REVIEW)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TrainingAssignment(Base):
    __tablename__ = "training_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("training_modules.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    loop_run_id: Mapped[int | None] = mapped_column(ForeignKey("loop_runs.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=AssignmentStatus.ASSIGNED)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)          # 0–100 quiz score
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Explainability: why this employee was targeted (list of reason strings)
    targeting_reasons: Mapped[list] = mapped_column(JSON, default=list)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    module: Mapped[TrainingModule] = relationship()
    employee: Mapped[Employee] = relationship(back_populates="assignments")


# ---------------------------------------------------------------------------
# Human sensor
# ---------------------------------------------------------------------------

class PhishingReport(Base):
    __tablename__ = "phishing_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    artifact_type: Mapped[str] = mapped_column(String(20))
    artifact_ref: Mapped[str] = mapped_column(Text)
    artifact_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default=ReportStatus.NEW)
    # AI triage assist output: {summary, indicators[], recommended_action}
    triage_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    linked_threat_id: Mapped[int | None] = mapped_column(ForeignKey("threats.id"), nullable=True)
    linked_loop_run_id: Mapped[int | None] = mapped_column(ForeignKey("loop_runs.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employee: Mapped[Employee] = relationship()


class PhishingSimulation(Base):
    __tablename__ = "phishing_simulations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    # Differentiator: simulations reuse REAL analyzed threats as templates
    template_threat_id: Mapped[int | None] = mapped_column(ForeignKey("threats.id"), nullable=True)
    # Or a prebuilt multi-channel lure template (core/sim_templates.py)
    lure_template_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    lure_preview: Mapped[str] = mapped_column(Text, default="")
    channel: Mapped[str] = mapped_column(String(20), default="email")
    status: Mapped[str] = mapped_column(String(20), default=SimulationStatus.DRAFT)
    launched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    targets: Mapped[list["SimulationTarget"]] = relationship(back_populates="simulation")


class SimulationTarget(Base):
    __tablename__ = "simulation_targets"

    id: Mapped[int] = mapped_column(primary_key=True)
    simulation_id: Mapped[int] = mapped_column(ForeignKey("phishing_simulations.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    outcome: Mapped[str] = mapped_column(String(20), default=SimOutcome.PENDING)
    outcome_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    simulation: Mapped[PhishingSimulation] = relationship(back_populates="targets")
    employee: Mapped[Employee] = relationship()


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------

class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    type: Mapped[str] = mapped_column(String(40))   # see risk_engine.WEIGHTS
    delta: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text, default="")
    loop_run_id: Mapped[int | None] = mapped_column(ForeignKey("loop_runs.id"), nullable=True)
    # Which batch or connector wrote this, so a bad one can be withdrawn as a
    # unit (risk_engine.revoke_events). Null for events this application raised
    # about its own activity.
    source_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    # Revoked, never deleted: "a claim was made and later withdrawn" is a
    # different fact from "the claim never existed", and the audit trail owes
    # the employee the first one.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- the employee's right to say "that was not me" -----------------------
    #: An analyst could already withdraw a bad batch (`revoke_events`), and the
    #: comment above records why revoking beats deleting. What was missing was
    #: the route in the other direction: the person these events are ABOUT had
    #: no way to say one is wrong.
    #:
    #: These are the events that put "HIGH RISK" beside their name on their own
    #: screen. A machine recorded that they clicked a lure; if the machine is
    #: wrong — a shared workstation, a mis-attributed target, a simulation that
    #: recorded the wrong person — the score stands and the label stays, and the
    #: only recourse was to know an analyst personally.
    contested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    #: Their own words, shown to the analyst verbatim.
    contest_note: Mapped[str] = mapped_column(Text, default="")
    #: What a human decided, and who. Empty while the contest is open.
    contest_resolution: Mapped[str] = mapped_column(Text, default="")
    contest_resolved_by: Mapped[str] = mapped_column(String(255), default="")
    contest_resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employee: Mapped[Employee] = relationship(back_populates="risk_events")


# ---------------------------------------------------------------------------
# The loop itself
# ---------------------------------------------------------------------------

class LoopRun(Base):
    """One full pass of the closed loop (spec §2). First-class and auditable.

    ``stage_history`` is a JSON list of::

        {"stage": 2, "name": "analyze", "status": "completed",
         "started_at": iso, "completed_at": iso, "detail": str, "error": str|None}
    """

    __tablename__ = "loop_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    trigger_threat_id: Mapped[int] = mapped_column(ForeignKey("threats.id"))
    current_stage: Mapped[int] = mapped_column(Integer, default=LoopStage.INGEST)
    status: Mapped[str] = mapped_column(String(30), default=LoopStatus.RUNNING)
    stage_history: Mapped[list] = mapped_column(JSON, default=list)

    training_module_id: Mapped[int | None] = mapped_column(ForeignKey("training_modules.id"), nullable=True)
    report_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # PhishingReport.id

    # TARGET stage output: [{employee_id, name, reasons[], risk_score}]
    targeting: Mapped[list] = mapped_column(JSON, default=list)
    # MEASURE stage output: {assigned, completed, avg_score, avg_time_seconds,
    #                        risk_delta_total, per_employee: [...]}
    measure_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    threat: Mapped[Threat] = relationship()
    training_module: Mapped[TrainingModule | None] = relationship()


# ---------------------------------------------------------------------------
# Intel feed (input-only, minimal — spec §6.8) & metrics
# ---------------------------------------------------------------------------

class FeedItem(Base):
    __tablename__ = "feed_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    threat_type: Mapped[str] = mapped_column(String(30), default="phishing")
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # low|medium|high|critical
    source_name: Mapped[str] = mapped_column(String(120), default="")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    iocs: Mapped[dict] = mapped_column(JSON, default=dict)
    # An example artifact (email text / URL) an analyst can push into the loop
    artifact_example: Mapped[str] = mapped_column(Text, default="")
    artifact_type: Mapped[str] = mapped_column(String(20), default=ArtifactType.EMAIL)
    pushed_to_loop: Mapped[bool] = mapped_column(Boolean, default=False)


class MetricSnapshot(Base):
    """Daily org-level outcome metrics — the proof the loop works (spec §6.7)."""

    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Rates are nullable on purpose: NULL means "not enough data in the window
    # to measure", which is materially different from 0.0 ("measured, nobody
    # clicked"). Charting a fabricated zero would bend the efficacy trend.
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    phishing_click_rate: Mapped[float | None] = mapped_column(Float, nullable=True)   # 0–1
    report_rate: Mapped[float | None] = mapped_column(Float, nullable=True)           # 0–1 human-sensor strength
    avg_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)        # 0–100
    # The composite above includes training credit, so it falls when training is
    # merely ASSIGNED AND COMPLETED. This one moves only on what people did with
    # a threat, and is the only one an efficacy claim may be built on.
    avg_behaviour_risk: Mapped[float | None] = mapped_column(Float, nullable=True)    # 0–100
    training_completion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0–1
    #: WHERE THIS ROW CAME FROM. "measured" means the loop's FEEDBACK stage
    #: computed it from this deployment's own events; "seeded" means the demo
    #: seed drew it.
    #:
    #: Without this the executive page charted a hand-written 26-week curve
    #: under the label "Live API — measured from this deployment's own
    #: records", directly below a tile computing the same metric from real
    #: rows. Click rate read 29% and rising in the tile and 10.8% and falling
    #: in the chart: same metric, same page, opposite stories, both claiming
    #: to be measured.
    source: Mapped[str] = mapped_column(String(16), default="measured", index=True)


class TrainingResource(Base):
    """An external learning resource — a real video or course, on a real URL.

    THE RULE THIS TABLE EXISTS TO ENFORCE: a resource is not shown to anyone
    until something has actually fetched its URL and recorded what came back.
    `verified_at` is nullable and starts NULL, and every read path filters on it.

    That is not ceremony. A training module that links a learner to a deleted
    video, a region-blocked video or somebody's reupload is worse than a module
    with no link at all — it burns the one moment the person was willing to
    learn, and it is indistinguishable from the product having made the URL up.
    The generator is not allowed to invent these; they arrive from an importer
    that dereferenced them, or they do not arrive.

    `http_status` and `verify_error` keep the reason a check failed, so a
    resource that goes dark is recorded as *unreachable* rather than silently
    vanishing — an analyst can see that the catalogue used to hold something
    here and what happened to it.
    """

    __tablename__ = "training_resources"

    id: Mapped[int] = mapped_column(primary_key=True)

    #: youtube | coursera | udemy. Named rather than inferred from the URL:
    #: a shortened or redirected link would otherwise be filed wrongly.
    provider: Mapped[str] = mapped_column(String(20), index=True)
    #: The provider's own id — a YouTube video id, a course slug. Lets the same
    #: resource be recognised across two different URL spellings.
    external_id: Mapped[str] = mapped_column(String(120), index=True)
    url: Mapped[str] = mapped_column(String(500))

    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str] = mapped_column(String(200), default="")
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    #: BCP-47. A resource in a language the learner does not read is not a
    #: resource, so this is filterable rather than decorative.
    language: Mapped[str] = mapped_column(String(12), default="en")

    #: The attack this teaches: phishing | bec | ransomware | mfa_fatigue |
    #: qr | vishing | credential_theft | insider | data_handling.
    topic: Mapped[str] = mapped_column(String(40), index=True)
    #: Channel it best matches, mirroring TrainingModule.channel.
    channel: Mapped[str] = mapped_column(String(20), default="email")

    #: NULL until a fetch actually happened. Nothing reaches a learner without it.
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    #: Why the last check failed, in the fetcher's words. Empty when it passed.
    verify_error: Mapped[str] = mapped_column(String(300), default="")

    #: Who put it in the catalogue. "importer:youtube" for an automated pull,
    #: an analyst's email for a hand-added one — the distinction the rest of
    #: this product makes everywhere between machine and human provenance.
    added_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
