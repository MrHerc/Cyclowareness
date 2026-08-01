"""Host seam: the clock the vendored engine stamps its rows with.

See `db.py` for why this module exists. The portal already standardises on
aware-UTC everywhere, so the engine gets the portal's own `utcnow` rather than a
second implementation that could disagree with it by a timezone.
"""
from __future__ import annotations

from ..models import utcnow

__all__ = ["utcnow"]
