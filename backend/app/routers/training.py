from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..core.orchestrator import on_assignment_completed
from ..database import get_db
from ..models import (
    AssignmentStatus,
    ModuleStatus,
    Employee,
    TrainingAssignment,
    TrainingModule,
    TrainingResource,
    User,
)
from ..schemas import (
    AssignmentDetail,
    ModuleCreate,
    AssignmentOut,
    ModuleEdit,
    QuizResult,
    QuizSubmission,
    ResourceImportReport,
    ResourceImportRequest,
    TrainingModuleOut,
    TrainingResourceOut,
    TrainingResourceTopic,
)
from ..platform import models as platform_models
from ..schemas import ModuleReviewRequest, ModuleReviewResult
from ..training import resources as resource_service
from ..training.assignment import assign_module_to_employees
from ..security import get_current_user, require_analyst

router = APIRouter(prefix="/api/training", tags=["training"])

PASS_THRESHOLD = 60.0


def _employee_for(user: User, db: Session) -> Employee:
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    employee = db.get(Employee, user.employee_id)
    if employee is None:
        raise HTTPException(status_code=403, detail="Employee profile not found")
    return employee


# --- Analyst: module review (human-in-the-loop) -------------------------------

@router.get("/modules", response_model=list[TrainingModuleOut])
def list_modules(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    query = select(TrainingModule).order_by(TrainingModule.created_at.desc()).limit(100)
    if status:
        query = query.where(TrainingModule.status == status)
    return db.execute(query).scalars().all()


@router.get("/modules/{module_id}", response_model=TrainingModuleOut)
def get_module(module_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    module = db.get(TrainingModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return module


@router.post("/modules", response_model=TrainingModuleOut, status_code=201)
def create_module(
    payload: ModuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """An analyst writes a module from scratch.

    Everything AI-shaped is pinned to its honest value and not accepted from the
    caller: `ai_generated=False`, `generation_source=""` — this module was
    written by the person whose email lands in the audit row, and no request
    body can claim otherwise. It opens in PENDING_REVIEW like every other
    module: authoring a module and approving it stay two different acts, even
    when the same person will do both.
    """
    if payload.quiz:
        _validate_quiz_shape(payload.quiz)
    for section in payload.content:
        if not isinstance(section, dict) or "heading" not in section or "body" not in section:
            raise HTTPException(status_code=422, detail="Each content section needs heading and body")

    module = TrainingModule(
        title=payload.title.strip(),
        description=payload.description.strip(),
        content=payload.content,
        quiz=payload.quiz,
        takeaway=payload.takeaway.strip(),
        channel=payload.channel,
        est_minutes=payload.est_minutes,
        ai_generated=False,
        generation_source="",
        status=ModuleStatus.PENDING_REVIEW,
    )
    db.add(module)
    db.flush()
    platform_models.record(
        db,
        actor=user,
        action="training.module.create",
        object_type="training_module",
        object_id=module.id,
        object_label=module.title[:120],
        summary="Module authored by hand from the studio.",
    )
    db.commit()
    return module


@router.patch("/modules/{module_id}", response_model=TrainingModuleOut)
def edit_module(
    module_id: int,
    payload: ModuleEdit,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Analyst edits the AI-generated module before approving it."""
    module = db.get(TrainingModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    if payload.quiz is not None:
        _validate_quiz_shape(payload.quiz)
    if payload.content is not None:
        for section in payload.content:
            if not isinstance(section, dict) or "heading" not in section or "body" not in section:
                raise HTTPException(status_code=422, detail="Each content section needs heading and body")
    for field in ("title", "description", "content", "quiz", "takeaway"):
        value = getattr(payload, field)
        if value is not None:
            setattr(module, field, value)
    db.commit()
    return module


@router.post("/modules/{module_id}/review", response_model=ModuleReviewResult)
def review_module(
    module_id: int,
    payload: ModuleReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Approve or reject a STANDALONE module — the gate the pipeline routes through.

    Loop-run modules are decided in the approvals queue; this endpoint exists
    for modules with no run: hand-authored ones, and modules the finding→
    training pipeline GENERATED. Until it existed there was no way to approve
    those at all.

    The origin hook is the whole point. When an approved module carries
    `origin` — the finding or incident risk it was generated for, and the
    employees it was generated FOR — approval is the moment the assignment
    actually happens. Generation queued the decision; a named person makes it;
    only then does anything reach an employee. The response lists exactly who
    was assigned and who was skipped, with reasons.
    """
    module = db.get(TrainingModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    if module.status != ModuleStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=409, detail=f"Module is {module.status}, not pending review"
        )
    if payload.decision not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail='decision must be "approve" or "reject"')
    if payload.decision == "reject" and not payload.comment.strip():
        raise HTTPException(
            status_code=422,
            detail="A rejection needs a comment — the queue must know what is wrong with it.",
        )

    assigned: list[dict] = []
    skipped: list[dict] = []
    origin_note = ""
    if payload.decision == "approve":
        module.status = ModuleStatus.APPROVED
        module.approved_by = user.email
        origin = module.origin if isinstance(module.origin, dict) else None
        if origin and origin.get("employee_ids"):
            kind = origin.get("kind", "")
            ref = origin.get("id")
            # BOTH auto-train endpoints refuse a terminal finding or a closed
            # risk ("reopen it before assigning training"). Approval happens
            # later — sometimes days later — so the same question has to be
            # asked again here. Without this, a finding ruled a false positive
            # on Tuesday still puts obligations on named people when somebody
            # works the review queue on Wednesday.
            blocked = _origin_is_terminal(db, kind, ref)
            if blocked:
                origin_note = (
                    f"Approved, but nothing was assigned: {blocked} "
                    f"Reopen it and run auto-train again to raise the obligation."
                )
            reason = (
                f"Policy finding #{ref}" if kind == "policy_finding"
                else f"Incident risk #{ref}" if kind == "incident_risk"
                else "Generated training"
            )
            if not blocked:
                assigned, skipped = assign_module_to_employees(
                    db, module, list(origin["employee_ids"]), f"{reason}: {module.title}"
                )
            if assigned:
                if kind == "policy_finding" and ref is not None:
                    finding = db.get(platform_models.PolicyFinding, ref)
                    if finding is not None and finding.status not in (
                        platform_models.FindingStatus.RESOLVED,
                        platform_models.FindingStatus.ACCEPTED_RISK,
                        platform_models.FindingStatus.FALSE_POSITIVE,
                    ):
                        finding.status = platform_models.FindingStatus.TRAINING_ASSIGNED
                elif kind == "incident_risk" and ref is not None:
                    risk = db.get(platform_models.IncidentRisk, ref)
                    subjects = db.scalars(
                        select(platform_models.IncidentRiskSubject).where(
                            platform_models.IncidentRiskSubject.incident_risk_id == ref
                        )
                    ).all()
                    by_employee = {a["employee_id"]: a["assignment_id"] for a in assigned}
                    for subject in subjects:
                        if subject.employee_id in by_employee and subject.assignment_id is None:
                            subject.assignment_id = by_employee[subject.employee_id]
                    if risk is not None and risk.status in (
                        platform_models.IncidentRiskStatus.DRAFT,
                        platform_models.IncidentRiskStatus.OPEN,
                        platform_models.IncidentRiskStatus.REOPENED,
                    ):
                        risk.status = platform_models.IncidentRiskStatus.ASSIGNED
            if not blocked:
                origin_note = (
                    f"Approval completed the generated-training pipeline: "
                    f"{len(assigned)} assigned, {len(skipped)} skipped, "
                    f"raised by {reason.lower()}."
                )
    else:
        module.status = ModuleStatus.REJECTED

    platform_models.record(
        db,
        actor=user,
        action=f"training.module.{payload.decision}",
        object_type="training_module",
        object_id=module.id,
        object_label=module.title[:120],
        summary=(payload.comment.strip() or f"Module {payload.decision}d in the studio.")
        + (f" {origin_note}" if origin_note else ""),
        after={
            "status": module.status,
            "assigned": assigned,
            "skipped": skipped,
        },
    )
    db.commit()
    db.refresh(module)
    return ModuleReviewResult(
        module=TrainingModuleOut.model_validate(module),
        assigned=assigned,
        skipped=skipped,
        origin_note=origin_note,
    )


def _origin_is_terminal(db: Session, kind: str, ref: int | None) -> str:
    """Why this origin can no longer raise an obligation, or '' if it still can."""
    if ref is None:
        return ""
    if kind == "policy_finding":
        finding = db.get(platform_models.PolicyFinding, ref)
        if finding is None:
            return f"policy finding #{ref} no longer exists."
        if finding.status in (
            platform_models.FindingStatus.RESOLVED,
            platform_models.FindingStatus.ACCEPTED_RISK,
            platform_models.FindingStatus.FALSE_POSITIVE,
        ):
            return f"policy finding #{ref} is {finding.status}."
    elif kind == "incident_risk":
        risk = db.get(platform_models.IncidentRisk, ref)
        if risk is None:
            return f"incident risk #{ref} no longer exists."
        if risk.status == platform_models.IncidentRiskStatus.CLOSED:
            return f"incident risk #{ref} is closed."
    return ""


def _validate_quiz_shape(quiz: list) -> None:
    """A malformed quiz would make assignments uncompletable — reject it here."""
    if not (3 <= len(quiz) <= 5):
        raise HTTPException(status_code=422, detail="Quiz must have 3–5 questions")
    for q in quiz:
        if not isinstance(q, dict) or not all(k in q for k in ("question", "options", "correct_index")):
            raise HTTPException(status_code=422, detail="Each question needs question, options, correct_index")
        if not isinstance(q["options"], list) or len(q["options"]) != 4:
            raise HTTPException(status_code=422, detail="Each question needs exactly 4 options")
        try:
            if not (0 <= int(q["correct_index"]) <= 3):
                raise ValueError
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="correct_index must be 0–3")


# --- Employee: my assignments ---------------------------------------------------

@router.get("/my", response_model=list[AssignmentDetail])
def my_assignments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    employee = _employee_for(user, db)
    assignments = db.execute(
        select(TrainingAssignment)
        .where(TrainingAssignment.employee_id == employee.id)
        .order_by(TrainingAssignment.assigned_at.desc())
    ).scalars().all()
    return [_assignment_detail(a) for a in assignments]


@router.get("/assignments/{assignment_id}", response_model=AssignmentDetail)
def get_assignment(
    assignment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    assignment = db.get(TrainingAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    # Allow-list: only the owner or an analyst may read an assignment
    if user.role != "analyst" and assignment.employee_id != user.employee_id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    return _assignment_detail(assignment)


@router.post("/assignments/{assignment_id}/start", response_model=AssignmentOut)
def start_assignment(
    assignment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    assignment = db.get(TrainingAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.employee_id != user.employee_id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    if assignment.status == AssignmentStatus.ASSIGNED:
        assignment.status = AssignmentStatus.IN_PROGRESS
        db.commit()
    return assignment


@router.post("/assignments/{assignment_id}/complete", response_model=QuizResult)
def complete_assignment(
    assignment_id: int,
    payload: QuizSubmission,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Employee submits the quiz → MEASURE inputs are recorded, risk moves,
    and (via the orchestrator hook) the loop advances when the run's last
    assignment lands."""
    assignment = db.get(TrainingAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.employee_id != user.employee_id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    if assignment.status == AssignmentStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Already completed")
    if assignment.status == AssignmentStatus.EXPIRED:
        raise HTTPException(
            status_code=409,
            detail="This assignment expired (its loop run was already measured)",
        )

    module = db.get(TrainingModule, assignment.module_id)
    quiz = module.quiz or []
    if len(payload.answers) != len(quiz):
        raise HTTPException(
            status_code=422,
            detail=f"Expected {len(quiz)} answers, got {len(payload.answers)}",
        )

    per_question = []
    correct = 0
    for i, (question, answer) in enumerate(zip(quiz, payload.answers)):
        is_correct = int(answer) == int(question["correct_index"])
        correct += int(is_correct)
        per_question.append(
            {
                "index": i,
                "correct": is_correct,
                "correct_index": question["correct_index"],
                "explanation": question.get("explanation", ""),
            }
        )
    score = round(100.0 * correct / len(quiz), 1) if quiz else 100.0

    assignment.status = AssignmentStatus.COMPLETED
    assignment.score = score
    assignment.time_spent_seconds = payload.time_spent_seconds
    assignment.completed_at = datetime.now(timezone.utc)
    db.add(assignment)

    # Risk engine: completion credit + comprehension credit (or failure signal)
    employee = db.get(Employee, assignment.employee_id)
    before = employee.current_risk_score
    risk_engine.apply_event(
        db, employee, "training_completed",
        reason=f'Completed "{module.title}"', loop_run_id=assignment.loop_run_id,
    )
    if score >= PASS_THRESHOLD:
        risk_engine.apply_event(
            db, employee, "training_comprehension",
            reason=f"Quiz comprehension {score:.0f}%",
            loop_run_id=assignment.loop_run_id,
            scale=score / 100.0,
        )
    else:
        risk_engine.apply_event(
            db, employee, "training_failed",
            reason=f"Quiz failed ({score:.0f}%) — needs reinforcement",
            loop_run_id=assignment.loop_run_id,
        )
    db.commit()

    # Advance the loop if this was the run's last open assignment
    on_assignment_completed(db, assignment)

    return QuizResult(
        score=score,
        correct=correct,
        total=len(quiz),
        passed=score >= PASS_THRESHOLD,
        per_question=per_question,
        risk_delta=round(employee.current_risk_score - before, 1),
        new_risk_score=employee.current_risk_score,
    )


def _assignment_detail(assignment: TrainingAssignment) -> AssignmentDetail:
    detail = AssignmentDetail.model_validate(assignment)
    module = TrainingModuleOut.model_validate(assignment.module)
    # Never ship the answer key to the quiz-taker: strip correct_index and
    # explanations. The grading endpoint returns them after submission.
    module.quiz = [
        {"question": q.get("question", ""), "options": q.get("options", [])}
        for q in (assignment.module.quiz or [])
    ]
    # AND NEVER THE ORIGIN. It carries the incident-risk/finding id and the
    # employee ids of everyone else that investigation named. `incident_risks`
    # withholds exactly this from its own employee view, and shipping it
    # through the training route would route around that redaction — the
    # failure its module docstring predicts for "redaction implemented as an
    # `if` in one route". The analyst-facing module routes keep it.
    module.origin = None
    detail.module = module
    detail.employee_name = assignment.employee.name if assignment.employee else ""
    return detail


# --- External resources -----------------------------------------------------
#
# One rule governs every read below: `verified_at IS NOT NULL`. A row without it
# has never been dereferenced by anything, and a link nobody has opened is
# indistinguishable — to the person who clicks it — from a link that was made up.
# The filter is repeated at each site rather than hidden in a helper, because it
# is the property that makes this catalogue worth having and it should be
# visible in the code that serves it.


@router.get("/resources/topics", response_model=list[TrainingResourceTopic])
def resource_topics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[TrainingResourceTopic]:
    """Every attack the catalogue knows, with how many VERIFIED resources it holds.

    Topics with nothing in them are still listed, with zero. "We have no
    material for quishing" is a fact worth surfacing — hiding the empty row
    turns a gap into an absence nobody notices.
    """
    counts = dict(
        db.execute(
            select(TrainingResource.topic, func.count())
            .where(TrainingResource.verified_at.is_not(None))
            .group_by(TrainingResource.topic)
        ).all()
    )
    return [
        TrainingResourceTopic(key=key, label=label, count=int(counts.get(key, 0)))
        for key, label in resource_service.TOPICS.items()
    ]


@router.get("/resources", response_model=list[TrainingResourceOut])
def list_resources(
    topic: str | None = None,
    channel: str | None = None,
    limit: int = 40,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[TrainingResource]:
    """Verified resources, newest verification first."""
    query = select(TrainingResource).where(TrainingResource.verified_at.is_not(None))
    if topic:
        query = query.where(TrainingResource.topic == topic)
    if channel:
        query = query.where(TrainingResource.channel == channel)
    query = query.order_by(TrainingResource.verified_at.desc()).limit(min(limit, 100))
    return list(db.scalars(query).all())


@router.get("/modules/{module_id}/resources", response_model=list[TrainingResourceOut])
def resources_for_module(
    module_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[TrainingResource]:
    """What a learner can watch after finishing this module.

    Matched on the module's CHANNEL, which the loop already sets from the real
    threat the module was built out of — so somebody who fell for a QR lure is
    offered material about QR lures. There is no attempt to infer a topic from
    the module's prose: a wrong match here sends a person to a video about the
    wrong attack, and a confident wrong answer is worse than a short list.
    """
    module = db.get(TrainingModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")

    return list(
        db.scalars(
            select(TrainingResource)
            .where(
                TrainingResource.verified_at.is_not(None),
                TrainingResource.channel == module.channel,
            )
            .order_by(TrainingResource.verified_at.desc())
            .limit(6)
        ).all()
    )


@router.post("/resources/import", response_model=ResourceImportReport)
def import_resources(
    payload: ResourceImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
) -> ResourceImportReport:
    """Add candidate URLs. Each is fetched; only the ones that answer are stored.

    Analyst-only, and `added_by` records WHICH analyst. Verification proves the
    link resolves; it says nothing about whether the content is any good or
    teaches what it was filed under. A person vouches for that, and the
    catalogue records who.
    """
    if payload.topic not in resource_service.TOPICS:
        raise HTTPException(status_code=400, detail=f"Unknown topic {payload.topic!r}")

    candidates = [
        resource_service.Candidate(
            provider="youtube" if "youtu" in url else ("coursera" if "coursera" in url else "udemy"),
            url=url.strip(),
            # A placeholder: verification replaces it with the provider's own
            # title, and a candidate that cannot be verified is never stored.
            title="(pending verification)",
            topic=payload.topic,
            channel=payload.channel,
        )
        for url in payload.urls
    ]

    report = resource_service.store_verified(
        db, candidates, added_by=f"analyst:{user.email}"
    )
    db.commit()
    return ResourceImportReport(**report)
