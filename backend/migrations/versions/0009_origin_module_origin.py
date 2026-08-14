"""Where a training module CAME FROM, so approval can finish the job.

The pipeline this serves: an IR finding lands, the catalogue has nothing
approved for it, so a module is GENERATED — and it must still pass the human
approval gate, because nothing in this product reaches an employee without a
named person deciding. The problem is what happens after the click: the
approver approves a module, but the finding that caused it, and the employees
it was generated FOR, were nowhere on the record. The assignment step died at
the gate.

`origin` carries that context across the gate as one nullable JSON column:

    {"kind": "policy_finding" | "incident_risk", "id": 7, "employee_ids": [3, 5]}

NULL means what it always meant — a module authored by hand or converted from
a threat, with no downstream obligation. The approval router reads `origin`
AFTER a human approves and only then creates the assignments and moves the
finding, so the gate stays exactly as strong as it was: generation never
assigns, approval does.

Nullable with no default, added to a populated table — the shape that works on
both engines (see 0002's lesson: NOT NULL without a default is the PostgreSQL
rejection this chain has already paid for).

Revision ID: 0009_origin
Revises: 0008_resources
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_origin"
down_revision = "0008_resources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("training_modules", sa.Column("origin", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("training_modules", "origin")
