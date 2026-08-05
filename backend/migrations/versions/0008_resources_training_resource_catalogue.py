"""A catalogue of external learning resources, none of which ships unverified.

Training modules taught with prose alone. The ask was for real material — video
and course links matched to the attack a person actually fell for — pulled from
the platforms people already use.

The load-bearing column is `verified_at`, and it is NULLABLE ON PURPOSE. A row
with NULL there has never been dereferenced by anything, and every read path
filters it out. A link that 404s, that was taken down, or that a model invented
outright are indistinguishable to a learner: all three send them somewhere
useless at the one moment they were willing to learn. So the product does not
guess. Something fetched the URL and wrote down what came back, or the resource
does not exist as far as the UI is concerned.

`http_status` and `verify_error` keep the failure rather than discarding it, so
a resource that goes dark is *unreachable* in the catalogue rather than absent
from it — an analyst can see the shape of the gap.

The two indexes are the two questions asked of this table: "what have we got for
phishing" (`topic`) and "what is safe to show" (`verified_at`).

No `server_default` anywhere, deliberately. The trap this project has paid for
twice is ADDING a NOT NULL column to a POPULATED table — PostgreSQL rejects it
without a default. A freshly created table has no rows to violate the
constraint, so the defaults would be scaffolding for a problem that cannot
occur here, and SQLite cannot drop them afterwards anyway.

Revision ID: 0008_resources
Revises: 0007_contest
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_resources"
down_revision = "0007_contest"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_resources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("author", sa.String(length=200), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=12), nullable=False),
        sa.Column("topic", sa.String(length=40), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        # NULL means "never checked". Nothing reaches a learner in that state.
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("verify_error", sa.String(length=300), nullable=False),
        sa.Column("added_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_training_resources_topic", "training_resources", ["topic"])
    op.create_index("ix_training_resources_provider", "training_resources", ["provider"])
    op.create_index("ix_training_resources_external_id", "training_resources", ["external_id"])
    op.create_index("ix_training_resources_verified_at", "training_resources", ["verified_at"])


def downgrade() -> None:
    op.drop_index("ix_training_resources_verified_at", table_name="training_resources")
    op.drop_index("ix_training_resources_external_id", table_name="training_resources")
    op.drop_index("ix_training_resources_provider", table_name="training_resources")
    op.drop_index("ix_training_resources_topic", table_name="training_resources")
    op.drop_table("training_resources")
