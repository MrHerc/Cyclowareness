"""RealAnalyzer — documented adapter for a real sandbox backend (spec §6.2).

Supported backends (selected via ``REAL_ANALYZER_BACKEND``):

* ``virustotal``       — hosted API (files & URLs). Needs REAL_ANALYZER_API_KEY.
* ``cape``             — self-hosted CAPEv2 REST API. Needs REAL_ANALYZER_URL.
* ``hybrid_analysis``  — hosted Falcon Sandbox API. Needs REAL_ANALYZER_API_KEY.

The adapter's job is only to (1) submit the artifact, (2) poll for the
report, (3) normalise the backend-specific report into the analyzer
contract (see ``base.py``). The web app never executes samples itself.

The external calls are intentionally left behind this feature flag as
clearly marked TODOs — enabling them is a deployment decision, not a code
change to the loop (which only ever sees the contract shape).
"""
from typing import Any

import httpx

from ..config import get_settings
from .base import BaseAnalyzer


class RealAnalyzer(BaseAnalyzer):
    def __init__(self) -> None:
        self.settings = get_settings()
        if not (self.settings.real_analyzer_api_key or self.settings.real_analyzer_url):
            raise RuntimeError(
                "SANDBOX_ANALYZER=real requires REAL_ANALYZER_API_KEY (hosted) "
                "or REAL_ANALYZER_URL (self-hosted CAPEv2)."
            )

    async def analyze(
        self, artifact_type: str, artifact_ref: str, artifact_meta: dict[str, Any]
    ) -> dict[str, Any]:
        backend = self.settings.real_analyzer_backend
        if backend == "virustotal":
            return await self._analyze_virustotal(artifact_type, artifact_ref)
        if backend == "cape":
            return await self._analyze_cape(artifact_type, artifact_ref)
        raise NotImplementedError(f"Unknown real analyzer backend: {backend}")

    async def _analyze_virustotal(self, artifact_type: str, artifact_ref: str) -> dict[str, Any]:
        # TODO(production): implement the live VirusTotal calls.
        #   URL scan:  POST https://www.virustotal.com/api/v3/urls  (x-apikey header)
        #   poll:      GET  /api/v3/analyses/{id}  until status == "completed"
        #   normalise: stats.malicious / stats.suspicious → verdict + confidence;
        #              last_analysis_results + relationships → iocs.
        # Example skeleton (kept inert until enabled in production):
        #
        #   async with httpx.AsyncClient() as client:
        #       resp = await client.post(
        #           "https://www.virustotal.com/api/v3/urls",
        #           headers={"x-apikey": self.settings.real_analyzer_api_key},
        #           data={"url": artifact_ref},
        #       )
        #       analysis_id = resp.json()["data"]["id"]
        #       ... poll, then map to the contract ...
        raise NotImplementedError(
            "VirusTotal adapter is stubbed for the demo build. "
            "See TODO(production) in real_analyzer.py."
        )

    async def _analyze_cape(self, artifact_type: str, artifact_ref: str) -> dict[str, Any]:
        # TODO(production): implement the CAPEv2 REST flow.
        #   submit:  POST {REAL_ANALYZER_URL}/apiv2/tasks/create/file/  (multipart)
        #   poll:    GET  {REAL_ANALYZER_URL}/apiv2/tasks/status/{task_id}/
        #   report:  GET  {REAL_ANALYZER_URL}/apiv2/tasks/get/report/{task_id}/
        #   normalise: malscore → verdict/confidence; network+signatures → iocs;
        #              behavior.summary → behavior_summary; full report → raw_report.
        raise NotImplementedError(
            "CAPEv2 adapter is stubbed for the demo build. "
            "See TODO(production) in real_analyzer.py."
        )

    @staticmethod
    def _normalise_vt(vt_json: dict) -> dict[str, Any]:
        """Reference normaliser: VirusTotal analysis JSON → analyzer contract."""
        stats = vt_json.get("data", {}).get("attributes", {}).get("stats", {})
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        total = max(1, sum(stats.values()))
        if malicious >= 3:
            verdict = "malicious"
        elif malicious + suspicious >= 1:
            verdict = "suspicious"
        else:
            verdict = "benign"
        return {
            "verdict": verdict,
            "confidence": round(min(0.99, (malicious + suspicious) / total + 0.5), 2),
            "threat_type": "phishing",
            "iocs": {"urls": [], "domains": [], "hashes": [], "sender_patterns": []},
            "behavior_summary": f"VirusTotal: {malicious} engines flagged malicious, {suspicious} suspicious.",
            "raw_report": vt_json,
        }
