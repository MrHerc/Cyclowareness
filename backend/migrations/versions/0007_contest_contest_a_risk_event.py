"""Let the person a risk event is about say it is wrong.

An analyst could already withdraw a bad batch — `risk_engine.revoke_events`, and
`revoked_at` exists so that "a claim was made and later withdrawn" stays a
different fact from "the claim never existed". The route in the other direction
did not exist: the employee these events are ABOUT had no way to ask.

They are the events that put "HIGH RISK" beside a named person on their own
screen. If one is wrong — a shared workstation, a mis-attributed simulation
target — the score stands, the label stays, and the only recourse was knowing an
analyst personally.

Five columns, one index. `contested_at IS NOT NULL AND contest_resolution = ''`
is an open contest: somebody waiting on a human, which is why the timestamp is
indexed and the resolution is not.

The three NOT NULL text columns are added WITH a server default and the default
is then dropped — autogenerate emits them bare, which SQLite accepts on a
populated table and PostgreSQL refuses:

    column "contest_note" of relation "risk_events" contains null values

Keeping the default would be worse than the bug: the schema would then disagree
with the model and `alembic check` would fail on every later run.

Revision ID: 0007_contest
Revises: 0006_dispute
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0007_contest'
down_revision: Union[str, Sequence[str], None] = '0006_dispute'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


#: Empty string means "nobody has said anything yet", which is the correct
#: reading for all three.
_TEXT_COLUMNS: tuple[tuple[str, sa.types.TypeEngine], ...] = (
    ("contest_note", sa.Text()),
    ("contest_resolution", sa.Text()),
    ("contest_resolved_by", sa.String(length=255)),
)

#: Nullable by design. NULL is a real state here — "not contested", "not yet
#: resolved" — and a sentinel date would be the null-is-not-zero mistake.
_TIMESTAMP_COLUMNS: tuple[str, ...] = ("contested_at", "contest_resolved_at")


def upgrade() -> None:
    with op.batch_alter_table("risk_events", schema=None) as batch_op:
        for name in _TIMESTAMP_COLUMNS:
            batch_op.add_column(
                sa.Column(name, sa.DateTime(timezone=True), nullable=True)
            )
        for name, type_ in _TEXT_COLUMNS:
            batch_op.add_column(
                sa.Column(name, type_, nullable=False, server_default="")
            )
        batch_op.create_index(
            batch_op.f("ix_risk_events_contested_at"), ["contested_at"], unique=False
        )

    with op.batch_alter_table("risk_events", schema=None) as batch_op:
        for name, type_ in _TEXT_COLUMNS:
            batch_op.alter_column(name, existing_type=type_, server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("risk_events", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_risk_events_contested_at"))
        for name, _type in reversed(_TEXT_COLUMNS):
            batch_op.drop_column(name)
        for name in reversed(_TIMESTAMP_COLUMNS):
            batch_op.drop_column(name)
