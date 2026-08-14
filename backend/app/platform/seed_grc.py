"""Real GRC framework documents, seeded as first-class policies.

The four documents every enterprise conversation starts from — ISO/IEC 27001,
NIST CSF 2.0, NIS2 and PCI DSS 4.0 — present in the library with ACTIVE,
technology-bearing rules so the GRC watcher has real substance to scan intel
against.

Two honesty rules govern this file:

* **The text is OUR summary of each framework, not the framework's text.**
  Standards bodies license their documents; what a control register needs is
  the obligation stated in the organisation's own words, which is exactly what
  these are. `source_filename` names the real document each summary tracks.
* **Rules that name a technology are the watcher's fuel** — each one carries
  `technology` + `version_spec` so a new advisory about that technology
  surfaces as a match. Rules seeded ACTIVE carry a named reviewer, because
  "active" is a human decision by contract everywhere else in this product.

Idempotent by name: a policy that already exists is left alone.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    ExtractionSource,
    ExtractionStatus,
    Policy,
    PolicyRule,
    PolicyStatus,
    PolicyType,
    RuleStatus,
    RuleType,
)

logger = logging.getLogger(__name__)

_REVIEWER = "analyst@caspiandynamics.az"


def _days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


#: (policy kwargs, [rule kwargs]) — content authored for this register.
_DOCUMENTS: list[tuple[dict, list[dict]]] = [
    (
        dict(
            name="ISO/IEC 27001:2022 — Control Register (Annex A)",
            policy_type=PolicyType.BASELINE,
            version="2022",
            owner_name="Kamran Ismayilov",
            owner_email="kamran.ismayilov@caspiandynamics.az",
            source_filename="iso-27001-2022-annex-a-register.pdf",
            notes=(
                "Our working register of the 93 Annex A controls in four themes — "
                "organisational (37), people (8), physical (14), technological (34). "
                "Each rule below restates the obligation in our words; the standard "
                "itself is licensed and not stored here."
            ),
        ),
        [
            dict(
                rule_key="iso27001.a5-15.access-control",
                statement=(
                    "Access to information and assets is granted on business need, "
                    "reviewed quarterly, and revoked on role change (A.5.15–A.5.18)."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="Rules to control physical and logical access to information shall be established.",
                evidence_location="Annex A, 5.15",
            ),
            dict(
                rule_key="iso27001.a8-7.malware",
                statement=(
                    "Protection against malware is implemented and supported by user "
                    "awareness (A.8.7) — every detection feeds an awareness action."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="Protection against malware shall be implemented and supported by appropriate user awareness.",
                evidence_location="Annex A, 8.7",
            ),
            dict(
                rule_key="iso27001.a8-8.vulnerabilities",
                statement=(
                    "Technical vulnerabilities are identified, evaluated and treated "
                    "within defined windows (A.8.8): critical 72h, high 14d."
                ),
                rule_type=RuleType.REQUIRE,
                technology="OpenSSL",
                version_spec=">=3.0.13",
                evidence_quote="Information about technical vulnerabilities shall be obtained, exposure evaluated and appropriate measures taken.",
                evidence_location="Annex A, 8.8",
            ),
            dict(
                rule_key="iso27001.a6-3.awareness",
                statement=(
                    "All personnel receive security awareness education relevant to "
                    "their function, refreshed on material change (A.6.3)."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="Personnel shall receive appropriate information security awareness, education and training.",
                evidence_location="Annex A, 6.3",
            ),
        ],
    ),
    (
        dict(
            name="NIST CSF 2.0 — Organisational Profile",
            policy_type=PolicyType.BASELINE,
            version="2.0",
            owner_name="Aysel Huseynova",
            owner_email="aysel.huseynova@caspiandynamics.az",
            source_filename="nist-csf-2.0-org-profile.pdf",
            notes=(
                "Our current-state profile against the six CSF functions — Govern, "
                "Identify, Protect, Detect, Respond, Recover. The rules below are "
                "the Protect/Detect subcategories we treat as binding."
            ),
        ),
        [
            dict(
                rule_key="csf.pr-aa-03.mfa",
                statement=(
                    "Users, services and hardware are authenticated with "
                    "phishing-resistant multi-factor methods for privileged access (PR.AA-03)."
                ),
                rule_type=RuleType.REQUIRE,
                technology="Microsoft Entra ID",
                version_spec="",
                evidence_quote="Users, services, and hardware are authenticated.",
                evidence_location="PR.AA-03",
            ),
            dict(
                rule_key="csf.pr-ps-05.software",
                statement=(
                    "Installation and execution of unauthorised software is prevented "
                    "(PR.PS-05); the Approved Software Register is the authority."
                ),
                rule_type=RuleType.DENY,
                evidence_quote="Installation and execution of unauthorized software are prevented.",
                evidence_location="PR.PS-05",
            ),
            dict(
                rule_key="csf.de-cm-01.monitoring",
                statement=(
                    "Networks and network services are monitored to find potentially "
                    "adverse events (DE.CM-01), including SMB protocol downgrade."
                ),
                rule_type=RuleType.REQUIRE,
                technology="SMBv1",
                version_spec="forbidden",
                evidence_quote="Networks and network services are monitored to find potentially adverse events.",
                evidence_location="DE.CM-01",
            ),
        ],
    ),
    (
        dict(
            name="NIS2 — Obligations Register (Directive (EU) 2022/2555)",
            policy_type=PolicyType.VENDOR_REQUIREMENT,
            version="2022/2555",
            owner_name="Rashad Mammadov",
            owner_email="rashad.mammadov@caspiandynamics.az",
            source_filename="nis2-obligations-register.pdf",
            notes=(
                "The Article 21 cyber risk-management measures and Article 23 "
                "incident-notification duties, restated as checkable obligations. "
                "The 24h early-warning / 72h notification / 1-month final-report "
                "clock is what the incident-risk module's deadlines mirror."
            ),
        ),
        [
            dict(
                rule_key="nis2.art21-2d.supply-chain",
                statement=(
                    "Supply-chain security is addressed, including security-related "
                    "aspects of relationships with direct suppliers (Art. 21(2)(d))."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="…supply chain security, including security-related aspects concerning the relationships between each entity and its direct suppliers…",
                evidence_location="Article 21(2)(d)",
            ),
            dict(
                rule_key="nis2.art21-2g.hygiene",
                statement=(
                    "Basic cyber hygiene practices and cybersecurity TRAINING are in "
                    "place for all staff (Art. 21(2)(g)) — this platform is that control."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="…basic cyber hygiene practices and cybersecurity training…",
                evidence_location="Article 21(2)(g)",
            ),
            dict(
                rule_key="nis2.art23.notification",
                statement=(
                    "Significant incidents produce an early warning within 24 hours, "
                    "a notification within 72 hours and a final report within one month (Art. 23)."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="…an early warning without undue delay and in any event within 24 hours of becoming aware…",
                evidence_location="Article 23(4)",
            ),
        ],
    ),
    (
        dict(
            name="PCI DSS 4.0 — Cardholder Environment Requirements",
            policy_type=PolicyType.SECURITY_POLICY,
            version="4.0.1",
            owner_name="Leyla Aliyeva",
            owner_email="leyla.aliyeva@caspiandynamics.az",
            source_filename="pci-dss-4.0-requirements-register.pdf",
            notes=(
                "The twelve requirement families, restated for our cardholder data "
                "environment. Requirement 12.6 (security awareness education) is the "
                "one this platform discharges directly."
            ),
        ),
        [
            dict(
                rule_key="pci.req4.tls",
                statement=(
                    "Cardholder data transmitted over open networks is protected with "
                    "strong cryptography; TLS below 1.2 is prohibited (Req. 4)."
                ),
                rule_type=RuleType.DENY,
                technology="TLS",
                version_spec="<1.2 forbidden",
                evidence_quote="Protect cardholder data with strong cryptography during transmission over open, public networks.",
                evidence_location="Requirement 4",
            ),
            dict(
                rule_key="pci.req8.auth",
                statement=(
                    "Users are identified uniquely and access is authenticated; shared "
                    "accounts are prohibited in the CDE (Req. 8)."
                ),
                rule_type=RuleType.DENY,
                evidence_quote="Identify users and authenticate access to system components.",
                evidence_location="Requirement 8",
            ),
            dict(
                rule_key="pci.req12-6.awareness",
                statement=(
                    "A formal security awareness programme educates personnel on the "
                    "security policy at hire and at least annually (Req. 12.6)."
                ),
                rule_type=RuleType.REQUIRE,
                evidence_quote="Security awareness education is an ongoing activity.",
                evidence_location="Requirement 12.6",
            ),
        ],
    ),
]


def seed_grc_documents(db: Session) -> int:
    """Place the framework register. Returns how many policies were created."""
    created = 0
    existing = {name for (name,) in db.execute(select(Policy.name)).all()}
    for policy_kwargs, rules in _DOCUMENTS:
        if policy_kwargs["name"] in existing:
            continue
        policy = Policy(
            status=PolicyStatus.ACTIVE,
            effective_date=_days_ago(120),
            review_date=_days_ago(-245),  # ~8 months out
            applicable_departments=[],
            source_mime="application/pdf",
            source_bytes=0,
            uploaded_by=_REVIEWER,
            extraction_status=ExtractionStatus.EXTRACTED,
            extraction_source=ExtractionSource.MANUAL,
            created_at=_days_ago(120),
            updated_at=_days_ago(30),
            **policy_kwargs,
        )
        db.add(policy)
        db.flush()
        for rule_kwargs in rules:
            db.add(
                PolicyRule(
                    policy_id=policy.id,
                    status=RuleStatus.ACTIVE,
                    confidence=None,  # typed by a person; no machine claim
                    reviewed_by=_REVIEWER,
                    reviewed_at=_days_ago(115),
                    created_at=_days_ago(118),
                    **rule_kwargs,
                )
            )
        created += 1
    if created:
        db.commit()
        logger.info("Seeded %d GRC framework document(s)", created)
    return created
