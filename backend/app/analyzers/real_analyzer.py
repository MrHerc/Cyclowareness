"""RealAnalyzer — adapter for a real external sandbox / reputation backend.

Selected via ``SANDBOX_ANALYZER=real`` + ``REAL_ANALYZER_BACKEND``:

* ``virustotal``  — hosted API (URLs & file hashes). Fully implemented below.
                    Needs ``REAL_ANALYZER_API_KEY``.
* ``cape``        — self-hosted CAPEv2 REST API. Adapter interface + flow
                    documented; the detonation call is left as a deployment
                    TODO. Needs ``REAL_ANALYZER_URL``.

The adapter only (1) submits the artifact, (2) polls for the report, and
(3) normalises the backend-specific report into the analyzer contract
(see ``base.py``). The web app itself never executes any sample —
detonation happens inside the external service.

Swapping to this analyzer is pure configuration: the loop only ever sees
the contract shape, so no orchestrator code changes.
"""
import asyncio
import base64
import hashlib
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from ..config import get_settings
from .base import BaseAnalyzer

VT_BASE = "https://www.virustotal.com/api/v3"
URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)

# VirusTotal engine categories → our threat_type, best-effort.
_VT_CATEGORY_HINTS = {
    "phishing": "phishing",
    "malware": "malware",
    "malicious": "malware",
}


class RealAnalyzer(BaseAnalyzer):
    def __init__(self) -> None:
        self.settings = get_settings()
        if not (self.settings.real_analyzer_api_key or self.settings.real_analyzer_url):
            raise RuntimeError(
                "SANDBOX_ANALYZER=real requires REAL_ANALYZER_API_KEY (hosted, e.g. "
                "VirusTotal) or REAL_ANALYZER_URL (self-hosted CAPEv2)."
            )

    async def analyze(
        self, artifact_type: str, artifact_ref: str, artifact_meta: dict[str, Any]
    ) -> dict[str, Any]:
        backend = self.settings.real_analyzer_backend
        if backend == "virustotal":
            return await self._analyze_virustotal(artifact_type, artifact_ref, artifact_meta)
        if backend == "cape":
            return await self._analyze_cape(artifact_type, artifact_ref)
        raise NotImplementedError(f"Unknown real analyzer backend: {backend}")

    # ------------------------------------------------------------------ VirusTotal

    async def _analyze_virustotal(
        self, artifact_type: str, artifact_ref: str, artifact_meta: dict[str, Any]
    ) -> dict[str, Any]:
        """Submit the first URL found in the artifact to VirusTotal, poll the
        analysis to completion, and normalise the verdict + IOCs.

        VirusTotal analyses URLs and file hashes, not raw email bodies, so we
        extract the most actionable URL from the artifact. If none is present,
        we fall back to a hash lookup of the artifact text.
        """
        if not self.settings.real_analyzer_api_key:
            raise RuntimeError("REAL_ANALYZER_API_KEY is required for the VirusTotal backend.")
        headers = {"x-apikey": self.settings.real_analyzer_api_key}

        urls = URL_RE.findall(artifact_ref)
        async with httpx.AsyncClient(timeout=30) as client:
            if urls:
                target = urls[0]
                # 1. Submit the URL for (re)analysis.
                submit = await client.post(f"{VT_BASE}/urls", headers=headers, data={"url": target})
                submit.raise_for_status()
                analysis_id = submit.json()["data"]["id"]

                # 2. Poll the analysis until VT reports it completed.
                stats, results = await self._poll_analysis(client, headers, analysis_id)

                # 3. Fetch the URL object for richer IOCs (final URL, domain).
                url_id = base64.urlsafe_b64encode(target.encode()).decode().strip("=")
                iocs = await self._url_iocs(client, headers, url_id, target, artifact_meta)
                raw = {"engine": "VirusTotal v3 (url)", "target": target, "stats": stats}
            else:
                # No URL — try a file-hash reputation lookup of the artifact text.
                sha256 = hashlib.sha256(artifact_ref.encode()).hexdigest()
                resp = await client.get(f"{VT_BASE}/files/{sha256}", headers=headers)
                if resp.status_code == 404:
                    # "VirusTotal has never seen this" is NOT "this is safe".
                    #
                    # Reporting benign here closed the loop at ANALYZE with
                    # "verdict benign — no training needed", and every artifact
                    # without a link takes this path: SMS lures, chat messages,
                    # and text-only BEC — which is precisely the category no
                    # reputation service can rule on. A real invoice-fraud email
                    # was dismissed without a human ever seeing it.
                    #
                    # Unresolved goes to the analyst, with confidence 0.0 so the
                    # UI shows no strength behind a verdict nothing measured.
                    return {
                        "verdict": "suspicious",
                        "confidence": 0.0,
                        "threat_type": "other",
                        "iocs": {"urls": [], "domains": [], "hashes": [sha256], "sender_patterns": []},
                        "behavior_summary": (
                            "Not analysed: the artifact contains no URL, and its hash is unknown to "
                            "VirusTotal. Reputation services cannot rule on text-only lures — this "
                            "needs an analyst, and has not been cleared."
                        ),
                        "raw_report": {"engine": "VirusTotal v3 (file)", "sha256": sha256, "found": False},
                    }
                resp.raise_for_status()
                attributes = resp.json().get("data", {}).get("attributes", {})
                stats = attributes.get("last_analysis_stats", {})
                results = attributes.get("last_analysis_results", {})
                iocs = {"urls": [], "domains": [], "hashes": [sha256], "sender_patterns": []}
                raw = {"engine": "VirusTotal v3 (file)", "sha256": sha256, "stats": stats}

        return self._normalise_vt(stats, results, iocs, artifact_type, raw)

    async def _poll_analysis(
        self, client: httpx.AsyncClient, headers: dict, analysis_id: str, attempts: int = 8
    ) -> tuple[dict, dict]:
        """Poll until VirusTotal reports the analysis complete.

        Paced at 20s rather than 3s: the free tier allows 4 requests per minute,
        and the submission itself already spent one, so the old loop blew the
        quota within seconds and the resulting 429 raised straight out of
        raise_for_status and failed the whole run. A 429 is now honoured rather
        than treated as a fatal error.
        """
        delay = 20.0
        for _ in range(attempts):
            resp = await client.get(f"{VT_BASE}/analyses/{analysis_id}", headers=headers)
            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After")
                await asyncio.sleep(float(retry_after) if retry_after else delay)
                continue
            resp.raise_for_status()
            attributes = resp.json().get("data", {}).get("attributes", {})
            if attributes.get("status") == "completed":
                return attributes.get("stats", {}), attributes.get("results", {})
            await asyncio.sleep(delay)
        raise TimeoutError("VirusTotal analysis did not complete in time")

    async def _url_iocs(
        self, client: httpx.AsyncClient, headers: dict, url_id: str, target: str, artifact_meta: dict
    ) -> dict[str, Any]:
        domain = urlparse(target).netloc
        iocs = {"urls": [target], "domains": [domain] if domain else [], "hashes": [], "sender_patterns": []}
        sender = artifact_meta.get("sender")
        if sender:
            iocs["sender_patterns"] = [sender]
        try:
            resp = await client.get(f"{VT_BASE}/urls/{url_id}", headers=headers)
            if resp.status_code == 200:
                attributes = resp.json().get("data", {}).get("attributes", {})
                final = attributes.get("last_final_url")
                if final and final not in iocs["urls"]:
                    iocs["urls"].append(final)
                    final_domain = urlparse(final).netloc
                    if final_domain and final_domain not in iocs["domains"]:
                        iocs["domains"].append(final_domain)
        except httpx.HTTPError:
            pass  # IOC enrichment is best-effort
        return iocs

    @staticmethod
    def _normalise_vt(
        stats: dict, results: dict, iocs: dict, artifact_type: str, raw: dict
    ) -> dict[str, Any]:
        """VirusTotal stats + engine results → the analyzer contract."""
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        total = max(1, sum(v for v in stats.values() if isinstance(v, int)))

        if malicious >= 3:
            verdict = "malicious"
        elif malicious + suspicious >= 1:
            verdict = "suspicious"
        else:
            verdict = "benign"

        # Confidence scales with the share of engines that flagged it.
        flagged = malicious + suspicious
        confidence = round(min(0.99, 0.5 + (flagged / total) * 0.49), 2) if verdict != "benign" else round(
            min(0.95, 0.6 + (stats.get("harmless", 0) / total) * 0.35), 2
        )

        # Best-effort threat_type from the most common engine category label.
        threat_type = "other"
        labels: dict[str, int] = {}
        for engine in (results or {}).values():
            result = (engine or {}).get("result") or ""
            for key, mapped in _VT_CATEGORY_HINTS.items():
                if key in result.lower():
                    labels[mapped] = labels.get(mapped, 0) + 1
        if labels:
            threat_type = max(labels, key=labels.get)
        elif artifact_type in ("url", "email"):
            threat_type = "phishing"

        return {
            "verdict": verdict,
            "confidence": confidence,
            "threat_type": threat_type,
            "iocs": iocs,
            "behavior_summary": (
                f"VirusTotal: {malicious} engines flagged this malicious and "
                f"{suspicious} suspicious out of {total} that returned a verdict."
            ),
            "raw_report": {**raw, "mitre_techniques": [], "source": "virustotal"},
        }

    # ------------------------------------------------------------------ CAPEv2

    async def _analyze_cape(self, artifact_type: str, artifact_ref: str) -> dict[str, Any]:
        # TODO(production): implement the CAPEv2 REST flow against REAL_ANALYZER_URL.
        #   submit:  POST {url}/apiv2/tasks/create/file/  (multipart) or .../create/url/
        #   poll:    GET  {url}/apiv2/tasks/status/{task_id}/   until "reported"
        #   report:  GET  {url}/apiv2/tasks/get/report/{task_id}/
        #   normalise: malscore → verdict/confidence; network.hosts + signatures
        #              → iocs; behavior.summary → behavior_summary; full → raw_report.
        # Left as a deployment step: CAPEv2 is self-hosted and detonation-capable,
        # so wiring it is an infrastructure decision, not a loop code change.
        raise NotImplementedError(
            "CAPEv2 adapter requires a self-hosted CAPEv2 instance. Set "
            "REAL_ANALYZER_URL and implement the REST flow marked TODO(production)."
        )
