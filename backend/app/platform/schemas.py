"""Request/response shapes for the policy, intel, incident-risk, integration
and audit domains.

Two shapes deserve a second look before anything is added here:

* ``PolicyRuleOut`` always carries ``evidence_quote`` and ``extraction_source``.
  A reviewer approving a machine-read rule without the sentence it came from —
  or without knowing which engine read it — is approving a claim, not a rule.
* ``IncidentRiskEmployeeView`` is the redacted view, and it is a *different
  model*, not a filtered field list. Redaction that lives in a caller's ``if``
  is redaction that leaks the first time a new route forgets it.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import REDACTED_CONFIDENTIALITY, FindingType


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Policy -----------------------------------------------------------------


class PolicyRuleOut(ORMModel):
    id: int
    policy_id: int
    rule_key: str
    statement: str
    rule_type: str
    technology: str
    version_spec: str
    evidence_quote: str
    evidence_location: str
    #: NULL where a human typed the rule: there is no extraction to be confident about.
    confidence: float | None
    status: str
    reviewed_by: str | None
    reviewed_at: datetime | None
    created_at: datetime


class PolicyOut(ORMModel):
    id: int
    name: str
    policy_type: str
    version: str
    status: str
    owner_name: str
    owner_email: str
    effective_date: datetime | None
    review_date: datetime | None
    applicable_departments: list[Any]
    source_filename: str
    source_mime: str
    source_bytes: int
    uploaded_by: str
    extraction_status: str
    extraction_error: str | None
    extraction_source: str
    notes: str
    created_at: datetime
    updated_at: datetime


class PolicyVersionOut(ORMModel):
    id: int
    policy_id: int
    version: str
    changed_by: str
    change_summary: str
    diff: dict[str, Any]
    snapshot: list[Any]
    created_at: datetime


class PolicyDetail(PolicyOut):
    rules: list[PolicyRuleOut] = []
    versions: list[PolicyVersionOut] = []
    #: Counts by rule status, so the review queue size is visible without
    #: shipping every rule to a list view.
    rule_counts: dict[str, int] = {}
    open_finding_count: int = 0


class PolicyUploadMeta(BaseModel):
    """Metadata accompanying a policy document upload.

    ``request_extraction`` is opt-in: uploading a document must not silently
    hand its contents to a model. The default is a stored document with
    ``extraction_status = not_attempted``, which the UI states plainly.
    """

    name: str
    policy_type: str = "security_policy"
    version: str = "1.0"
    status: str = "draft"
    owner_name: str = ""
    owner_email: str = ""
    effective_date: datetime | None = None
    review_date: datetime | None = None
    applicable_departments: list[Any] = Field(default_factory=list)
    notes: str = ""
    request_extraction: bool = False


class PolicyUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    owner_name: str | None = None
    owner_email: str | None = None
    review_date: datetime | None = None
    applicable_departments: list[Any] | None = None
    notes: str | None = None


class PolicyRuleReview(BaseModel):
    """A human's decision on one extracted rule.

    ``decision`` is ``activate`` | ``reject`` | ``supersede``. There is no
    "approve all" shape on purpose — a reviewer who did not read the quote has
    not reviewed the rule.
    """

    decision: str
    note: str = ""
    #: Corrections the reviewer made before activating. Recorded in the audit
    #: entry's ``before``/``after`` so a corrected rule is visibly corrected.
    statement: str | None = None
    technology: str | None = None
    version_spec: str | None = None


class PolicyRuleCreate(BaseModel):
    """A rule typed by a human rather than extracted. Lands active, with
    ``extraction_source = manual`` on its policy and no confidence value."""

    rule_key: str
    statement: str
    rule_type: str = "require"
    technology: str = ""
    version_spec: str = ""
    evidence_quote: str = ""
    evidence_location: str = ""


# --- Policy findings ---------------------------------------------------------


class PolicyFindingOut(ORMModel):
    id: int
    finding_type: str
    title: str
    description: str
    severity: str
    confidence: float | None
    status: str
    policy_id: int | None
    policy_rule_id: int | None
    technology: str
    affected_version: str
    approved_version: str
    recommended_version: str
    source: str
    source_ref: str
    published_at: datetime | None
    detected_at: datetime
    affected_department_ids: list[Any]
    affected_employee_ids: list[Any]
    suggested_remediation: str
    required_training: str
    owner_name: str
    due_date: datetime | None
    evidence: list[Any]
    resolution_note: str | None
    resolved_by: str | None
    resolved_at: datetime | None
    created_at: datetime


class PolicyFindingDetail(PolicyFindingOut):
    policy_name: str = ""
    policy_version: str = ""
    rule: PolicyRuleOut | None = None
    affected_departments: list[dict[str, Any]] = []
    affected_employees: list[dict[str, Any]] = []
    #: The intel item this finding was raised from, when there was one. Absent
    #: means the finding came from somewhere else, not that intel found nothing.
    intel_item: "IntelItemOut | None" = None
    #: Set only when ``source`` names an advisory that is no longer in the feed.
    #: Without it an absent ``intel_item`` would collapse two different facts:
    #: "this finding did not come from intel" and "the advisory it came from is
    #: gone".
    intel_lookup_note: str = ""


class PolicyFindingCreate(BaseModel):
    """A finding an analyst raises themselves.

    There is deliberately no ``confidence`` field. Confidence on this model is
    an extraction or matching score; a number attached to a human's judgement
    would read as one. A manually raised finding carries NULL and shows the
    analyst who raised it instead.
    """

    finding_type: str
    title: str
    description: str = ""
    severity: str = "medium"
    policy_id: int | None = None
    policy_rule_id: int | None = None
    technology: str = ""
    affected_version: str = ""
    approved_version: str = ""
    recommended_version: str = ""
    #: Where the analyst says the claim comes from (a ticket, a scan export).
    #: ``source`` itself is set by the router to ``analyst``, not by the caller.
    source_ref: str = ""
    affected_department_ids: list[Any] = Field(default_factory=list)
    affected_employee_ids: list[Any] = Field(default_factory=list)
    suggested_remediation: str = ""
    required_training: str = ""
    owner_name: str = ""
    due_date: datetime | None = None
    evidence: list[Any] = Field(default_factory=list)


class PolicyExtractionResult(BaseModel):
    """The outcome of one extraction attempt, successful or refused.

    ``attempted`` is the load-bearing field: it separates "an engine read the
    document and produced N rules" from "no engine ever saw it". Without it a
    zero-rule result reads as a document with no rules in it, which is the one
    claim this endpoint must never make by accident.
    """

    policy_id: int
    attempted: bool
    extraction_status: str
    extraction_source: str
    rules_proposed: int = 0
    #: Always populated when ``attempted`` is false, in the reader's language.
    reason: str = ""


class Page(BaseModel):
    """Envelope for a capped list.

    List endpoints here never hand back a bare array: a truncated array is
    indistinguishable from a complete one, and a dashboard that quietly drops
    the 51st critical finding is worse than one that shows nothing.
    """

    total: int
    limit: int
    offset: int
    #: True when ``total`` is a floor rather than an exact count — set when a
    #: filter had to be applied in Python over a capped scan.
    truncated: bool = False
    note: str = ""


class PolicyPage(Page):
    items: list[PolicyOut] = []


class PolicyFindingPage(Page):
    items: list[PolicyFindingOut] = []


class FindingTrainingAssign(BaseModel):
    """Attach existing, already-approved training to a finding.

    ``module_id`` is required and must name a module a human has approved.
    Generating fresh content here would either fabricate a lesson or route
    AI-written material to employees around the review gate the loop puts in
    front of every generated module.
    """

    module_id: int
    #: Defaults to the finding's ``affected_employee_ids``.
    employee_ids: list[int] | None = None
    note: str = ""


class FindingTrainingResult(BaseModel):
    """Who was actually assigned, and who was not — with the reason.

    ``skipped`` exists because a partial assignment silently reported as a
    success is how somebody on long-term leave ends up counted as trained.
    """

    finding_id: int
    module_id: int
    module_title: str
    assigned: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    finding_status: str
    #: States plainly how durable the finding→assignment link is in this build.
    linkage_note: str = ""


class PolicyFindingStats(BaseModel):
    """Dashboard counts, with the window and sample they were taken over.

    A bare set of counts invites the reader to treat it as the whole picture.
    ``sample_size``, ``total_all_time`` and ``outside_window`` say exactly how
    much of the record these numbers cover.
    """

    window_days: int
    window_start: datetime
    window_end: datetime
    sample_size: int
    total_all_time: int
    outside_window: int
    by_severity: dict[str, int]
    by_status: dict[str, int]
    by_finding_type: dict[str, int]
    #: Counted over every finding, not just the window: "overdue" is a
    #: present-tense fact about today, not about the reporting period.
    overdue_open_all_time: int
    note: str = ""


class FindingStatusChange(BaseModel):
    """Move a finding along, or close it.

    ``resolution_note`` is required by the router for the terminal statuses
    (``resolved``, ``accepted_risk``, ``false_positive``): a finding that
    vanished without a stated reason is indistinguishable from one that was
    quietly deleted.
    """

    status: str
    resolution_note: str = ""
    owner_name: str | None = None
    due_date: datetime | None = None
    recommended_version: str | None = None
    required_training: str | None = None


# --- Threat intelligence -----------------------------------------------------


class IntelMatchOut(ORMModel):
    id: int
    intel_item_id: int
    match_type: str
    matched_policy_id: int | None
    matched_rule_id: int | None
    matched_technology: str
    matched_version: str
    confidence: float | None
    explanation: str
    affected_department_ids: list[Any]
    affected_employee_ids: list[Any]
    created_finding_id: int | None
    created_at: datetime


class IntelItemOut(ORMModel):
    id: int
    external_id: str
    source: str
    source_name: str
    source_url: str
    title: str
    summary: str
    intel_type: str
    severity: str
    cvss_score: float | None
    cvss_vector: str
    published_at: datetime
    fetched_at: datetime
    affected_products: list[Any]
    mitre_techniques: list[Any]
    iocs: dict[str, Any]
    reference_urls: list[Any]
    relevance: str
    relevance_reason: str
    dismissed_by: str | None
    dismissed_reason: str | None
    created_at: datetime


class IntelItemDetail(IntelItemOut):
    matches: list[IntelMatchOut] = []
    findings: list[PolicyFindingOut] = []


class IntelRelevanceDecision(BaseModel):
    """An analyst's judgement on one advisory.

    ``reason`` is mandatory in the router for ``not_applicable``: "we assessed
    this and it does not apply to us" is a claim the organisation may have to
    defend, and it is not the same claim as "nobody looked".
    """

    relevance: str
    reason: str = ""


class IntelDismissal(BaseModel):
    """``reason`` carries no default, unlike the one on ``IntelRelevanceDecision``.

    Dismissal is the one action that removes an advisory from the analyst's
    queue, so an unexplained dismissal is indistinguishable from nobody having
    looked — the exact confusion this module exists to prevent.
    """

    reason: str


class IntelFindingRequest(BaseModel):
    """Raise a ``PolicyFinding`` from one advisory.

    ``match_id`` is how the finding inherits an argument. A match already states,
    in a sentence, why this advisory touches this organisation; a finding raised
    from one carries that reasoning and the departments and people it named. A
    finding raised without a match is an analyst's own claim and gets no
    confidence value — there is no extraction or match behind it to be confident
    about.
    """

    match_id: int | None = None
    title: str | None = None
    description: str = ""
    finding_type: str = FindingType.EXTERNAL_ADVISORY_MATCH
    #: Defaults to the advisory's own severity rather than a fixed value.
    severity: str | None = None
    owner_name: str = ""
    due_date: datetime | None = None
    suggested_remediation: str = ""
    required_training: str = ""
    recommended_version: str = ""
    #: Extra ``{label, value, ref}`` rows, appended after the ones derived from
    #: the advisory itself.
    evidence: list[Any] = Field(default_factory=list)


class IntelItemPage(BaseModel):
    """One page of advisories, plus the size of the set it was cut from.

    ``total`` and ``truncated`` are the whole point: a client that renders 200
    of 4 000 advisories and says nothing has made a claim about coverage it
    never checked.
    """

    items: list[IntelItemOut]
    total: int
    limit: int
    offset: int
    truncated: bool


class IntelMatchPage(BaseModel):
    items: list[IntelMatchOut]
    total: int
    limit: int
    offset: int
    truncated: bool


class IntelRefreshResult(BaseModel):
    """What a "check sources now" request actually did.

    With no feed wired into the build the answer is "nothing", and this shape
    says so in fields a client can branch on rather than in prose it has to
    parse. ``attempted=False`` with ``configured_sources=[]`` is the honest
    reading of an unchanged advisory list; returning ``items_added=0`` alone
    would let the UI render "up to date", which would be a fabrication.
    """

    attempted: bool
    #: Sources this deployment can actually fetch from. Empty by default.
    configured_sources: list[str]
    sources_checked: int
    items_added: int
    items_updated: int
    requested_at: datetime
    detail: str
    #: What an operator would have to do for a refresh to mean anything.
    next_step: str


class IntelStats(BaseModel):
    """Counts over stored advisories, with the coverage caveat attached.

    ``coverage_note`` travels with the numbers deliberately. "Zero urgent
    advisories" from a feed that is not running is not a security posture, and
    the figure must not be able to reach a dashboard without the caveat.
    """

    total: int
    by_relevance: dict[str, int]
    by_severity: dict[str, int]
    by_source: dict[str, int]
    by_type: dict[str, int]
    unassessed: int
    dismissed: int
    matches_total: int
    matches_without_finding: int
    latest_published_at: datetime | None
    latest_fetched_at: datetime | None
    configured_sources: list[str]
    coverage_note: str


# --- Incident risk -----------------------------------------------------------


class IncidentRiskSubjectOut(ORMModel):
    id: int
    incident_risk_id: int
    employee_id: int
    assignment_id: int | None
    sandbox_job_id: int | None
    status: str
    score: float | None
    completed_at: datetime | None
    reviewer_decision: str
    reviewer_note: str | None
    reviewed_by: str | None
    reviewed_at: datetime | None


class IncidentRiskSubjectDetail(IncidentRiskSubjectOut):
    employee_name: str = ""
    employee_email: str = ""
    department_name: str = ""


class IncidentRiskOut(ORMModel):
    id: int
    title: str
    incident_ref: str
    risk_type: str
    severity: str
    description: str
    confidentiality: str
    status: str
    affected_department_id: int | None
    evidence: list[Any]
    required_action: str
    requires_training: bool
    requires_quiz: bool
    requires_sandbox: bool
    min_score: int | None
    deadline: datetime | None
    approver_name: str
    closure_criteria: str
    created_by: str
    created_at: datetime
    closed_at: datetime | None
    closure_note: str | None
    reopened_count: int


class IncidentRiskTimelineEntry(BaseModel):
    """One audited move on a risk, flattened for the detail view.

    Read straight out of ``audit_events`` rather than kept as a second history
    on the risk itself: a timeline the application maintains separately from the
    audit trail is a timeline that can disagree with it.
    """

    at: datetime
    actor_email: str
    actor_role: str
    action: str
    summary: str
    object_type: str
    object_label: str


class IncidentRiskDetail(IncidentRiskOut):
    department_name: str = ""
    subjects: list[IncidentRiskSubjectDetail] = []
    completion: dict[str, Any] = {}
    timeline: list[IncidentRiskTimelineEntry] = []


class IncidentRiskEmployeeView(BaseModel):
    """What the subject of an incident risk is allowed to see.

    Above ``internal`` confidentiality the narrative and evidence are withheld —
    they routinely name other people and other systems. The employee still gets
    the obligation, the deadline and the approver, and ``redaction_note`` says
    plainly that material was withheld and why. A blank description with no
    explanation would read as "there is nothing here", which is a different and
    false claim.
    """

    id: int
    title: str
    severity: str
    status: str
    required_action: str
    requires_training: bool
    requires_quiz: bool
    requires_sandbox: bool
    min_score: int | None
    deadline: datetime | None
    approver_name: str
    #: Present only when confidentiality allows it.
    description: str | None = None
    evidence: list[Any] | None = None
    redacted: bool = False
    redaction_note: str = ""
    my_status: str = ""
    my_score: float | None = None
    my_completed_at: datetime | None = None

    @classmethod
    def of(cls, risk, subject=None) -> "IncidentRiskEmployeeView":
        redacted = risk.confidentiality in REDACTED_CONFIDENTIALITY
        return cls(
            id=risk.id,
            title=risk.title,
            severity=risk.severity,
            status=risk.status,
            required_action=risk.required_action,
            requires_training=risk.requires_training,
            requires_quiz=risk.requires_quiz,
            requires_sandbox=risk.requires_sandbox,
            min_score=risk.min_score,
            deadline=risk.deadline,
            approver_name=risk.approver_name,
            description=None if redacted else risk.description,
            evidence=None if redacted else list(risk.evidence or []),
            redacted=redacted,
            redaction_note=(
                "Investigation detail is classified "
                f"{risk.confidentiality} and is withheld from this view. "
                f"Contact {risk.approver_name or 'the incident approver'} if you need it."
                if redacted
                else ""
            ),
            my_status=getattr(subject, "status", "") or "",
            my_score=getattr(subject, "score", None),
            my_completed_at=getattr(subject, "completed_at", None),
        )


class IncidentRiskCreate(BaseModel):
    title: str
    incident_ref: str = ""
    risk_type: str = "user_action"
    severity: str = "medium"
    description: str = ""
    confidentiality: str = "internal"
    affected_department_id: int | None = None
    evidence: list[Any] = Field(default_factory=list)
    required_action: str = ""
    requires_training: bool = False
    requires_quiz: bool = False
    requires_sandbox: bool = False
    min_score: int | None = None
    deadline: datetime | None = None
    approver_name: str = ""
    closure_criteria: str = ""


class IncidentRiskAssign(BaseModel):
    """Attach named employees to a risk. Existing subjects are left alone —
    re-assigning must not silently reset somebody who already completed."""

    employee_ids: list[int]
    note: str = ""


class IncidentRiskSubjectReview(BaseModel):
    decision: str            # accepted | rejected
    note: str = ""


class IncidentRiskClose(BaseModel):
    """``closure_note`` is required: closure_criteria said what "done" meant,
    and the note is where somebody states that it was met."""

    closure_note: str


class IncidentRiskReopen(BaseModel):
    reason: str


class IncidentRiskUpdate(BaseModel):
    """Field edits and status moves on a risk that is still running.

    ``closed`` and ``reopened`` are deliberately not reachable from here. Both
    demand a written justification, and a status field that could reach them
    would let a caller close an obligation against named people with no stated
    reason at all.

    A ``None`` means "leave this alone", which is why there is no way to clear a
    deadline or a pass mark through this shape. Treating ``null`` as "clear it"
    would let a client that omits a field silently drop the bar somebody set.
    """

    title: str | None = None
    severity: str | None = None
    description: str | None = None
    confidentiality: str | None = None
    status: str | None = None
    required_action: str | None = None
    requires_training: bool | None = None
    requires_quiz: bool | None = None
    requires_sandbox: bool | None = None
    min_score: int | None = None
    deadline: datetime | None = None
    approver_name: str | None = None
    closure_criteria: str | None = None
    evidence: list[Any] | None = None
    #: Why the change was made. Recorded on the audit entry, not on the risk.
    note: str = ""


class RequirementOutcome(BaseModel):
    """One requirement the incident declared, and what actually carries it.

    Every requirement on the risk comes back in the assign result, fulfilled or
    not. An unfulfillable requirement that simply produced no assignment would
    be indistinguishable from one that was never asked for — and the person on
    the hook would be short one obligation nobody mentioned.
    """

    #: training | quiz | sandbox | min_score
    requirement: str
    fulfilled: bool
    #: What carries it — "training assignment", "reviewer decision", or "" when
    #: nothing in this deployment does.
    mechanism: str
    detail: str


class IncidentRiskAssignRequest(BaseModel):
    """Turn an incident's requirements into real training assignments.

    ``module_id`` is explicit rather than picked automatically: choosing the
    content on the analyst's behalf would put a lesson in front of named people
    that nobody selected for them, over an incident record with their name on it.
    """

    module_id: int | None = None
    #: Subjects to assign; omitted means every subject on the risk.
    subject_ids: list[int] | None = None
    note: str = ""


class AssignedSubject(BaseModel):
    subject_id: int
    employee_id: int
    employee_name: str
    assignment_id: int


class SkippedSubject(BaseModel):
    """A subject that was not assigned, and the reason. Never omitted silently."""

    subject_id: int
    employee_id: int
    employee_name: str
    reason: str


class IncidentRiskAssignResult(BaseModel):
    incident_risk_id: int
    module_id: int | None
    module_title: str = ""
    assigned: list[AssignedSubject] = []
    skipped: list[SkippedSubject] = []
    requirements: list[RequirementOutcome] = []
    #: The risk's status after the call, so a client need not re-fetch to learn
    #: whether assigning moved it.
    status: str
    detail: str = ""


class IncidentRiskPage(BaseModel):
    items: list[IncidentRiskOut]
    total: int
    limit: int
    offset: int
    truncated: bool


# --- Integrations ------------------------------------------------------------


class ExternalCourseOut(ORMModel):
    id: int
    integration_id: int
    external_ref: str
    title: str
    description: str
    provider_name: str
    url: str
    duration_minutes: int | None
    language: str
    topics: list[Any]
    mapped_behaviors: list[Any]
    last_synced_at: datetime | None
    active: bool


class IntegrationOut(ORMModel):
    id: int
    provider: str
    display_name: str
    status: str
    capabilities: list[Any]
    config_summary: dict[str, Any]
    last_sync_at: datetime | None
    last_sync_status: str
    last_sync_error: str | None
    courses_imported: int
    created_at: datetime
    updated_at: datetime


class IntegrationDetail(IntegrationOut):
    courses: list[ExternalCourseOut] = []
    #: The row count behind ``courses``, and whether the list was cut short.
    #: ``courses_imported`` counts what the last sync claimed to import, which
    #: is a different number and drifts from this one when a sync fails.
    courses_total: int = 0
    courses_truncated: bool = False


class IntegrationConfigure(BaseModel):
    """Non-sensitive configuration only.

    There is deliberately no ``api_key``/``client_secret`` field. Credentials
    reach the deployment through its secret store; a request body that carries
    one puts it in every access log between here and the browser.
    """

    display_name: str | None = None
    base_url: str | None = None
    account_name: str | None = None
    capabilities: list[str] | None = None
    status: str | None = None
    #: Free-form non-sensitive shape (seat count, tenant label, course scope).
    config_summary: dict[str, Any] | None = None


class IntegrationSyncRequest(BaseModel):
    #: "courses" | "completions" | "all"
    scope: str = "all"


class IntegrationSyncResult(BaseModel):
    """The honest outcome of one sync.

    ``attempted`` distinguishes a sync that ran and imported nothing from one
    that never reached the provider — the second is a failure wearing the first
    one's clothes.
    """

    integration_id: int
    attempted: bool
    status: str
    courses_imported: int = 0
    completions_synced: int = 0
    error: str | None = None
    synced_at: datetime | None = None
    #: The integration's stored sync state, echoed so a caller can see that an
    #: unattempted sync left it alone rather than overwriting it.
    last_sync_status: str = ""
    last_sync_at: datetime | None = None


class IntegrationDisable(BaseModel):
    """``reason`` is required: disabling an integration silently stops course
    imports and completion sync, and "who turned it off and why" is the first
    question asked when the training records stop moving."""

    reason: str


class ExternalCourseMapping(BaseModel):
    """Which behaviours a third-party course is claimed to move.

    The provider's own topic tags are marketing copy; this mapping is a human's
    assertion and is recorded as one. Passing an empty ``mapped_behaviors`` is a
    legitimate un-mapping, and is audited like any other change.
    """

    mapped_behaviors: list[str]
    #: Replaces the provider's imported topics when given; left alone when null.
    topics: list[str] | None = None
    note: str = ""


class ExternalCoursePage(BaseModel):
    """One page of a provider's mirrored catalogue.

    ``catalogue_note`` states how this list came to exist. A catalogue built by
    a partial or failed sync is not the provider's catalogue, and a UI that
    renders two courses without saying nine were refused is telling the operator
    something untrue about their own LMS.
    """

    items: list[ExternalCourseOut]
    total: int
    limit: int
    offset: int
    truncated: bool
    last_sync_status: str
    last_sync_at: datetime | None
    catalogue_note: str


# --- Audit -------------------------------------------------------------------


class AuditEventOut(ORMModel):
    id: int
    actor_email: str
    actor_role: str
    action: str
    object_type: str
    object_id: int | None
    object_label: str
    summary: str
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    ip_address: str | None
    user_agent: str | None
    at: datetime


class AuditEventPage(BaseModel):
    """One page of the trail, plus the size of the set it was cut from.

    An audit log is read to answer "did anything else happen". A page that
    returns 200 rows and says nothing about the 4 000 it matched answers that
    question wrongly, and does it silently.
    """

    events: list[AuditEventOut]
    total: int
    limit: int
    offset: int
    truncated: bool


class AuditActionOut(BaseModel):
    """One distinct verb in the trail, with how often it appears.

    The count is what makes the filter list usable: it is the difference between
    a verb somebody used once by accident and the one that runs all day.
    """

    action: str
    count: int


PolicyFindingDetail.model_rebuild()
