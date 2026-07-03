from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..ai.ai_service import triage_assist
from ..core import risk_engine
from ..core.orchestrator import start_loop
from ..database import get_db
from ..models import (
    Employee,
    PhishingReport,
    ReportStatus,
    Threat,
    ThreatSource,
    User,
)
from ..schemas import ReportDetail, ReportOut, ReportSubmit
from ..security import get_current_user, require_analyst

router = APIRouter(prefix="/api/reports", tags=["human-sensor"])


@router.post("", response_model=ReportOut)
async def submit_report(
    payload: ReportSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The one-click human sensor (spec §6.6): an employee reports a
    suspicious artifact. AI triage runs immediately to accelerate the analyst;
    reporting itself is rewarded in the risk model."""
    if user.employee_id is None:
        raise HTTPException(status_code=403, detail="No employee profile linked to this account")
    report = PhishingReport(
        employee_id=user.employee_id,
        artifact_type=payload.artifact_type,
        artifact_ref=payload.artifact_ref,
        artifact_meta=payload.artifact_meta,
        note=payload.note,
        status=ReportStatus.NEW,
    )
    report.triage_summary = await triage_assist(
        {
            "artifact_type": payload.artifact_type,
            "artifact_ref": payload.artifact_ref,
            "artifact_meta": payload.artifact_meta,
            "note": payload.note,
        }
    )
    db.add(report)

    # Reward the sensor behaviour, but cap the credit at 3 reports per 24h so
    # the score can't be farmed by spamming reports.
    employee = db.get(Employee, user.employee_id)
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_credits = db.execute(
        select(func.count(PhishingReport.id)).where(
            PhishingReport.employee_id == employee.id,
            PhishingReport.created_at >= since,
        )
    ).scalar() or 0
    if recent_credits < 3:
        risk_engine.apply_event(
            db, employee, "real_threat_report",
            reason="Reported a suspicious artifact (human sensor)",
        )
    db.commit()
    return report


@router.get("/my", response_model=list[ReportOut])
def my_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.employee_id is None:
        return []
    return db.execute(
        select(PhishingReport)
        .where(PhishingReport.employee_id == user.employee_id)
        .order_by(PhishingReport.created_at.desc())
    ).scalars().all()


@router.get("", response_model=list[ReportDetail])
def list_reports(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    query = select(PhishingReport).order_by(PhishingReport.created_at.desc()).limit(100)
    if status:
        query = query.where(PhishingReport.status == status)
    reports = db.execute(query).scalars().all()
    out = []
    for r in reports:
        detail = ReportDetail.model_validate(r)
        detail.employee_name = r.employee.name if r.employee else ""
        detail.department_name = (
            r.employee.department.name if r.employee and r.employee.department else ""
        )
        out.append(detail)
    return out


@router.post("/{report_id}/push-to-loop", response_model=dict)
def push_to_loop(
    report_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    """Analyst triages a report into the loop → INGEST (stage 1)."""
    report = db.get(PhishingReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status == ReportStatus.IN_LOOP:
        raise HTTPException(status_code=409, detail="Report is already in the loop")

    meta = dict(report.artifact_meta or {})
    subject = meta.get("subject") or (report.artifact_ref[:60] + "…")
    threat = Threat(
        source=ThreatSource.HUMAN_SENSOR,
        artifact_type=report.artifact_type,
        artifact_ref=report.artifact_ref,
        artifact_meta=meta,
        title=f"Reported: {subject}",
        reported_by_employee_id=report.employee_id,
    )
    db.add(threat)
    db.flush()
    report.linked_threat_id = threat.id
    run = start_loop(db, threat, report=report)
    return {"threat_id": threat.id, "loop_run_id": run.id}


@router.post("/{report_id}/dismiss", response_model=ReportOut)
def dismiss_report(
    report_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)
):
    report = db.get(PhishingReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = ReportStatus.DISMISSED
    db.commit()
    return report
