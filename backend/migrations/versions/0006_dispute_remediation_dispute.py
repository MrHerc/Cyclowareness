"""Give the learner the right of appeal the disclosure already promised.

`learner_disclosure` has told every person, verbatim and stored on their own
row, "if you think this was assigned in error, use Dispute — that goes to a
person, not to a system." Until this revision there was no Dispute: no column,
no endpoint, no button. The product promised an appeal it could not hear.

Five columns, one index. `disputed_at IS NOT NULL AND dispute_resolution = ''`
is an open dispute — a person waiting on a human — which is why the timestamp
is indexed and the resolution is not.

NOTE ON THE THREE NOT NULL COLUMNS. Autogenerate emits them as plain
`add_column(..., nullable=False)` with no default, which succeeds on SQLite and
fails on PostgreSQL the moment `remediation_plans` has a single row:

    column "dispute_note" of relation "remediation_plans" contains null values

So each is added WITH a server default, then the default is dropped. Keeping the
default would be worse than the bug it fixes: the schema would then disagree
with the model, and `alembic check` would fail on every subsequent run.

Revision ID: 0006_dispute
Revises: 0005_snapshot_source
Create Date: 2026-08-03 10:07:34.010963
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006_dispute'
down_revision: Union[str, Sequence[str], None] = '0005_snapshot_source'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


#: (column, type) for the three that must never be null. Empty string means
#: "nobody has said anything yet", which is the correct reading for all three.
_TEXT_COLUMNS: tuple[tuple[str, sa.types.TypeEngine], ...] = (
    ("dispute_note", sa.Text()),
    ("dispute_resolution", sa.Text()),
    ("dispute_resolved_by", sa.String(length=255)),
)

#: Nullable by design. NULL here is a real state — "not disputed", "not yet
#: resolved" — and collapsing it onto a sentinel date would be the same
#: null-is-not-zero mistake the metric snapshots exist to avoid.
_TIMESTAMP_COLUMNS: tuple[str, ...] = ("disputed_at", "dispute_resolved_at")


def upgrade() -> None:
    with op.batch_alter_table("remediation_plans", schema=None) as batch_op:
        for name in _TIMESTAMP_COLUMNS:
            batch_op.add_column(
                sa.Column(name, sa.DateTime(timezone=True), nullable=True)
            )
        for name, type_ in _TEXT_COLUMNS:
            batch_op.add_column(
                sa.Column(name, type_, nullable=False, server_default="")
            )
        batch_op.create_index(
            batch_op.f("ix_remediation_plans_disputed_at"),
            ["disputed_at"],
            unique=False,
        )

    # Drop the defaults so the schema matches the model and `alembic check`
    # stays clean. The columns keep NOT NULL; only the DEFAULT goes.
    with op.batch_alter_table("remediation_plans", schema=None) as batch_op:
        for name, type_ in _TEXT_COLUMNS:
            batch_op.alter_column(name, existing_type=type_, server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("remediation_plans", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_remediation_plans_disputed_at"))
        for name, _type in reversed(_TEXT_COLUMNS):
            batch_op.drop_column(name)
        for name in reversed(_TIMESTAMP_COLUMNS):
            batch_op.drop_column(name)
