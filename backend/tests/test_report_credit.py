"""The report credit cap, and telling the reporter about it."""
from __future__ import annotations


def test_the_first_three_reports_in_a_day_move_the_score(client, employee_headers):
    for n in range(3):
        r = client.post(
            "/api/reports",
            headers=employee_headers,
            json={"artifact_type": "email", "artifact_ref": f"suspicious message {n}",
                  "artifact_meta": {}, "note": ""},
        )
        assert r.status_code in (200, 201), r.text
        assert r.json()["risk_credited"] is True
        assert r.json()["risk_credit_note"] == ""


def test_the_fourth_report_says_it_did_not_move_the_score(client, employee_headers):
    """The person doing the behaviour the product most wants must not be told a
    falsehood at the moment they do it most.

    Credit is capped so the score cannot be farmed. That is reasonable; hiding
    it is not. Before this, the fourth report of a day produced the same green
    "the report itself lowered your risk score" as the first, with no risk event
    written and the score unmoved.
    """
    for n in range(4):
        r = client.post(
            "/api/reports",
            headers=employee_headers,
            json={"artifact_type": "email", "artifact_ref": f"another one {n}",
                  "artifact_meta": {}, "note": ""},
        )
        assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["risk_credited"] is False
    assert "capped" in body["risk_credit_note"]
    # And it still says the report was worth sending.
    assert "still reaches the security team" in body["risk_credit_note"]
