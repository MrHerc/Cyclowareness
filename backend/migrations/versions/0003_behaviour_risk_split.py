"""Split the risk score: behaviour_risk and training_credit.

Revision ID: 0003_behaviour_split
Revises: 0002_sandbox_engine
Create Date: 2026-08-03

Completing assigned training subtracts 10 points from `current_risk_score`
(`training_completed` -4.0 plus `training_comprehension` -6.0). That is the same
number the dashboard charts as proof the training worked. So assigning more
training lowered the score, the line went down, and the product reported
improvement with no behaviour change anywhere.

`behaviour_risk` moves only on what a person did when a threat reached them.
`training_credit` holds engagement. The composite stays, because "this person is
behind on training" is worth seeing — but efficacy is now reported from
`behaviour_risk` alone. See docs/REMEDIATION-ENGINE.md §10.

THE BACKFILL DERIVES BOTH HALVES FROM THE AUDIT TRAIL, it does not guess. Every
score movement already exists as a `risk_events` row with its type, so the split
can be computed exactly for history as well as for new events. A deployment that
had already accumulated events therefore gets a true behaviour score, not one
that starts from today.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_behaviour_split"
down_revision = "0002_sandbox_engine"
branch_labels = None
depends_on = None

#: Kept as a literal rather than imported from `core.risk_engine`. A migration
#: describes the schema as it was on the day it was written; importing the live
#: constant would silently rewrite history the next time someone reclassifies an
#: event type.
_BEHAVIOUR_EVENTS = (
    "simulated_phish_click",
    "simulated_phish_report",
    "real_threat_report",
    "real_threat_exposure",
)


def upgrade() -> None:
    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.add_column(sa.Column("behaviour_risk", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("training_credit", sa.Float(), nullable=True))

    behaviour_list = ", ".join(f"'{e}'" for e in _BEHAVIOUR_EVENTS)

    # baseline + Σ(behaviour deltas), railed to 0-100 exactly as the engine rails
    # the composite. Revoked events are excluded, the same as `recompute_score`.
    #
    # THE CLAMP IS A CASE, NOT `MAX(0, MIN(100, x))`. Two-argument MAX/MIN are
    # scalar in SQLite and AGGREGATES in PostgreSQL, so that form runs locally
    # and fails in production; PostgreSQL's scalar pair is GREATEST/LEAST, which
    # SQLite does not have. CASE is the only spelling both dialects read the
    # same way. Third time this class of difference has bitten this chain —
    # a text default on a json column, an out-of-order foreign key, and now this.
    op.execute(
        f"""
        UPDATE employees SET behaviour_risk = CASE
            WHEN 20.0 + role_sensitivity * 20.0 + COALESCE((
                SELECT SUM(delta) FROM risk_events
                WHERE risk_events.employee_id = employees.id
                  AND risk_events.revoked_at IS NULL
                  AND risk_events.type IN ({behaviour_list})
            ), 0.0) < 0.0 THEN 0.0
            WHEN 20.0 + role_sensitivity * 20.0 + COALESCE((
                SELECT SUM(delta) FROM risk_events
                WHERE risk_events.employee_id = employees.id
                  AND risk_events.revoked_at IS NULL
                  AND risk_events.type IN ({behaviour_list})
            ), 0.0) > 100.0 THEN 100.0
            ELSE 20.0 + role_sensitivity * 20.0 + COALESCE((
                SELECT SUM(delta) FROM risk_events
                WHERE risk_events.employee_id = employees.id
                  AND risk_events.revoked_at IS NULL
                  AND risk_events.type IN ({behaviour_list})
            ), 0.0)
        END
        """
    )
    op.execute(
        f"""
        UPDATE employees SET training_credit = COALESCE((
            SELECT SUM(delta) FROM risk_events
            WHERE risk_events.employee_id = employees.id
              AND risk_events.revoked_at IS NULL
              AND risk_events.type NOT IN ({behaviour_list})
        ), 0.0)
        """
    )

    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.alter_column("behaviour_risk", existing_type=sa.Float(), nullable=False)
        batch_op.alter_column("training_credit", existing_type=sa.Float(), nullable=False)

    # The snapshot line that may carry an efficacy claim. Nullable for the same
    # reason every other rate here is: a day with nothing to measure records no
    # measurement rather than a fabricated zero. History is NOT backfilled —
    # past snapshots genuinely did not measure this, and inventing values for
    # them would be the exact dishonesty this migration exists to remove.
    with op.batch_alter_table("metric_snapshots", schema=None) as batch_op:
        batch_op.add_column(sa.Column("avg_behaviour_risk", sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("metric_snapshots", schema=None) as batch_op:
        batch_op.drop_column("avg_behaviour_risk")
    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.drop_column("training_credit")
        batch_op.drop_column("behaviour_risk")
