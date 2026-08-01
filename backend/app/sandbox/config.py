"""Host seam: the settings object the vendored engine reads.

See `db.py` for why this module exists. The engine touches exactly four keys —
`entity_name`, `entity_country`, `entity_sector`, `entity_contact` — and only to
copy them verbatim into a regulatory incident record. The portal's `Settings`
carries them, so the engine can read the portal's own settings unchanged.
"""
from __future__ import annotations

from ..config import Settings, get_settings

__all__ = ["Settings", "get_settings"]
