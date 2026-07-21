"""The executive briefing must survive unmeasured metrics.

Regression: metrics rates became nullable, but the briefing did
`current.get("phishing_click_rate", 0) * 100` — and `.get(k, default)` returns
None when the key exists with a None value, so a quiet month crashed the
executive dashboard with a TypeError.
"""
import pytest

from app.ai.providers import MockAIProvider

provider = MockAIProvider()

DEPTS = [
    {"id": 1, "name": "Finance", "avg_risk": 61.0},
    {"id": 2, "name": "Engineering", "avg_risk": 27.0},
]


async def test_briefing_survives_all_metrics_null():
    text = await provider.complete(
        "executive_briefing",
        {
            "current": {
                "phishing_click_rate": None,
                "report_rate": None,
                "avg_risk_score": None,
                "training_completion_rate": None,
            },
            "trend": [],
            "departments": DEPTS,
        },
    )
    assert isinstance(text, str) and len(text) > 40
    assert "None" not in text, "null must never leak into prose"


async def test_briefing_survives_null_rates_with_known_risk():
    text = await provider.complete(
        "executive_briefing",
        {
            "current": {
                "phishing_click_rate": None,
                "report_rate": None,
                "avg_risk_score": 43.3,
                "training_completion_rate": None,
            },
            "trend": [{"avg_risk_score": 50.0}, {"avg_risk_score": 43.3}],
            "departments": DEPTS,
        },
    )
    assert "43" in text
    assert "None" not in text


async def test_briefing_ignores_null_points_when_judging_direction():
    """A gap in the trend must not be read as a datapoint."""
    text = await provider.complete(
        "executive_briefing",
        {
            "current": {"phishing_click_rate": 0.2, "report_rate": 0.5, "avg_risk_score": 40.0},
            "trend": [
                {"avg_risk_score": 60.0},
                {"avg_risk_score": None},
                {"avg_risk_score": 40.0},
            ],
            "departments": DEPTS,
        },
    )
    assert "improving" in text
    assert "None" not in text


async def test_briefing_reports_measured_values():
    text = await provider.complete(
        "executive_briefing",
        {
            "current": {"phishing_click_rate": 0.29, "report_rate": 0.47, "avg_risk_score": 43.3},
            "trend": [{"avg_risk_score": 59.0}, {"avg_risk_score": 43.3}],
            "departments": DEPTS,
        },
    )
    assert "29 percent" in text
    assert "47 percent" in text
    assert "Engineering" in text  # safest
    assert "Finance" in text  # riskiest


async def test_briefing_handles_no_departments():
    text = await provider.complete(
        "executive_briefing",
        {"current": {"avg_risk_score": 40.0}, "trend": [], "departments": []},
    )
    assert isinstance(text, str) and len(text) > 20
    assert "—" not in text, "placeholder dashes must not reach the reader"
