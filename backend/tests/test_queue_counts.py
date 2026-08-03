"""Counts that must not saturate at the size of the list beside them.

Every one of these numbers sits next to a truncated display list, and each was
once derived from that list with `len()`. The failure mode is quiet and
expensive: an estate with 35 runs waiting at the gate reports 20, the analyst
works twenty and believes the gate is clear, and fifteen people stay untrained
behind a number that could not go higher.

The dashboard already had the fix for `loops_closed` — with a comment
explaining exactly this — while `active_runs` and `awaiting_approval` beside it
still counted the capped list. So the rule is asserted here rather than left to
be re-learned per field: **the count is over the table, the list is a page.**
"""
from __future__ import annotations

import pytest

from app.models import LoopRun, LoopStatus, Threat

#: The display list is capped at 20; the approvals page at 25. Exceed both, so
#: a count derived from either cap fails rather than coincidentally passing.
OVER_BOTH_CAPS = 28


@pytest.fixture
def many_runs_awaiting_approval(db):
    """More runs waiting at the gate than either list will ever return."""
    threat = db.query(Threat).first()
    assert threat is not None, "the seed should provide at least one threat"
    made = []
    for _ in range(OVER_BOTH_CAPS):
        run = LoopRun(
            trigger_threat_id=threat.id,
            status=LoopStatus.AWAITING_APPROVAL,
            current_stage=4,
        )
        db.add(run)
        made.append(run)
    db.commit()
    yield len(made)
    for run in made:
        db.delete(run)
    db.commit()


def test_the_dashboard_counts_every_waiting_run_not_just_the_page(
    client, analyst_headers, db, many_runs_awaiting_approval
):
    body = client.get("/api/dashboard/analyst", headers=analyst_headers).json()
    counts = body["counts"]

    assert counts["awaiting_approval"] >= many_runs_awaiting_approval, (
        f"awaiting_approval reported {counts['awaiting_approval']} with at least "
        f"{many_runs_awaiting_approval} runs at the gate — it is being counted "
        f"from the truncated display list"
    )
    assert counts["active_runs"] >= many_runs_awaiting_approval, (
        f"active_runs reported {counts['active_runs']} — saturated at the cap"
    )
    # And the display list IS still capped: the point is that the two disagree
    # on purpose, not that the cap was removed.
    assert len(body["active_runs"]) <= 20


def test_the_approval_queue_reports_a_total_beyond_its_page(
    client, analyst_headers, many_runs_awaiting_approval
):
    """`total` is the SQL count; `truncated` says the page did not hold it all.

    Without both, the command centre's tab label has nothing honest to show and
    falls back to the page size.
    """
    page = client.get("/api/approvals?limit=10", headers=analyst_headers).json()
    assert len(page["items"]) <= 10
    assert page["total"] >= many_runs_awaiting_approval
    assert page["truncated"] is True


def test_an_untruncated_page_says_so(client, analyst_headers):
    """The flag has to be able to be False, or the warning is permanent noise."""
    # 100 is the server's own MAX_LIMIT — asking beyond it is a 422, not a
    # bigger page, so the ceiling is what proves the flag can be False.
    response = client.get("/api/approvals?limit=100", headers=analyst_headers)
    assert response.status_code == 200, response.text
    page = response.json()
    assert page["total"] <= 100, "seed grew past the page size; raise the fixture instead"
    assert page["truncated"] is False
