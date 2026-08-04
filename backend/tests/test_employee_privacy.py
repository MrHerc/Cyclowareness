"""What an employee's own dashboard may say about other people.

The product's position, stated everywhere else: manager visibility on a
remediation plan defaults OFF, because a plan is evidence that a named person
failed a security test. The same fact does not become shareable because it is
expressed as points.

The individual leaderboard broke that. Eight colleagues by name with their
points, on every employee's own dashboard response — derived from their
training scores and their behaviour under simulated attack. The portal never
drew it, which is what made it feel harmless; it was on the wire, so the network
tab was the whole roster.
"""
from __future__ import annotations


def test_the_dashboard_names_no_other_employee(client, employee_headers, db):
    """The strong form: no other person's name may appear anywhere in it.

    Asserted against the serialised response rather than against one key, so a
    future field that reintroduces the leak fails here too.
    """
    import json

    from app.models import Employee

    me = client.get("/api/auth/me", headers=employee_headers).json()
    body = client.get("/api/dashboard/employee", headers=employee_headers).json()
    blob = json.dumps(body)

    others = [
        e.name
        for e in db.query(Employee).all()
        if e.id != me["employee_id"] and e.name
    ]
    assert others, "no other employees to check against — the test would be vacuous"

    leaked = sorted({name for name in others if name in blob})
    assert not leaked, f"the employee's own dashboard names other people: {leaked}"


def test_the_employee_still_learns_where_they_stand(client, employee_headers):
    """Rank is kept. Knowing where you stand is self-knowledge; knowing where a
    named colleague stands is somebody else's business."""
    g = client.get("/api/dashboard/employee", headers=employee_headers).json()["gamification"]
    assert "leaderboard" not in g, "the named list is back"
    assert "ranked_of" in g
    assert g["ranked_of"] >= 1
    if g["rank"] is not None:
        assert 1 <= g["rank"] <= g["ranked_of"]


def test_team_standings_are_departments_not_people(client, employee_headers):
    """Department aggregates are fine — no individual is identifiable in one."""
    g = client.get("/api/dashboard/employee", headers=employee_headers).json()["gamification"]
    for row in g["team_leaderboard"]:
        assert set(row) <= {"department_id", "name", "avg_risk", "points", "is_mine"}
        assert "employee_id" not in row


# --- a starting position is not something they did ----------------------------
def test_the_breakdown_says_which_factors_are_behaviour_and_which_are_not(db):
    """The employee portal heads a column "What is raising it" whose empty state
    reads "No BEHAVIOUR has pushed your score up".

    `baseline_assessment` — the figure carried over from before the platform,
    written by the seed so a demo score reconciles with its own audit trail —
    was rendered inside it. On the demo roster it is present for all 26 people,
    reaches 43 points of a 0-100 score, and is the largest single entry for
    several of them, so most of the roster's leading "reason" for their standing
    was a starting position mislabelled as something they had done — on the one
    screen where a named person is told why they are considered a risk.

    Classified on the server so every consumer groups it identically.
    """
    from app.core.risk_engine import STARTING_POINT_FACTORS, risk_breakdown
    from app.models import Employee

    person = db.query(Employee).first()
    breakdown = risk_breakdown(db, person)
    assert breakdown, "no breakdown at all — the assertions below would be vacuous"

    for factor in breakdown:
        assert "kind" in factor, f"{factor['factor']} is unclassified"
        expected = "starting_point" if factor["factor"] in STARTING_POINT_FACTORS else "behaviour"
        assert factor["kind"] == expected, factor

    kinds = {f["factor"]: f["kind"] for f in breakdown}
    assert kinds["baseline_role_sensitivity"] == "starting_point"


def test_the_carried_over_figure_is_not_labelled_like_a_test_the_person_sat(db):
    """`type.replace("_", " ").capitalize()` produced "Baseline assessment",
    which reads as something they were put through and failed."""
    from app.core.risk_engine import risk_breakdown
    from app.models import Employee, RiskEvent

    person = db.query(Employee).first()
    mine = RiskEvent(
        employee_id=person.id,
        type="baseline_assessment",
        delta=9.0,
        reason="Pre-platform risk assessment, carried over at onboarding",
    )
    db.add(mine)
    db.commit()
    try:
        row = next(
            f for f in risk_breakdown(db, person) if f["factor"] == "baseline_assessment"
        )
        assert row["kind"] == "starting_point"
        assert "assessment" not in row["label"].lower(), (
            f"labelled {row['label']!r}, which reads as a test the person sat"
        )
        assert "carried over" in row["label"].lower()
    finally:
        # BY ID, NOT BY (employee, type). Deleting every `baseline_assessment`
        # row for this person removed the SEED's carried-over figure too, and
        # `test_every_seeded_score_is_derivable_from_its_own_audit_trail` then
        # failed forty points short two files later. The `db` fixture does not
        # reset between tests; only what this test created may be removed.
        db.query(RiskEvent).filter(RiskEvent.id == mine.id).delete()
        db.commit()
