"""What the portal knows about a sandbox job that the engine does not.

The engine is vendored verbatim (see `db.py`), which means its `SandboxJob` may
not grow a `loop_runs.id` or `users.id` foreign key: the standalone deployment
has neither table, so adding one there would fork the two copies on the very
first line — exactly the drift this integration exists to prevent.

So the coupling lives here instead, on the portal's side of the seam: one row
per job that the portal has something extra to say about. A job submitted by an
analyst through the UI gets a row naming them; a job raised by the awareness
loop's ANALYZE stage gets a row naming the run, so the verdict can be carried
back into the loop. A job submitted through the plain API gets no row at all,
and that absence is not an error — it is a job the portal has nothing extra to
say about.

The engine's own `submitted_by` string still records who acted, because that is
what the audit trail and the exported report read. This table is the join back
to the portal's identities, not a replacement for it.
"""
from __future__ import annotations

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

#: The portal is a single-tenant deployment of a multi-tenant engine. Every job
#: it creates is owned by this tenant, so the engine's isolation column has a
#: real value rather than a null nobody checks.
TENANT = "default"

#: A submission source the engine does not know about, because the standalone
#: has no awareness loop to raise one. `pipeline.new_job` takes `source` as a
#: plain string, so the portal can name its own without touching the engine.
SOURCE_LOOP = "loop"


class SandboxJobLink(Base):
    """Ties one engine job to the portal objects that caused or own it."""

    __tablename__ = "sandbox_job_links"

    #: The engine job. Primary key as well as foreign key: a job has at most one
    #: link, so the schema itself rules out two rows disagreeing about which run
    #: raised it.
    job_id: Mapped[int] = mapped_column(
        ForeignKey("sandbox_jobs.id", ondelete="CASCADE"), primary_key=True
    )

    #: Set when the awareness loop's ANALYZE stage raised this job, so the
    #: verdict can be carried back into that run.
    loop_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("loop_runs.id"), nullable=True, index=True
    )

    #: The portal user who submitted it, when a portal user did.
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
