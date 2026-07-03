"""MockAnalyzer — default for dev/demo (spec §6.2).

Produces realistic, structured, deterministic-ish sandbox verdicts by
actually inspecting the submitted artifact (keyword signals, extracted
URLs/domains/senders), so the same input always yields the same output and
different inputs yield sensibly different reports. The full loop is
demonstrable end-to-end with this analyzer alone — no real malware anywhere.
"""
import hashlib
import re
from typing import Any

from .base import BaseAnalyzer

URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)
DOMAIN_RE = re.compile(r"\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|az|ru|cn|xyz|top|info|biz|online|site|link|club)\b", re.IGNORECASE)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")

PHISHING_SIGNALS = [
    "verify your account", "password", "суspended", "suspended", "urgent",
    "click here", "confirm your identity", "unusual activity", "expire",
    "login", "credential", "reset", "security alert", "act now", "immediately",
]
BEC_SIGNALS = [
    "wire transfer", "bank details", "payment", "invoice", "iban",
    "change of account", "ceo", "cfo", "confidential deal", "urgent transfer",
    "vendor", "beneficiary",
]
MALWARE_SIGNALS = [
    ".exe", ".scr", ".js", ".vbs", ".bat", "macro", "enable content",
    "attachment", ".zip", ".rar", ".iso", ".docm", ".xlsm", "install", "update.exe",
]
BENIGN_SIGNALS = [
    "newsletter", "meeting notes", "lunch", "weekly digest", "out of office",
    "team update", "happy birthday",
]

KNOWN_BAD_TLDS = (".xyz", ".top", ".club", ".link", ".online", ".site")
LOOKALIKE_HINTS = ("secure-", "-login", "account-", "verify-", "0", "1", "-support", "portal-")

MITRE_BY_TYPE = {
    "phishing": ["T1566.002 Spearphishing Link", "T1204.001 User Execution: Malicious Link", "T1056 Input Capture"],
    "bec": ["T1566.003 Spearphishing via Service", "T1534 Internal Spearphishing", "T1657 Financial Theft"],
    "malware": ["T1566.001 Spearphishing Attachment", "T1204.002 Malicious File", "T1059 Command and Scripting Interpreter", "T1547 Boot Autostart Execution"],
    "smishing": ["T1660 Phishing (Mobile)", "T1204.001 User Execution: Malicious Link"],
    "quishing": ["T1566.002 Spearphishing Link (QR)", "T1204.001 User Execution: Malicious Link"],
    "other": ["T1598 Phishing for Information"],
}


class MockAnalyzer(BaseAnalyzer):
    async def analyze(
        self, artifact_type: str, artifact_ref: str, artifact_meta: dict[str, Any]
    ) -> dict[str, Any]:
        text = f"{artifact_meta.get('subject', '')} {artifact_meta.get('sender', '')} {artifact_ref}".lower()
        digest = hashlib.sha256(text.encode()).hexdigest()

        urls = URL_RE.findall(artifact_ref)[:8]
        domains = sorted({d.lower() for d in DOMAIN_RE.findall(artifact_ref)} - {"company.az"})[:8]
        senders = sorted(set(EMAIL_RE.findall(f"{artifact_meta.get('sender', '')} {artifact_ref}")))[:4]

        phish_hits = [s for s in PHISHING_SIGNALS if s in text]
        bec_hits = [s for s in BEC_SIGNALS if s in text]
        malware_hits = [s for s in MALWARE_SIGNALS if s in text]
        benign_hits = [s for s in BENIGN_SIGNALS if s in text]
        bad_domains = [
            d for d in domains
            if d.endswith(KNOWN_BAD_TLDS) or any(h in d for h in LOOKALIKE_HINTS)
        ]

        # --- threat type ---
        if artifact_type == "sms":
            threat_type = "smishing"
        elif artifact_type == "qr":
            threat_type = "quishing"
        elif artifact_type == "file" or len(malware_hits) >= 2:
            threat_type = "malware"
        elif len(bec_hits) >= 2:
            threat_type = "bec"
        elif phish_hits or urls:
            threat_type = "phishing"
        else:
            threat_type = "other"

        # --- verdict from weighted signal count ---
        signal_score = (
            len(phish_hits) + 2 * len(bec_hits) + 2 * len(malware_hits)
            + 3 * len(bad_domains) + (1 if urls else 0) - 2 * len(benign_hits)
        )
        if signal_score >= 5:
            verdict = "malicious"
        elif signal_score >= 2:
            verdict = "suspicious"
        else:
            verdict = "benign"
            threat_type = "other"

        # Deterministic confidence jitter from the content hash
        jitter = int(digest[:4], 16) / 0xFFFF * 0.08
        base_conf = {"malicious": 0.90, "suspicious": 0.68, "benign": 0.85}[verdict]
        confidence = round(min(0.99, base_conf + jitter), 2)

        fake_hash = digest[:64]
        iocs = {
            "urls": urls,
            "domains": domains,
            "hashes": [fake_hash] if artifact_type == "file" or threat_type == "malware" else [],
            "sender_patterns": senders,
        }

        behavior_summary = self._behavior_summary(verdict, threat_type, urls, domains, bad_domains, malware_hits)
        raw_report = self._raw_report(
            digest, artifact_type, threat_type, verdict, urls, domains, bad_domains,
            phish_hits + bec_hits + malware_hits,
        )

        return {
            "verdict": verdict,
            "confidence": confidence,
            "threat_type": threat_type,
            "iocs": iocs,
            "behavior_summary": behavior_summary,
            "raw_report": raw_report,
        }

    @staticmethod
    def _behavior_summary(verdict, threat_type, urls, domains, bad_domains, malware_hits) -> str:
        if verdict == "benign":
            return "No malicious behaviour observed. No credential harvesting, no dropped files, no C2 traffic."
        parts = []
        if threat_type in ("phishing", "smishing", "quishing"):
            parts.append("Lure impersonates a trusted service and pressures the user to act fast.")
            if urls:
                parts.append(f"Embedded link redirects through {len(urls)} hop(s) to a credential-harvesting page.")
            if bad_domains:
                parts.append(f"Lookalike domain(s) detected: {', '.join(bad_domains[:3])}.")
        if threat_type == "bec":
            parts.append("Message imitates an executive/vendor and requests a payment or bank-detail change; no payload — pure social engineering.")
        if threat_type == "malware":
            parts.append("Attachment spawns a scripted dropper, establishes persistence via registry run-key and beacons to a C2 host.")
            if malware_hits:
                parts.append(f"Trigger artefacts: {', '.join(sorted(set(malware_hits))[:4])}.")
        if domains and not bad_domains:
            parts.append(f"Network contact with: {', '.join(domains[:3])}.")
        return " ".join(parts) or "Suspicious indicators present; treat with caution."

    @staticmethod
    def _raw_report(digest, artifact_type, threat_type, verdict, urls, domains, bad_domains, signals) -> dict:
        sandbox_score = {"malicious": 9.2, "suspicious": 6.1, "benign": 0.8}[verdict]
        report = {
            "engine": "Cyclowareness MockSandbox v2.1",
            "sample_sha256": digest[:64],
            "sandbox_score": sandbox_score,
            "artifact_type": artifact_type,
            "signals_matched": sorted(set(signals))[:10],
            "mitre_techniques": MITRE_BY_TYPE.get(threat_type, MITRE_BY_TYPE["other"]),
            "network": [
                {"host": d, "protocol": "https", "action": "blocked" if d in bad_domains else "observed"}
                for d in domains[:6]
            ],
            "http_requests": [{"url": u, "method": "GET", "status": 302} for u in urls[:5]],
        }
        if threat_type == "malware":
            report["process_tree"] = [
                {"pid": 1204, "name": "outlook.exe", "children": [
                    {"pid": 3410, "name": "winword.exe", "children": [
                        {"pid": 5522, "name": "cmd.exe", "cmdline": "cmd /c powershell -enc ..."},
                        {"pid": 5610, "name": "powershell.exe", "cmdline": "IEX(New-Object Net.WebClient)..."},
                    ]},
                ]},
            ]
            report["persistence"] = ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\UpdateSvc"]
        return report
