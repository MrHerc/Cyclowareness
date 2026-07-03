from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.orchestrator import continue_after_approval, force_measure
from ..database import get_db
from ..models import (
    LoopRun,
    LoopStatus,
    ModuleStatus,
    TrainingAssignment,
    TrainingModule,
    User,
)
from ..schemas import LoopRunDetail, LoopRunOut
from ..security import require_analyst

router = APIRouter(prefix="/api/loop-runs", tags=["loop"])


@router.get("", response_model=list[LoopRunOut])
def list_runs(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    query = select(LoopRun).order_by(LoopRun.created_at.desc()).limit(100)
    if status == "active":
        query = query.where(
            LoopRun.status.in_(
                [LoopStatus.RUNNING, LoopStatus.AWAITING_APPROVAL, LoopStatus.AWAITING_TRAINING]
            )
        ).limit(50)
    elif status:
        query = query.where(LoopRun.status == status)
    return db.execute(query).scalars().all()


@router.get("/{run_id}", response_model=LoopRunDetail)
def get_run(run_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    run = db.get(LoopRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Loop run not found")
    assignments = db.execute(
        select(TrainingAssignment).where(TrainingAssignment.loop_run_id == run.id)
    ).scalars().all()
    detail = LoopRunDetail.model_validate(run)
    detail.assignments = [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": a.employee.name if a.employee else "?",
            "status": a.status,
            "score": a.score,
            "targeting_reasons": a.targeting_reasons,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in assignments
    ]
    return detail


@router.post("/{run_id}/approve", response_model=LoopRunOut)
def approve_training(
    run_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    """Human-in-the-loop: approve the AI-generated module → TARGET → TRAIN."""
    run = db.get(LoopRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Loop run not found")
    if run.status != LoopStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=409, detail=f"Run is not awaiting approval (status: {run.status})")
    module = db.get(TrainingModule, run.training_module_id)
    if module is None:
        raise HTTPException(status_code=409, detail="Run has no training module")
    module.status = ModuleStatus.APPROVED
    module.approved_by = user.email
    db.add(module)
    continue_after_approval(db, run)
    return run


@router.post("/{run_id}/reject", response_model=LoopRunOut)
def reject_training(
    run_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    """Reject the AI-generated module; the run is closed as failed-by-review."""
    run = db.get(LoopRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Loop run not found")
    if run.status != LoopStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=409, detail=f"Run is not awaiting approval (status: {run.status})")
    module = db.get(TrainingModule, run.training_module_id)
    if module is not None:
        module.status = ModuleStatus.REJECTED
        db.add(module)
    history = list(run.stage_history or [])
    history.append(
        {
            "stage": 3,
            "name": "convert",
            "status": "failed",
            "started_at": None,
            "completed_at": None,
            "detail": "",
            "error": f"AI-generated module rejected by {user.email}",
        }
    )
    run.stage_history = history
    run.status = LoopStatus.FAILED
    db.commit()
    return run


@router.post("/{run_id}/force-measure", response_model=LoopRunOut)
def force_measure_run(
    run_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    """Analyst override for a stalled run: expire open assignments, measure now."""
    run = db.get(LoopRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Loop run not found")
    if run.status != LoopStatus.AWAITING_TRAINING:
        raise HTTPException(status_code=409, detail=f"Run is not awaiting training (status: {run.status})")
    force_measure(db, run)
    return run
