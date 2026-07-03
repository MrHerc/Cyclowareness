from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.orchestrator import start_loop
from ..database import get_db
from ..models import FeedItem, Threat, ThreatSource, User
from ..schemas import FeedItemOut
from ..security import require_analyst

router = APIRouter(prefix="/api/feed", tags=["intel-feed"])


@router.get("", response_model=list[FeedItemOut])
def list_feed(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Curated, input-only intel feed (spec §6.8) — deliberately minimal."""
    return db.execute(
        select(FeedItem).order_by(FeedItem.published_at.desc()).limit(30)
    ).scalars().all()


@router.post("/{item_id}/push-to-loop", response_model=dict)
def push_to_loop(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Analyst pushes a relevant real-world threat into the loop → stage 1."""
    item = db.get(FeedItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Feed item not found")
    if item.pushed_to_loop:
        raise HTTPException(status_code=409, detail="Already pushed into the loop")

    threat = Threat(
        source=ThreatSource.FEED,
        artifact_type=item.artifact_type,
        artifact_ref=item.artifact_example or item.summary,
        artifact_meta={"feed_iocs": item.iocs, "severity": item.severity, "source": item.source_name},
        title=item.title,
    )
    db.add(threat)
    db.flush()
    item.pushed_to_loop = True
    db.add(item)
    run = start_loop(db, threat)
    return {"threat_id": threat.id, "loop_run_id": run.id}
