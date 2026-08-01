"""Host seam: the declarative base the vendored engine registers its tables on.

`app/sandbox/engine/` is a **verbatim copy** of the standalone Cyclowareness
Sandbox engine — the same files, byte for byte, so that the two deployments
cannot drift apart. The engine reaches out of itself in exactly three places:

    from ..db import Base
    from ..util import utcnow
    from ..config import get_settings

This module, `util.py` and `config.py` next to it exist only to satisfy those
three imports out of the portal's own modules. Nothing else may be added here:
the moment the engine needs a fourth thing from the host, that is a signal to
push the dependency back down into the engine instead of widening this seam.

Re-exporting the portal's `Base` — rather than declaring a second one — is what
makes the engine's tables land in the same metadata, and therefore the same
`create_all()`, as the rest of the portal.
"""
from __future__ import annotations

from ..database import Base, get_db, session_scope

__all__ = ["Base", "get_db", "session_scope"]
