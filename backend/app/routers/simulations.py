import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..core.sim_templates import SIM_TEMPLATES, get_template
from ..database import get_db
from ..models import (
    Employee,
    PhishingSimulation,
    SimOutcome,
    SimulationStatus,
    SimulationTarget,
    Threat,
    User,
)
from ..schemas import SimTemplateOut, SimulationCreate, SimulationDetail, SimulationOut
from ..security import require_analyst

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.get("/templates", response_model=list[SimTemplateOut])
def list_templates(user: User = Depends(require_analyst)):
    """Prebuilt multi-channel lure templates (email/SMS/QR/chat)."""
    return SIM_TEMPLATES


@router.post("", response_model=SimulationDetail)
def create_simulation(
    payload: SimulationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Create a campaign. Differentiator: template_threat_id lets analysts
    reuse a REAL analyzed threat as the lure — train on real attacks."""
    employee_ids = set(payload.target_employee_ids)
    if payload.target_department_ids:
        dept_employees = db.execute(
            select(Employee.id).where(Employee.department_id.in_(payload.target_department_ids))
        ).scalars().all()
        employee_ids.update(dept_employees)
    if not employee_ids:
        raise HTTPException(status_code=422, detail="No targets selected")

    channel = payload.channel
    lure_preview = ""
    if payload.lure_template_id:
        template = get_template(payload.lure_template_id)
        if template is None:
            raise HTTPException(status_code=404, detail="Lure template not found")
        channel = template["channel"]
        lure_preview = template["sample_lure"]
    elif payload.template_threat_id:
        threat = db.get(Threat, payload.template_threat_id)
        if threat is not None:
            channel = threat.artifact_type
            lure_preview = threat.artifact_ref[:600]

    simulation = PhishingSimulation(
        name=payload.name,
        template_threat_id=payload.template_threat_id,
        lure_template_id=payload.lure_template_id,
        lure_preview=lure_preview,
        channel=channel,
        status=SimulationStatus.DRAFT,
        created_by=user.email,
    )
    db.add(simulation)
    db.flush()
    for emp_id in sorted(employee_ids):
        db.add(SimulationTarget(simulation_id=simulation.id, employee_id=emp_id))
    db.commit()
    return _detail(db, simulation)


@router.get("", response_model=list[SimulationOut])
def list_simulations(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    return db.execute(
        select(PhishingSimulation).order_by(PhishingSimulation.created_at.desc()).limit(50)
    ).scalars().all()


@router.get("/{sim_id}", response_model=SimulationDetail)
def get_simulation(sim_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    simulation = db.get(PhishingSimulation, sim_id)
    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return _detail(db, simulation)


@router.post("/{sim_id}/launch", response_model=SimulationDetail)
def launch(sim_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    simulation = db.get(PhishingSimulation, sim_id)
    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if simulation.status != SimulationStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Simulation already launched")
    simulation.status = SimulationStatus.ACTIVE
    simulation.launched_at = datetime.now(timezone.utc)
    db.commit()
    return _detail(db, simulation)


@router.post("/{sim_id}/targets/{target_id}/outcome", response_model=SimulationDetail)
def record_outcome(
    sim_id: int,
    target_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Record a per-target event (clicked / reported / ignored) → risk engine."""
    outcome = payload.get("outcome")
    if outcome not in (SimOutcome.CLICKED, SimOutcome.REPORTED, SimOutcome.IGNORED):
        raise HTTPException(status_code=422, detail="outcome must be clicked|reported|ignored")
    simulation = db.get(PhishingSimulation, sim_id)
    target = db.get(SimulationTarget, target_id)
    if simulation is None or target is None or target.simulation_id != sim_id:
        raise HTTPException(status_code=404, detail="Simulation target not found")
    if simulation.status != SimulationStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Simulation is not active")
    if target.outcome != SimOutcome.PENDING:
        raise HTTPException(status_code=409, detail="Outcome already recorded")
    _apply_outcome(db, simulation, target, outcome)
    db.commit()
    return _detail(db, simulation)


@router.post("/{sim_id}/auto-outcomes", response_model=SimulationDetail)
def auto_outcomes(sim_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Demo helper: resolve all pending targets with behaviour weighted by each
    employee's current risk score (riskier people click more, report less)."""
    simulation = db.get(PhishingSimulation, sim_id)
    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if simulation.status != SimulationStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Simulation is not active")
    pending = [t for t in simulation.targets if t.outcome == SimOutcome.PENDING]
    for target in pending:
        employee = db.get(Employee, target.employee_id)
        risk = employee.current_risk_score if employee else 40.0
        p_click = 0.10 + (risk / 100.0) * 0.55        # 10%…65%
        p_report = 0.55 - (risk / 100.0) * 0.40       # 55%…15%
        roll = random.random()
        if roll < p_click:
            outcome = SimOutcome.CLICKED
        elif roll < p_click + p_report:
            outcome = SimOutcome.REPORTED
        else:
            outcome = SimOutcome.IGNORED
        _apply_outcome(db, simulation, target, outcome)
    db.commit()
    return _detail(db, simulation)


@router.post("/{sim_id}/complete", response_model=SimulationDetail)
def complete(sim_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    simulation = db.get(PhishingSimulation, sim_id)
    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if simulation.status != SimulationStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Only an active simulation can be closed")
    simulation.status = SimulationStatus.COMPLETED
    simulation.completed_at = datetime.now(timezone.utc)
    db.commit()
    return _detail(db, simulation)


def _apply_outcome(db: Session, simulation, target: SimulationTarget, outcome: str) -> None:
    target.outcome = outcome
    target.outcome_at = datetime.now(timezone.utc)
    db.add(target)
    employee = db.get(Employee, target.employee_id)
    if employee is None:
        return
    if outcome == SimOutcome.CLICKED:
        risk_engine.apply_event(
            db, employee, "simulated_phish_click",
            reason=f'Clicked lure in simulation "{simulation.name}"',
        )
    elif outcome == SimOutcome.REPORTED:
        risk_engine.apply_event(
            db, employee, "simulated_phish_report",
            reason=f'Reported lure in simulation "{simulation.name}"',
        )


def _detail(db: Session, simulation: PhishingSimulation) -> SimulationDetail:
    base = SimulationOut.model_validate(simulation)
    detail = SimulationDetail(**base.model_dump())
    detail.targets = [
        {
            "id": t.id,
            "employee_id": t.employee_id,
            "employee_name": t.employee.name if t.employee else "?",
            "department": t.employee.department.name if t.employee and t.employee.department else "",
            "risk_score": t.employee.current_risk_score if t.employee else None,
            "outcome": t.outcome,
            "outcome_at": t.outcome_at.isoformat() if t.outcome_at else None,
        }
        for t in simulation.targets
    ]
    total = len(simulation.targets)
    clicked = sum(1 for t in simulation.targets if t.outcome == SimOutcome.CLICKED)
    reported = sum(1 for t in simulation.targets if t.outcome == SimOutcome.REPORTED)
    resolved = sum(1 for t in simulation.targets if t.outcome != SimOutcome.PENDING)
    detail.stats = {
        "targets": total,
        "resolved": resolved,
        "clicked": clicked,
        "reported": reported,
        "click_rate": round(clicked / resolved, 2) if resolved else None,
        "report_rate": round(reported / resolved, 2) if resolved else None,
    }
    return detail
