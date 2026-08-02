"""Sandbox engine integration: the columns the vendored engine needs.

Revision ID: 0002_sandbox_engine
Revises: 0001_baseline
Create Date: 2026-08-02

The portal replaced its own copy of the analysis engine with the standalone
Cyclowareness Sandbox's engine, vendored verbatim. That engine's `SandboxJob`
carries nine columns the old one did not, and does not carry two that it did.

WHY THIS MIGRATION EXISTS AT ALL — the failure it repairs is silent.

`create_all()` CREATES a table it has never seen and does nothing whatsoever to
one it has. So on any database that already held `sandbox_jobs`, the upgrade to
the new engine reported success and left the table exactly as it was. Reproduced
on a copy of the pre-integration schema:

    create_all() completed without error
    QUERY FAILED -> OperationalError
       (sqlite3.OperationalError) no such column: sandbox_jobs.tenant_id

`/api/health` still answered 200 the whole time. The live deployment escaped
only because it runs SQLite on an ephemeral disk and gets a fresh database on
every redeploy — luck, not design, and luck that ends the day it moves to the
PostgreSQL its own production config requires.

The two dropped columns moved rather than disappeared: the engine may not carry
a foreign key into `users` or `loop_runs` (the standalone has neither table), so
the portal keeps that association in `sandbox_job_links`, created here. Existing
values are copied across before the columns go, so no association is lost.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_sandbox_engine"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


#: The nine columns the vendored engine added. `server_default` is not optional
#: on the NOT NULL ones: an existing row has no value for a column that did not
#: exist, so adding it without a default fails outright on PostgreSQL and leaves
#: NULLs in a NOT NULL column on SQLite.
_ADDED = (
    # (name, type, nullable, server_default)
    ("tenant_id", sa.String(length=64), False, "default"),
    ("submitted_by", sa.String(length=64), True, None),
    ("dynamic", sa.JSON(), False, "{}"),
    ("sample_deleted_at", sa.DateTime(), True, None),
    ("impact", sa.JSON(), False, "{}"),
    ("verdict", sa.JSON(), False, "{}"),
    ("mitre", sa.JSON(), False, "[]"),
    ("first_completed_at", sa.DateTime(), True, None),
    ("engine_manifest", sa.JSON(), True, None),
)


def upgrade() -> None:
    # The portal's side of the seam. Created FIRST, so the copy below has
    # somewhere to put the associations before their columns are dropped.
    op.create_table(
        "sandbox_job_links",
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("loop_run_id", sa.Integer(), nullable=True),
        sa.Column("submitted_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["job_id"], ["sandbox_jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["loop_run_id"], ["loop_runs.id"]),
        sa.ForeignKeyConstraint(["submitted_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("job_id"),
    )
    with op.batch_alter_table("sandbox_job_links", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_sandbox_job_links_loop_run_id"), ["loop_run_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_sandbox_job_links_submitted_by_user_id"),
            ["submitted_by_user_id"],
            unique=False,
        )

    # Carry the existing associations over before the columns holding them go.
    # A job with neither gets no row: the absence is not an error, it is a job
    # the portal has nothing extra to say about.
    op.execute(
        """
        INSERT INTO sandbox_job_links (job_id, loop_run_id, submitted_by_user_id)
        SELECT id, loop_run_id, submitted_by_user_id
        FROM sandbox_jobs
        WHERE loop_run_id IS NOT NULL OR submitted_by_user_id IS NOT NULL
        """
    )

    with op.batch_alter_table("sandbox_jobs", schema=None) as batch_op:
        for name, type_, nullable, default in _ADDED:
            batch_op.add_column(
                sa.Column(name, type_, nullable=nullable, server_default=default)
            )
        batch_op.create_index(
            batch_op.f("ix_sandbox_jobs_tenant_id"), ["tenant_id"], unique=False
        )
        batch_op.drop_index(batch_op.f("ix_sandbox_jobs_loop_run_id"))
        batch_op.drop_column("loop_run_id")
        batch_op.drop_column("submitted_by_user_id")

    # `server_default` was needed to backfill the existing rows; it is not part
    # of the model, so leaving it on would make `alembic check` report drift on
    # every run for ever. `tenant_id` keeps its default deliberately — the model
    # declares one, because a nullable owner is an owner nobody checks.
    with op.batch_alter_table("sandbox_jobs", schema=None) as batch_op:
        for name, _type, _nullable, default in _ADDED:
            if default is not None and name != "tenant_id":
                batch_op.alter_column(name, server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("sandbox_jobs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("loop_run_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("submitted_by_user_id", sa.Integer(), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_sandbox_jobs_loop_run_id"), ["loop_run_id"], unique=False
        )
        batch_op.drop_index(batch_op.f("ix_sandbox_jobs_tenant_id"))
        for name, _type, _nullable, _default in _ADDED:
            batch_op.drop_column(name)

    op.execute(
        """
        UPDATE sandbox_jobs SET
          loop_run_id = (SELECT loop_run_id FROM sandbox_job_links
                         WHERE sandbox_job_links.job_id = sandbox_jobs.id),
          submitted_by_user_id = (SELECT submitted_by_user_id FROM sandbox_job_links
                                  WHERE sandbox_job_links.job_id = sandbox_jobs.id)
        """
    )

    with op.batch_alter_table("sandbox_job_links", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_sandbox_job_links_submitted_by_user_id"))
        batch_op.drop_index(batch_op.f("ix_sandbox_job_links_loop_run_id"))
    op.drop_table("sandbox_job_links")
