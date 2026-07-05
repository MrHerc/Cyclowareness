"""Sandbox analyzers — the pluggable contract (spec §6.2)."""
import pytest

from app.analyzers import get_analyzer
from app.analyzers.mock_analyzer import MockAnalyzer
from app.analyzers.real_analyzer import RealAnalyzer

CONTRACT_KEYS = {"verdict", "confidence", "threat_type", "iocs", "behavior_summary", "raw_report"}
IOC_KEYS = {"urls", "domains", "hashes", "sender_patterns"}


async def _analyze(artifact_type, ref, meta=None):
    return await MockAnalyzer().analyze(artifact_type, ref, meta or {})


async def test_mock_contract_shape():
    result = await _analyze("email", "verify your password now http://evil.xyz/login urgent")
    assert set(result) == CONTRACT_KEYS
    assert set(result["iocs"]) == IOC_KEYS
    assert 0.0 <= result["confidence"] <= 1.0


async def test_mock_flags_phishing_malicious():
    ref = "URGENT: verify your account password immediately: https://secure-login.xyz/verify or be suspended"
    result = await _analyze("email", ref, {"sender": "billing@secure-login.xyz"})
    assert result["verdict"] in ("malicious", "suspicious")
    assert result["threat_type"] == "phishing"
    assert "secure-login.xyz" in result["iocs"]["domains"]


async def test_mock_benign_for_innocuous():
    result = await _analyze("email", "Team lunch newsletter and weekly digest, see meeting notes")
    assert result["verdict"] == "benign"


async def test_mock_is_deterministic():
    ref = "click here http://phish.top/go to reset your password now"
    a = await _analyze("email", ref)
    b = await _analyze("email", ref)
    assert a["verdict"] == b["verdict"]
    assert a["confidence"] == b["confidence"]


async def test_mock_channel_maps_threat_type():
    sms = await _analyze("sms", "your parcel is held, pay fee http://fee.link now")
    assert sms["threat_type"] == "smishing"
    qr = await _analyze("qr", "scan to register http://portal.site/x")
    assert qr["threat_type"] == "quishing"


def test_factory_returns_mock_by_default():
    assert isinstance(get_analyzer(), MockAnalyzer)


def test_real_normaliser_maps_verdicts():
    iocs = {"urls": [], "domains": [], "hashes": [], "sender_patterns": []}
    mal = RealAnalyzer._normalise_vt({"malicious": 8, "suspicious": 1, "harmless": 40}, {}, iocs, "url", {})
    assert mal["verdict"] == "malicious"
    assert set(mal) == CONTRACT_KEYS
    benign = RealAnalyzer._normalise_vt({"malicious": 0, "suspicious": 0, "harmless": 60}, {}, iocs, "url", {})
    assert benign["verdict"] == "benign"


def test_real_requires_credentials(monkeypatch):
    from app import config

    settings = config.get_settings()
    monkeypatch.setattr(settings, "real_analyzer_api_key", "")
    monkeypatch.setattr(settings, "real_analyzer_url", "")
    with pytest.raises(RuntimeError):
        RealAnalyzer()
