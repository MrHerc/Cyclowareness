"""ai_service — ALL Claude calls live here (spec §6.3).

Four responsibilities, each a well-defined function with a strict output
schema. Live-provider output is parsed defensively (code fences stripped,
JSON validated); anything malformed falls back to the deterministic
MockAIProvider so the loop never stalls on a bad completion.
"""
import json
import logging
import re
from typing import Any

from ..config import get_settings
from .providers import AnthropicProvider, MockAIProvider

logger = logging.getLogger("cyclowareness.ai")

_provider = None
_mock = MockAIProvider()


def get_provider():
    global _provider
    if _provider is None:
        settings = get_settings()
        if settings.anthropic_api_key:
            _provider = AnthropicProvider()
            logger.info("AI provider: Anthropic (%s)", settings.ai_model)
        else:
            _provider = _mock
            logger.info("AI provider: MockAIProvider (no ANTHROPIC_API_KEY set)")
    return _provider


def _parse_json(raw: str) -> Any:
    """Parse a JSON-only response defensively: strip code fences and prose."""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in AI response")
    return json.loads(text[start : end + 1])


# --- schema validation --------------------------------------------------------

def _validate_training(data: dict) -> dict:
    for key in ("title", "description", "content", "quiz", "takeaway"):
        if key not in data:
            raise ValueError(f"Training module missing key: {key}")
    if not isinstance(data["content"], list) or not (2 <= len(data["content"]) <= 6):
        raise ValueError("Training content must be 2–6 sections")
    for section in data["content"]:
        if "heading" not in section or "body" not in section:
            raise ValueError("Each content section needs heading and body")
    if not isinstance(data["quiz"], list) or not (3 <= len(data["quiz"]) <= 5):
        raise ValueError("Quiz must have 3–5 questions")
    for q in data["quiz"]:
        if not all(k in q for k in ("question", "options", "correct_index")):
            raise ValueError("Malformed quiz question")
        if len(q["options"]) != 4 or not (0 <= int(q["correct_index"]) <= 3):
            raise ValueError("Each question needs exactly 4 options and a valid correct_index")
        q.setdefault("explanation", "")
    data.setdefault("channel", "email")
    data.setdefault("est_minutes", 3)
    data["est_minutes"] = int(data["est_minutes"])
    return data


def _validate_triage(data: dict) -> dict:
    data.setdefault("summary", "")
    data.setdefault("suspicion_level", "medium")
    data.setdefault("indicators", [])
    data.setdefault("likely_iocs", {"urls": [], "domains": [], "sender_patterns": []})
    data.setdefault("recommended_action", "")
    if data["suspicion_level"] not in ("high", "medium", "low"):
        data["suspicion_level"] = "medium"
    return data


# --- the four responsibilities -------------------------------------------------

async def generate_training(analysis: dict[str, Any]) -> dict[str, Any]:
    """Threat → personalized micro-training module (title, lesson, quiz, takeaway)."""
    provider = get_provider()
    try:
        raw = await provider.complete("training_generation", analysis)
        return _validate_training(_parse_json(raw))
    except Exception:
        if provider is _mock:
            raise
        logger.exception("Live AI training generation failed; falling back to mock")
        raw = await _mock.complete("training_generation", analysis)
        return _validate_training(_parse_json(raw))


async def explain_threat(analysis: dict[str, Any]) -> str:
    """Technical verdict → plain-language explanation for non-technical staff."""
    provider = get_provider()
    try:
        text = (await provider.complete("threat_explanation", analysis)).strip()
        if not text:
            raise ValueError("Empty explanation")
        return text
    except Exception:
        if provider is _mock:
            raise
        logger.exception("Live AI explanation failed; falling back to mock")
        return (await _mock.complete("threat_explanation", analysis)).strip()


async def triage_assist(report: dict[str, Any]) -> dict[str, Any]:
    """Reported email → why it's suspicious + likely IOCs (analyst accelerator)."""
    provider = get_provider()
    try:
        raw = await provider.complete("triage_assist", report)
        return _validate_triage(_parse_json(raw))
    except Exception:
        if provider is _mock:
            raise
        logger.exception("Live AI triage failed; falling back to mock")
        raw = await _mock.complete("triage_assist", report)
        return _validate_triage(_parse_json(raw))


async def executive_briefing(metrics: dict[str, Any]) -> str:
    """Org risk posture → natural-language executive summary."""
    provider = get_provider()
    try:
        text = (await provider.complete("executive_briefing", metrics)).strip()
        if not text:
            raise ValueError("Empty briefing")
        return text
    except Exception:
        if provider is _mock:
            raise
        logger.exception("Live AI briefing failed; falling back to mock")
        return (await _mock.complete("executive_briefing", metrics)).strip()
