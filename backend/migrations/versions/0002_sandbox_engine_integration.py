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


#: Columns that are simply added. `tenant_id` keeps a server default because the
#: MODEL declares one — a nullable owner is an owner nobody checks — and a
#: VARCHAR default needs no cast on any dialect.
_ADDED_PLAIN = (
    # (name, type, nullable, server_default)
    ("tenant_id", sa.String(length=64), False, "default"),
    ("submitted_by", sa.String(length=64), True, None),
    ("sample_deleted_at", sa.DateTime(), True, None),
    ("first_completed_at", sa.DateTime(), True, None),
    ("engine_manifest", sa.JSON(), True, None),
)

#: NOT NULL JSON columns, and the value existing rows get.
#:
#: ADDED NULLABLE, BACKFILLED, THEN CONSTRAINED — three steps, not one, because
#: the one-step form is not portable. `ADD COLUMN dynamic JSON DEFAULT '{}' NOT
#: NULL` is what a `server_default` renders to, and PostgreSQL refuses it:
#:
#:     column "dynamic" is of type json but default expression is of type text
#:     HINT: You will need to rewrite or cast the expression.
#:
#: SQLite accepts the same statement happily, so the migration passed every local
#: run and failed on the first PostgreSQL one. A `::json` cast would fix it for
#: PostgreSQL and break SQLite, so the fix is to stop needing a default at all:
#: nothing is left behind for a later revision to drop, and `alembic check` has
#: no phantom server default to report as drift for ever.
#: Python values, not JSON strings — the JSON type serialises them for whichever
#: dialect is running.
_ADDED_JSON: tuple[tuple[str, object], ...] = (
    ("dynamic", {}),
    ("impact", {}),
    ("verdict", {}),
    ("mitre", []),
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
        for name, type_, nullable, default in _ADDED_PLAIN:
            batch_op.add_column(
                sa.Column(name, type_, nullable=nullable, server_default=default)
            )
        # Nullable for now — there is no portable way to give an existing row a
        # JSON value in the same statement. See _ADDED_JSON.
        for name, _value in _ADDED_JSON:
            batch_op.add_column(sa.Column(name, sa.JSON(), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_sandbox_jobs_tenant_id"), ["tenant_id"], unique=False
        )
        batch_op.drop_index(batch_op.f("ix_sandbox_jobs_loop_run_id"))
        batch_op.drop_column("loop_run_id")
        batch_op.drop_column("submitted_by_user_id")

    # Give every existing row a value, then close the column.
    #
    # A plain literal, not a bound parameter and not a typed construct. In
    # ASSIGNMENT context PostgreSQL leaves `'{}'` untyped and coerces it to the
    # column's type, which is exactly what is wanted; it is only in DEFAULT
    # context that it types the literal as text first and refuses. A bound
    # parameter would arrive explicitly typed as text and hit the same refusal,
    # and a typed SQLAlchemy construct cannot render under `alembic --sql` at
    # all ("No literal value renderer is available for literal value").
    #
    # The interpolated values are the two constants above, never input.
    for name, value in _ADDED_JSON:
        op.execute(f"UPDATE sandbox_jobs SET {name} = '{value}' WHERE {name} IS NULL")

    with op.batch_alter_table("sandbox_jobs", schema=None) as batch_op:
        for name, _value in _ADDED_JSON:
            batch_op.alter_column(name, existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("sandbox_jobs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("loop_run_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("submitted_by_user_id", sa.Integer(), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_sandbox_jobs_loop_run_id"), ["loop_run_id"], unique=False
        )
        batch_op.drop_index(batch_op.f("ix_sandbox_jobs_tenant_id"))
        for name, _type, _nullable, _default in _ADDED_PLAIN:
            batch_op.drop_column(name)
        for name, _value in _ADDED_JSON:
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
