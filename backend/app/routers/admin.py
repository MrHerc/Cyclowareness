"""Admin utilities — exhibition/demo operations (analyst-only)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..seed import reset_and_reseed
from ..security import require_analyst

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/reset-demo")
def reset_demo(db: Session = Depends(get_db), user: User = Depends(require_analyst)):
    """Wipe and re-seed the demo world — a clean slate between exhibition runs.

    Deterministic: the same Caspian Dynamics org, with its six months of
    history re-anchored to *now*, is recreated every time.
    """
    reset_and_reseed(db)
    return {"status": "reset", "message": "Demo data restored to a fresh Caspian Dynamics world."}
