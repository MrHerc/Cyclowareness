from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..core.orchestrator import on_assignment_completed
from ..database import get_db
from ..models import (
    AssignmentStatus,
    Employee,
    TrainingAssignment,
    TrainingModule,
    User,
)
from ..schemas import (
    AssignmentDetail,
    AssignmentOut,
    ModuleEdit,
    QuizResult,
    QuizSubmission,
    TrainingModuleOut,
)
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
    detail.module = module
    detail.employee_name = assignment.employee.name if assignment.employee else ""
    return detail
