"""Persistence for policy intelligence, threat intel, incident risk,
integrations and the audit trail.

Five domains, one module, because they only mean anything together: an advisory
lands (intel), it matches a rule the organisation itself wrote (policy), that
raises a finding, the finding becomes an obligation on a named person (incident
risk), the training for it may live in someone else's LMS (integration), and
every one of those transitions is a material change somebody has to be able to
account for later (audit).

Two rules run through all of it:

1. **A machine may propose; only a human may activate.** Extracted rules land as
   ``proposed``. If software could silently promote its own reading of a PDF
   into an active control, the module would be inventing policy rather than
   checking it.
2. **"Not attempted" is not "clean".** Extraction status, sync status and
   relevance all carry an explicit "we have not looked" value, distinct from a
   look that found nothing.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from ..models import utcnow

# ---------------------------------------------------------------------------
# Enumerated string values (plain strings, for SQLite/Postgres parity)
# ---------------------------------------------------------------------------


class PolicyType:
    SECURITY_POLICY = "security_policy"
    WHITELIST = "whitelist"
    APPROVED_SOFTWARE = "approved_software"
    BASELINE = "baseline"
    EXCEPTION_REGISTER = "exception_register"
    ACCESS_POLICY = "access_policy"
    INCIDENT_PROCEDURE = "incident_procedure"
    VENDOR_REQUIREMENT = "vendor_requirement"
    CONTROL_DOCUMENT = "control_document"


class PolicyStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    UNDER_REVIEW = "under_review"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


class ExtractionStatus:
    #: Queued, or in flight.
    PENDING = "pending"
    EXTRACTED = "extracted"
    FAILED = "failed"
    #: Nobody asked for extraction on this document. Distinct from FAILED, and
    #: very distinct from EXTRACTED-with-zero-rules: the UI must never present a
    #: document we never read as a document with no rules in it.
    NOT_ATTEMPTED = "not_attempted"


class ExtractionSource:
    """Which engine produced the extracted rules — never inferred."""

    ANTHROPIC = "anthropic"
    MOCK = "mock"
    #: A human typed the rules in. Not an AI claim at all.
    MANUAL = "manual"
    NONE = ""


class RuleType:
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE = "require"
    VERSION_FLOOR = "version_floor"
    VERSION_CEILING = "version_ceiling"
    EXCEPTION = "exception"
    CONTROL = "control"


class RuleStatus:
    #: Where every machine-extracted rule starts, without exception.
    PROPOSED = "proposed"
    ACTIVE = "active"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class FindingType:
    OUTDATED_APPROVED_VERSION = "outdated_approved_version"
    UNSAFE_WHITELIST_ENTRY = "unsafe_whitelist_entry"
    VULNERABLE_ALLOWED_VERSION = "vulnerable_allowed_version"
    EXPIRED_EXCEPTION = "expired_exception"
    POLICY_CONFLICT = "policy_conflict"
    MISSING_CONTROL = "missing_control"
    EXTERNAL_ADVISORY_MATCH = "external_advisory_match"
    EXPOSURE_MATCH = "exposure_match"


class FindingStatus:
    OPEN = "open"
    IN_REVIEW = "in_review"
    REMEDIATION_PLANNED = "remediation_planned"
    TRAINING_ASSIGNED = "training_assigned"
    RESOLVED = "resolved"
    #: The organisation looked and decided to carry the risk. A closed finding
    #: and an accepted one are different facts and must not collapse into one.
    ACCEPTED_RISK = "accepted_risk"
    FALSE_POSITIVE = "false_positive"


class Severity:
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IntelSource:
    NVD = "nvd"
    CISA = "cisa"
    CERT = "cert"
    VENDOR = "vendor"
    RESEARCH = "research"
    OSINT = "osint"
    BREACH_MONITOR = "breach_monitor"
    FEED = "feed"


class IntelType:
    VULNERABILITY = "vulnerability"
    ADVISORY = "advisory"
    CAMPAIGN = "campaign"
    RANSOMWARE = "ransomware"
    CREDENTIAL_EXPOSURE = "credential_exposure"
    IOC = "ioc"
    RESEARCH = "research"


class IntelRelevance:
    #: Nobody has judged this yet — not the same as "we decided it is fine".
    UNASSESSED = "unassessed"
    NOT_APPLICABLE = "not_applicable"
    MONITORING = "monitoring"
    RELEVANT = "relevant"
    URGENT = "urgent"


class MatchType:
    APPROVED_SOFTWARE = "approved_software"
    POLICY_RULE = "policy_rule"
    TECHNOLOGY_IN_USE = "technology_in_use"
    DEPARTMENT_EXPOSURE = "department_exposure"
    CREDENTIAL_DOMAIN = "credential_domain"


class IncidentRiskType:
    USER_ACTION = "user_action"
    PRIVILEGED_EXPOSURE = "privileged_exposure"
    DATA_MISHANDLING = "data_mishandling"
    PROCEDURE_FAILURE = "procedure_failure"
    ALERT_FATIGUE = "alert_fatigue"
    KNOWLEDGE_GAP = "knowledge_gap"


class Confidentiality:
    """Drives redaction in the employee-facing view of an incident risk.

    An employee is entitled to know what they must do and by when. They are not
    automatically entitled to the investigation's evidence, which routinely
    names other people. Anything above ``INTERNAL`` is redacted for the subject.
    """

    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"
    SECRET = "secret"


#: Confidentiality levels whose narrative and evidence are withheld from the
#: employee view. Kept next to the class so the redaction rule has one home.
REDACTED_CONFIDENTIALITY = (Confidentiality.RESTRICTED, Confidentiality.SECRET)


class IncidentRiskStatus:
    DRAFT = "draft"
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    AWAITING_REVIEW = "awaiting_review"
    CLOSED = "closed"
    REOPENED = "reopened"


class SubjectStatus:
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"
    FAILED = "failed"
    WAIVED = "waived"


class ReviewerDecision:
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class IntegrationProvider:
    UDEMY_BUSINESS = "udemy_business"
    MOODLE = "moodle"
    CORNERSTONE = "cornerstone"
    SAP_SUCCESSFACTORS = "sap_successfactors"
    VIVA_LEARNING = "viva_learning"
    SCORM = "scorm"
    XAPI = "xapi"
    LTI = "lti"
    CUSTOM_LMS = "custom_lms"
    SSO_SAML = "sso_saml"
    SSO_OIDC = "sso_oidc"


class IntegrationStatus:
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    CONNECTED = "connected"
    DEGRADED = "degraded"
    ERROR = "error"
    DISABLED = "disabled"


class SyncStatus:
    #: No sync has ever been attempted. Not a success, not a failure.
    NEVER = "never"
    OK = "ok"
    PARTIAL = "partial"
    FAILED = "failed"


class IntegrationCapability:
    IMPORT_COURSES = "import_courses"
    ASSIGN = "assign"
    SYNC_COMPLETION = "sync_completion"
    SYNC_SCORES = "sync_scores"
    SSO = "sso"


# ---------------------------------------------------------------------------
# 1. Policy intelligence
# ---------------------------------------------------------------------------


class Policy(Base):
    """A document the organisation itself wrote, and what we made of it.

    The uploaded bytes are not stored here — only enough provenance
    (``source_filename``, ``source_mime``, ``source_bytes``) to say which file a
    rule came out of. Filenames are attacker-adjacent input: they are displayed,
    never used as a path.
    """

    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    policy_type: Mapped[str] = mapped_column(String(32), default=PolicyType.SECURITY_POLICY, index=True)
    #: Free-form on purpose ("3.2", "2026-R1"): it is the customer's numbering.
    version: Mapped[str] = mapped_column(String(32), default="1.0")
    status: Mapped[str] = mapped_column(String(20), default=PolicyStatus.DRAFT, index=True)

    owner_name: Mapped[str] = mapped_column(String(120), default="")
    owner_email: Mapped[str] = mapped_column(String(255), default="")
    effective_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: Department ids or names this document binds. A policy that applies to
    #: Finance only must not raise findings against Engineering.
    applicable_departments: Mapped[list] = mapped_column(JSON, default=list)

    source_filename: Mapped[str] = mapped_column(String(512), default="")
    source_mime: Mapped[str] = mapped_column(String(128), default="")
    source_bytes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[str] = mapped_column(String(255), default="")

    extraction_status: Mapped[str] = mapped_column(
        String(20), default=ExtractionStatus.NOT_ATTEMPTED, index=True
    )
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Which engine read the document: "anthropic" | "mock" | "manual" | "".
    #: Never derived from the presence of rules — template output must never be
    #: able to read as model output.
    extraction_source: Mapped[str] = mapped_column(String(20), default=ExtractionSource.NONE)

    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rules: Mapped[list["PolicyRule"]] = relationship(
        back_populates="policy", order_by="PolicyRule.id"
    )
    versions: Mapped[list["PolicyVersion"]] = relationship(
        back_populates="policy", order_by="PolicyVersion.created_at"
    )


class PolicyRule(Base):
    """One checkable statement lifted out of a policy document.

    ``evidence_quote`` is what makes the rule checkable rather than merely
    asserted: a reviewer can read the sentence the machine claims to have based
    it on and disagree. A rule without its quote is an opinion.
    """

    __tablename__ = "policy_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), index=True)
    #: Stable slug ("approved-software.openssl.ceiling"). Findings and matches
    #: key off it, so renaming one rewrites the history that referenced it.
    rule_key: Mapped[str] = mapped_column(String(120), index=True)
    statement: Mapped[str] = mapped_column(Text)
    rule_type: Mapped[str] = mapped_column(String(20), default=RuleType.REQUIRE)

    technology: Mapped[str] = mapped_column(String(120), default="")
    version_spec: Mapped[str] = mapped_column(String(60), default="")

    evidence_quote: Mapped[str] = mapped_column(Text, default="")
    evidence_location: Mapped[str] = mapped_column(String(120), default="")
    #: NULL where a human wrote the rule directly: a typed rule has no
    #: extraction confidence, and 1.0 would be a fabricated machine claim.
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default=RuleStatus.PROPOSED, index=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    policy: Mapped[Policy] = relationship(back_populates="rules")


class PolicyVersion(Base):
    """An immutable snapshot of a policy's rules at one version.

    Append-only by contract: nothing in the application updates a row here. It
    is the only way to answer "what did the policy actually say on the day that
    finding was raised", which is the question an auditor asks first.
    """

    __tablename__ = "policy_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), index=True)
    version: Mapped[str] = mapped_column(String(32))
    changed_by: Mapped[str] = mapped_column(String(255), default="")
    change_summary: Mapped[str] = mapped_column(Text, default="")
    #: {added: [...], removed: [...], changed: [{rule_key, before, after}]}
    diff: Mapped[dict] = mapped_column(JSON, default=dict)
    #: The full rule list as it stood, so the snapshot survives the rules table.
    snapshot: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    policy: Mapped[Policy] = relationship(back_populates="versions")


class PolicyFinding(Base):
    """One place where reality diverges from what the organisation wrote down.

    ``evidence`` is a list of ``{label, value, ref}`` rather than prose: a
    finding that cannot be checked line by line is an accusation, and this
    module exists to make claims about a customer's own governance.
    """

    __tablename__ = "policy_findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    finding_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default=Severity.MEDIUM, index=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=FindingStatus.OPEN, index=True)

    policy_id: Mapped[int | None] = mapped_column(ForeignKey("policies.id"), nullable=True, index=True)
    policy_rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("policy_rules.id"), nullable=True, index=True
    )

    technology: Mapped[str] = mapped_column(String(120), default="")
    affected_version: Mapped[str] = mapped_column(String(60), default="")
    approved_version: Mapped[str] = mapped_column(String(60), default="")
    recommended_version: Mapped[str] = mapped_column(String(60), default="")

    #: Where the claim came from — "intel:CVE-2026-21841", "scan:endpoint-inventory".
    source: Mapped[str] = mapped_column(String(60), default="")
    source_ref: Mapped[str] = mapped_column(String(255), default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    affected_department_ids: Mapped[list] = mapped_column(JSON, default=list)
    affected_employee_ids: Mapped[list] = mapped_column(JSON, default=list)

    suggested_remediation: Mapped[str] = mapped_column(Text, default="")
    required_training: Mapped[str] = mapped_column(Text, default="")
    owner_name: Mapped[str] = mapped_column(String(120), default="")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence: Mapped[list] = mapped_column(JSON, default=list)

    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------------
# 2. Threat intelligence
# ---------------------------------------------------------------------------


class IntelItem(Base):
    """An advisory, CVE or campaign report from a lawful public source.

    Everything on this row is attacker-adjacent: a title, a summary and a set of
    reference URLs written by someone outside the organisation. It is rendered
    as data and never interpreted as an instruction — not by the UI, and not by
    any prompt built from it.
    """

    __tablename__ = "intel_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    #: "CVE-2026-21841", "AA26-118A". Unique per source in practice, but not
    #: enforced: two feeds legitimately carry the same advisory.
    external_id: Mapped[str] = mapped_column(String(60), default="", index=True)
    source: Mapped[str] = mapped_column(String(24), default=IntelSource.FEED, index=True)
    source_name: Mapped[str] = mapped_column(String(120), default="")
    source_url: Mapped[str] = mapped_column(Text, default="")

    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    intel_type: Mapped[str] = mapped_column(String(24), default=IntelType.ADVISORY, index=True)
    severity: Mapped[str] = mapped_column(String(20), default=Severity.MEDIUM, index=True)
    #: NULL where the source published no CVSS. Zero would read as "harmless".
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_vector: Mapped[str] = mapped_column(String(120), default="")

    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    #: [{vendor, product, versions}] — the shape matching keys off.
    affected_products: Mapped[list] = mapped_column(JSON, default=list)
    mitre_techniques: Mapped[list] = mapped_column(JSON, default=list)
    iocs: Mapped[dict] = mapped_column(JSON, default=dict)
    reference_urls: Mapped[list] = mapped_column(JSON, default=list)

    relevance: Mapped[str] = mapped_column(String(20), default=IntelRelevance.UNASSESSED, index=True)
    relevance_reason: Mapped[str] = mapped_column(Text, default="")
    dismissed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dismissed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    matches: Mapped[list["IntelMatch"]] = relationship(
        back_populates="intel_item", order_by="IntelMatch.id"
    )


class IntelMatch(Base):
    """Why one advisory matters to THIS organisation.

    ``explanation`` is a sentence, not a score, because the analyst's job here is
    to disagree with it. A match nobody can argue with is a match nobody can
    correct.
    """

    __tablename__ = "intel_matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    intel_item_id: Mapped[int] = mapped_column(ForeignKey("intel_items.id"), index=True)
    match_type: Mapped[str] = mapped_column(String(30), default=MatchType.TECHNOLOGY_IN_USE)

    matched_policy_id: Mapped[int | None] = mapped_column(
        ForeignKey("policies.id"), nullable=True
    )
    matched_rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("policy_rules.id"), nullable=True
    )
    matched_technology: Mapped[str] = mapped_column(String(120), default="")
    matched_version: Mapped[str] = mapped_column(String(60), default="")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, default="")

    affected_department_ids: Mapped[list] = mapped_column(JSON, default=list)
    affected_employee_ids: Mapped[list] = mapped_column(JSON, default=list)
    #: Set when this match was escalated into a finding, so the UI can show the
    #: link both ways and a second run does not raise a duplicate.
    created_finding_id: Mapped[int | None] = mapped_column(
        ForeignKey("policy_findings.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    intel_item: Mapped[IntelItem] = relationship(back_populates="matches")


# ---------------------------------------------------------------------------
# 3. Incident risk (assigned by incident response)
# ---------------------------------------------------------------------------


class IncidentRisk(Base):
    """A risk incident response has charged to named people, with a deadline.

    This is the one place where the platform makes a demand of an employee on
    another team's authority, so ``approver_name`` and ``closure_criteria`` are
    first-class: an obligation nobody signed and nobody defined the end of is
    how awareness programmes turn into resentment.
    """

    __tablename__ = "incident_risks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    #: The ticket id in the customer's own IR system. Displayed, never resolved.
    incident_ref: Mapped[str] = mapped_column(String(60), default="", index=True)
    risk_type: Mapped[str] = mapped_column(String(30), default=IncidentRiskType.USER_ACTION, index=True)
    severity: Mapped[str] = mapped_column(String(20), default=Severity.MEDIUM, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    #: Drives redaction of description/evidence in the employee-facing view.
    confidentiality: Mapped[str] = mapped_column(String(20), default=Confidentiality.INTERNAL)
    status: Mapped[str] = mapped_column(String(24), default=IncidentRiskStatus.DRAFT, index=True)

    affected_department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True
    )
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    required_action: Mapped[str] = mapped_column(Text, default="")

    requires_training: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_quiz: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_sandbox: Mapped[bool] = mapped_column(Boolean, default=False)
    #: NULL means no pass mark was set, not a pass mark of zero.
    min_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    approver_name: Mapped[str] = mapped_column(String(120), default="")
    closure_criteria: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closure_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Reopening is counted, not overwritten: a risk closed and reopened twice
    #: is a different story from one closed once.
    reopened_count: Mapped[int] = mapped_column(Integer, default=0)

    subjects: Mapped[list["IncidentRiskSubject"]] = relationship(
        back_populates="incident_risk", order_by="IncidentRiskSubject.id"
    )


class IncidentRiskSubject(Base):
    """One employee's obligation under one incident risk, and its review."""

    __tablename__ = "incident_risk_subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_risk_id: Mapped[int] = mapped_column(ForeignKey("incident_risks.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    assignment_id: Mapped[int | None] = mapped_column(
        ForeignKey("training_assignments.id"), nullable=True
    )
    #: Deliberately not a foreign key: ZORBOX jobs are retention-managed and get
    #: pruned, and an incident record must not be deletable as a side effect of
    #: sample housekeeping. The id is kept as a lookup, not as a constraint.
    sandbox_job_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default=SubjectStatus.ASSIGNED, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    reviewer_decision: Mapped[str] = mapped_column(String(20), default=ReviewerDecision.PENDING)
    reviewer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    incident_risk: Mapped[IncidentRisk] = relationship(back_populates="subjects")


# ---------------------------------------------------------------------------
# 4. Integrations (external LMS / SSO)
# ---------------------------------------------------------------------------


class Integration(Base):
    """A connection to somebody else's learning platform or identity provider.

    ``config_summary`` holds shape, never secrets: base URL, account name, seat
    count. Credentials belong in the deployment's secret store, and a JSON
    column that has ever held one is a JSON column that leaks in every backup.
    """

    __tablename__ = "integrations"

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(20), default=IntegrationStatus.NOT_CONFIGURED, index=True)
    capabilities: Mapped[list] = mapped_column(JSON, default=list)
    config_summary: Mapped[dict] = mapped_column(JSON, default=dict)

    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: "never" is its own value: an integration that has not synced yet must not
    #: render as one that synced cleanly.
    last_sync_status: Mapped[str] = mapped_column(String(16), default=SyncStatus.NEVER)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    courses_imported: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    courses: Mapped[list["ExternalCourse"]] = relationship(
        back_populates="integration", order_by="ExternalCourse.id"
    )


class ExternalCourse(Base):
    """A course that lives in the provider's catalogue, mirrored for targeting."""

    __tablename__ = "external_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    integration_id: Mapped[int] = mapped_column(ForeignKey("integrations.id"), index=True)
    #: The provider's own id. Attacker-adjacent only in the sense that it is
    #: third-party text: displayed, never used to build a local path.
    external_ref: Mapped[str] = mapped_column(String(255), default="", index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    provider_name: Mapped[str] = mapped_column(String(120), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(16), default="en")
    topics: Mapped[list] = mapped_column(JSON, default=list)
    #: Which of our behaviour targets this course is claimed to move. Set by a
    #: human mapping exercise, not by the provider's own marketing tags.
    mapped_behaviors: Mapped[list] = mapped_column(JSON, default=list)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    integration: Mapped[Integration] = relationship(back_populates="courses")


# ---------------------------------------------------------------------------
# 5. Audit
# ---------------------------------------------------------------------------


class AuditEvent(Base):
    """Who changed what, when, and what it looked like before and after.

    ``before``/``after`` are nullable and NULL means "not captured" — a creation
    has no before, a deletion has no after, and a change whose payload was too
    large to snapshot must say so rather than record an empty object that reads
    as "it was blank".
    """

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_email: Mapped[str] = mapped_column(String(255), default="", index=True)
    actor_role: Mapped[str] = mapped_column(String(20), default="")
    #: Stable verb: "policy.rule.activate", "incident_risk.close". Dotted and
    #: past-tense-free so it can be filtered by prefix.
    action: Mapped[str] = mapped_column(String(60), index=True)
    object_type: Mapped[str] = mapped_column(String(40), default="", index=True)
    object_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    object_label: Mapped[str] = mapped_column(String(255), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


#: Recorded as the actor when the platform acted on its own behalf (a scheduled
#: intel fetch, a sync job). Never used to paper over an unknown human actor.
SYSTEM_ACTOR = "system@cyclowareness"
SYSTEM_ROLE = "system"


def record(
    db,
    *,
    actor: Any | None,
    action: str,
    object_type: str,
    object_id: int | None = None,
    object_label: str = "",
    summary: str = "",
    before: dict | None = None,
    after: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    at: datetime | None = None,
) -> AuditEvent:
    """Write one audit entry. The only supported way to write one.

    ``actor`` is a ``User`` (anything with ``.email`` and ``.role``) or ``None``
    for platform-initiated work. Routers pass the dependency-injected user
    straight through; nothing infers an actor from a request it merely received.

    The row is added to the session but not committed — the audit entry and the
    change it describes must land in the same transaction, or the trail can
    claim something the database never did.
    """
    event = AuditEvent(
        actor_email=getattr(actor, "email", None) or SYSTEM_ACTOR,
        actor_role=getattr(actor, "role", None) or SYSTEM_ROLE,
        action=action,
        object_type=object_type,
        object_id=object_id,
        object_label=object_label,
        summary=summary,
        before=before,
        after=after,
        ip_address=ip_address,
        user_agent=user_agent,
        at=at or utcnow(),
    )
    db.add(event)
    return event
