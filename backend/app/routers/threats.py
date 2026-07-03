from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.orchestrator import start_loop
from ..database import get_db
from ..models import Threat, ThreatSource, User
from ..schemas import ThreatOut, ThreatSubmit
from ..security import require_analyst

router = APIRouter(prefix="/api/threats", tags=["threats"])


@router.post("", response_model=dict)
def submit_threat(
    payload: ThreatSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
):
    """Analyst manually submits an artifact → INGEST (stage 1) → loop starts."""
    threat = Threat(
        source=ThreatSource.MANUAL,
        artifact_type=payload.artifact_type,
        artifact_ref=payload.artifact_ref,
        artifact_meta=payload.artifact_meta,
        title=payload.title or f"Manual submission ({payload.artifact_type})",
    )
    db.add(threat)
    db.flush()
    run = start_loop(db, threat)
    return {"threat_id": threat.id, "loop_run_id": run.id}


@router.get("", response_model=list[ThreatOut])
def list_threats(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    return db.execute(select(Threat).order_by(Threat.created_at.desc()).limit(100)).scalars().all()


@router.get("/{threat_id}", response_model=ThreatOut)
def get_threat(threat_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    threat = db.get(Threat, threat_id)
    if threat is None:
        raise HTTPException(status_code=404, detail="Threat not found")
    return threat
