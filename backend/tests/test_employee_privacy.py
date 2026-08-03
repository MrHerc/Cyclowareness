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
