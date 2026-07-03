"""The analyzer contract (spec §6.2).

Both implementations return exactly this shape::

    {
      "verdict": "malicious | suspicious | benign",
      "confidence": 0.0–1.0,
      "threat_type": "phishing | malware | smishing | quishing | bec | other",
      "iocs": {"urls": [], "domains": [], "hashes": [], "sender_patterns": []},
      "behavior_summary": "short text",
      "raw_report": { ... analyzer-specific ... }
    }

The analyzer is swappable via ``SANDBOX_ANALYZER`` without touching loop code.
IMPORTANT: no live malware is ever detonated inside this web application —
real detonation happens in an external sandbox behind ``RealAnalyzer``.
"""
from abc import ABC, abstractmethod
from typing import Any


class BaseAnalyzer(ABC):
    @abstractmethod
    async def analyze(
        self, artifact_type: str, artifact_ref: str, artifact_meta: dict[str, Any]
    ) -> dict[str, Any]:
        """Analyze an artifact and return the contract dict above."""
