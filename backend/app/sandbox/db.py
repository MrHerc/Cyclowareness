"""Host seam: the declarative base the vendored engine registers its tables on.

`app/sandbox/engine/` is a **verbatim copy** of the standalone Cyclowareness
Sandbox engine — the same files, byte for byte, so that the two deployments
cannot drift apart. The engine reaches out of itself in exactly four places:

    from ..db import Base
    from ..util import utcnow
    from ..config import get_settings
    from ... import sovereignty          # from inside engine/analyzers/

This module, `util.py`, `config.py` and `sovereignty.py` beside it exist only to
satisfy those four imports out of the portal's own modules. The count said three
while the seam had been four since the sovereignty choke point landed, and
`test_the_engine_seam_holds` has asserted four the whole time — so this file was
the one place a reader could be told the wrong number. Nothing else may be added:
the moment the engine needs a fourth thing from the host, that is a signal to
push the dependency back down into the engine instead of widening this seam.

Re-exporting the portal's `Base` — rather than declaring a second one — is what
makes the engine's tables land in the same metadata, and therefore the same
`create_all()`, as the rest of the portal.
"""
from __future__ import annotations

from ..database import Base, get_db, session_scope

__all__ = ["Base", "get_db", "session_scope"]
