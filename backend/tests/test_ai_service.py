"""AI engine — strict schemas & graceful parsing (spec §6.3)."""
import pytest

from app.ai import ai_service

ANALYSIS = {
    "verdict": "malicious",
    "confidence": 0.93,
    "threat_type": "phishing",
    "iocs": {"urls": ["http://evil.xyz"], "domains": ["evil.xyz"], "hashes": [], "sender_patterns": ["a@evil.xyz"]},
    "behavior_summary": "credential harvest",
    "artifact_type": "email",
    "title": "fake login",
}


async def test_generate_training_returns_valid_module():
    module, source = await ai_service.generate_training(ANALYSIS)
    for key in ("title", "description", "content", "quiz", "takeaway"):
        assert key in module
    assert 2 <= len(module["content"]) <= 6
    assert 3 <= len(module["quiz"]) <= 5
    for q in module["quiz"]:
        assert len(q["options"]) == 4
        assert 0 <= q["correct_index"] <= 3
    # Provenance must be reported honestly — no ANTHROPIC_API_KEY is configured
    # in the suite, so this content genuinely came from the offline generator.
    assert source == ai_service.SOURCE_MOCK


async def test_training_themes_to_threat_type():
    bec = dict(ANALYSIS, threat_type="bec")
    module, _ = await ai_service.generate_training(bec)
    assert module["channel"] in ("email", "sms", "qr", "chat", "web")


async def test_explain_threat_plain_language():
    text = await ai_service.explain_threat(ANALYSIS)
    assert isinstance(text, str) and len(text) > 20


async def test_triage_assist_extracts_indicators():
    report = {
        "artifact_type": "email",
        "artifact_ref": "verify your password at http://phish.top urgent, account suspended",
        "artifact_meta": {"sender": "x@phish.top"},
        "note": "",
    }
    triage = await ai_service.triage_assist(report)
    assert triage["suspicion_level"] in ("high", "medium", "low")
    assert isinstance(triage["indicators"], list)


def test_parse_json_strips_code_fences():
    assert ai_service._parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert ai_service._parse_json('Here you go: {"b": 2} thanks') == {"b": 2}


def test_parse_json_rejects_non_json():
    with pytest.raises(ValueError):
        ai_service._parse_json("no json here")


def test_validate_training_rejects_bad_quiz():
    bad = {
        "title": "t", "description": "d", "takeaway": "k",
        "content": [{"heading": "h", "body": "b"}, {"heading": "h2", "body": "b2"}],
        "quiz": [{"question": "q", "options": ["a", "b"], "correct_index": 0}],  # only 1 q, 2 opts
    }
    with pytest.raises(ValueError):
        ai_service._validate_training(bad)
