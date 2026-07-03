from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core import risk_engine
from ..database import get_db
from ..models import Department, Employee, RiskEvent, User
from ..schemas import DepartmentRisk, EmployeeDetail, EmployeeOut
from ..security import get_current_user, require_analyst, require_analyst_or_exec

router = APIRouter(prefix="/api", tags=["employees"])


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    return db.execute(
        select(Employee).order_by(Employee.current_risk_score.desc())
    ).scalars().all()


@router.get("/employees/me", response_model=EmployeeDetail)
def my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    return _detail(db, user.employee_id)


@router.get("/employees/{employee_id}", response_model=EmployeeDetail)
def employee_detail(
    employee_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    return _detail(db, employee_id)


@router.get("/departments", response_model=list[DepartmentRisk])
def department_risk(
    db: Session = Depends(get_db), user: User = Depends(require_analyst_or_exec)
):
    return risk_engine.department_rollups(db)


def _detail(db: Session, employee_id: int) -> EmployeeDetail:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    detail = EmployeeDetail.model_validate(employee)
    detail.department_name = employee.department.name if employee.department else ""
    detail.risk_breakdown = risk_engine.risk_breakdown(db, employee)
    events = db.execute(
        select(RiskEvent)
        .where(RiskEvent.employee_id == employee.id)
        .order_by(RiskEvent.created_at.desc())
        .limit(15)
    ).scalars().all()
    detail.recent_events = [
        {
            "id": e.id,
            "type": e.type,
            "delta": e.delta,
            "reason": e.reason,
            "loop_run_id": e.loop_run_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
    return detail
