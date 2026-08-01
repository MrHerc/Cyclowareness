"""Demo world for the organisational layer — same fictional company as ``seed.py``.

Caspian Dynamics (energy-tech, Baku) already has people, threats and loop runs.
This adds the governance around them, built so the three storylines the product
actually demonstrates are visible on the first login:

(a) **The whitelist that pins a vulnerable version.** The approved-software
    register fixes OpenSSL at 3.0.7. Five days ago NVD published a critical flaw
    covering every 3.0.x below 3.0.14. An ``IntelMatch`` states the link in one
    checkable sentence and a ``PolicyFinding`` carries it to an owner. This is
    the whole product in one row: the organisation's own document is what turns
    a public advisory into a specific, addressed obligation.

(b) **The exception nobody renewed.** An SMBv1 waiver on a legacy SCADA jump
    host expired 34 days ago and is still in force in practice.

(c) **An incident-response charge against named people**, classified
    ``restricted``, so the employee-facing redaction path is demonstrable rather
    than theoretical.

Every value here is documentation-safe: RFC 5737 addresses (192.0.2.0/24,
198.51.100.0/24, 203.0.113.0/24), example.com / example.az domains, and CVE ids
in plausible format that belong to no real advisory. No live payloads, no
credentials, no real vendor incident is described.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Department, Employee
from .models import (
    AuditEvent,
    Confidentiality,
    ExternalCourse,
    ExtractionSource,
    ExtractionStatus,
    FindingStatus,
    FindingType,
    IncidentRisk,
    IncidentRiskStatus,
    IncidentRiskSubject,
    IncidentRiskType,
    Integration,
    IntegrationCapability,
    IntegrationProvider,
    IntegrationStatus,
    IntelItem,
    IntelMatch,
    IntelRelevance,
    IntelSource,
    IntelType,
    MatchType,
    Policy,
    PolicyFinding,
    PolicyRule,
    PolicyStatus,
    PolicyType,
    PolicyVersion,
    ReviewerDecision,
    RuleStatus,
    RuleType,
    Severity,
    SubjectStatus,
    SyncStatus,
    record,
)

logger = logging.getLogger("cyclowareness.seed.platform")

NOW = datetime.now(timezone.utc)

ANALYST = "analyst@caspiandynamics.az"

#: Tables cleared (child → parent order) when the exhibition world is reset.
PLATFORM_MODELS = [
    AuditEvent,
    IntelMatch,
    PolicyFinding,
    PolicyVersion,
    PolicyRule,
    Policy,
    IntelItem,
    IncidentRiskSubject,
    IncidentRisk,
    ExternalCourse,
    Integration,
]


def days_ago(days: float, hour_jitter: float = 0.0) -> datetime:
    return NOW - timedelta(days=days, hours=hour_jitter)


def days_ahead(days: float) -> datetime:
    return NOW + timedelta(days=days)


def _actor(email: str, role: str = "analyst") -> SimpleNamespace:
    """A stand-in for the ``User`` ``record()`` normally receives.

    Several audit entries belong to people who hold no platform login (the IR
    approver, the policy owner). Their email is recorded as written rather than
    resolved to an account, because that is what actually happened.
    """
    return SimpleNamespace(email=email, role=role)


def seed_platform(db: Session) -> None:
    """Build the governance demo world. No-op if it is already there."""
    if db.execute(select(Policy)).first() is not None:
        return

    global NOW
    NOW = datetime.now(timezone.utc)

    employees = {
        emp.email.split("@")[0]: emp
        for emp in db.execute(select(Employee)).scalars().all()
    }
    departments = {
        dept.name: dept for dept in db.execute(select(Department)).scalars().all()
    }
    if not employees or not departments:
        logger.warning("Skipping platform seed: the core demo world is not present yet")
        return

    logger.info("Seeding platform demo data (policy, intel, incident risk, integrations)…")

    def emp_id(local: str) -> int:
        return employees[local].id

    def dept_id(name: str) -> int:
        return departments[name].id

    # ================================================================ policies
    approved_software = Policy(
        name="Approved Software Register",
        policy_type=PolicyType.APPROVED_SOFTWARE,
        version="4.1",
        status=PolicyStatus.ACTIVE,
        owner_name="Kamran Ismayilov",
        owner_email="kamran.ismayilov@caspiandynamics.az",
        effective_date=days_ago(210),
        review_date=days_ago(12),          # overdue, on purpose: it is the story
        applicable_departments=[dept_id("Engineering"), dept_id("Operations")],
        source_filename="approved-software-register-v4.1.pdf",
        source_mime="application/pdf",
        source_bytes=486_112,
        uploaded_by=ANALYST,
        extraction_status=ExtractionStatus.EXTRACTED,
        extraction_source=ExtractionSource.ANTHROPIC,
        notes="Annex B (cryptographic libraries) is the section that pins build versions.",
        created_at=days_ago(212),
        updated_at=days_ago(41),
    )
    egress_whitelist = Policy(
        name="Network Egress Whitelist",
        policy_type=PolicyType.WHITELIST,
        version="2.3",
        status=PolicyStatus.ACTIVE,
        owner_name="Kamran Ismayilov",
        owner_email="kamran.ismayilov@caspiandynamics.az",
        effective_date=days_ago(150),
        review_date=days_ahead(30),
        applicable_departments=[dept_id("Engineering"), dept_id("Operations"), dept_id("Finance")],
        source_filename="egress-whitelist-2.3.xlsx",
        source_mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        source_bytes=94_208,
        uploaded_by=ANALYST,
        extraction_status=ExtractionStatus.EXTRACTED,
        extraction_source=ExtractionSource.MOCK,
        notes="Extracted by the offline generator — no model was available on this host.",
        created_at=days_ago(151),
        updated_at=days_ago(28),
    )
    exception_register = Policy(
        name="Security Exception Register",
        policy_type=PolicyType.EXCEPTION_REGISTER,
        version="9.7",
        status=PolicyStatus.ACTIVE,
        owner_name="Murad Nasirov",
        owner_email="murad.nasirov@caspiandynamics.az",
        effective_date=days_ago(96),
        review_date=days_ahead(6),
        applicable_departments=[],
        source_filename="exception-register-2026Q2.docx",
        source_mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        source_bytes=132_704,
        uploaded_by=ANALYST,
        extraction_status=ExtractionStatus.EXTRACTED,
        extraction_source=ExtractionSource.ANTHROPIC,
        notes="Every entry carries an expiry date; expiry is the control.",
        created_at=days_ago(97),
        updated_at=days_ago(34),
    )
    endpoint_baseline = Policy(
        name="Endpoint Hardening Baseline",
        policy_type=PolicyType.BASELINE,
        version="1.8",
        status=PolicyStatus.ACTIVE,
        owner_name="Kamran Ismayilov",
        owner_email="kamran.ismayilov@caspiandynamics.az",
        effective_date=days_ago(74),
        review_date=days_ahead(105),
        applicable_departments=[],
        source_filename="endpoint-baseline-1.8.pdf",
        source_mime="application/pdf",
        source_bytes=1_204_887,
        uploaded_by=ANALYST,
        # The honest failure case: a scanned document with no text layer. The UI
        # must show WHY there are no rules, not an empty rule list.
        extraction_status=ExtractionStatus.FAILED,
        extraction_error=(
            "No extractable text layer — the document appears to be a scan. "
            "Re-upload a text PDF, or enter the controls manually."
        ),
        extraction_source=ExtractionSource.ANTHROPIC,
        notes="Scanned from the signed hard copy. Needs re-export from the source file.",
        created_at=days_ago(75),
        updated_at=days_ago(75),
    )
    vendor_requirements = Policy(
        name="Third-Party Vendor Security Requirements",
        policy_type=PolicyType.VENDOR_REQUIREMENT,
        version="3.2",
        status=PolicyStatus.UNDER_REVIEW,
        owner_name="Zahra Novruzova",
        owner_email="zahra.novruzova@caspiandynamics.az",
        effective_date=days_ago(320),
        review_date=days_ahead(14),
        applicable_departments=[dept_id("Operations"), dept_id("Finance")],
        source_filename="vendor-security-requirements-3.2.pdf",
        source_mime="application/pdf",
        source_bytes=318_940,
        uploaded_by="zahra.novruzova@caspiandynamics.az",
        # Uploaded, never read: nobody asked for extraction. Distinct from a
        # failed read and very distinct from "we read it and found nothing".
        extraction_status=ExtractionStatus.NOT_ATTEMPTED,
        extraction_source=ExtractionSource.NONE,
        notes="Procurement is still negotiating clause 7 with two suppliers.",
        created_at=days_ago(19),
        updated_at=days_ago(19),
    )
    ir_procedure = Policy(
        name="Incident Response Procedure",
        policy_type=PolicyType.INCIDENT_PROCEDURE,
        version="5.0",
        status=PolicyStatus.ACTIVE,
        owner_name="Murad Nasirov",
        owner_email="murad.nasirov@caspiandynamics.az",
        effective_date=days_ago(58),
        review_date=days_ahead(120),
        applicable_departments=[],
        source_filename="ir-procedure-5.0.md",
        source_mime="text/markdown",
        source_bytes=41_233,
        uploaded_by=ANALYST,
        extraction_status=ExtractionStatus.EXTRACTED,
        extraction_source=ExtractionSource.MANUAL,
        notes="Rules typed in by the IR lead rather than extracted.",
        created_at=days_ago(59),
        updated_at=days_ago(21),
    )
    db.add_all([
        approved_software, egress_whitelist, exception_register,
        endpoint_baseline, vendor_requirements, ir_procedure,
    ])
    db.flush()

    # ---------------------------------------------------------- policy rules
    rules = {}

    def rule(key: str, policy: Policy, **kwargs) -> PolicyRule:
        obj = PolicyRule(policy_id=policy.id, rule_key=key, **kwargs)
        db.add(obj)
        rules[key] = obj
        return obj

    # Storyline (a) — the rule that pins a version the outside world just broke.
    rule(
        "approved-software.openssl.ceiling",
        approved_software,
        statement=(
            "OpenSSL 3.0.7 is the approved build for all Linux gateway and API hosts; "
            "any later branch requires documented re-certification before deployment."
        ),
        rule_type=RuleType.VERSION_CEILING,
        technology="OpenSSL",
        version_spec="<= 3.0.7",
        evidence_quote=(
            "Annex B — Cryptographic libraries. The approved OpenSSL build is 3.0.7 (LTS). "
            "Deviation from the approved build requires a documented re-certification signed "
            "by the Platform Security owner."
        ),
        evidence_location="Annex B, p. 14",
        confidence=0.92,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(208),
        created_at=days_ago(211),
    )
    rule(
        "approved-software.chrome.floor",
        approved_software,
        statement="Google Chrome must be at version 120 or later on all managed endpoints.",
        rule_type=RuleType.VERSION_FLOOR,
        technology="Google Chrome",
        version_spec=">= 120",
        evidence_quote=(
            "Annex A — Browsers. Managed endpoints shall run Google Chrome 120 or later. "
            "Automatic updates shall not be disabled."
        ),
        evidence_location="Annex A, p. 9",
        confidence=0.95,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(208),
        created_at=days_ago(211),
    )
    rule(
        "approved-software.7zip.allow",
        approved_software,
        statement="7-Zip is approved for archive handling on engineering workstations.",
        rule_type=RuleType.ALLOW,
        technology="7-Zip",
        version_spec=">= 23.01",
        evidence_quote="Annex A — Utilities. 7-Zip (23.01 or later) is approved for archive handling.",
        evidence_location="Annex A, p. 11",
        confidence=0.88,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(208),
        created_at=days_ago(211),
    )
    rule(
        "approved-software.remote-desktop.deny",
        approved_software,
        statement="Consumer remote-desktop tools are not approved on any managed endpoint.",
        rule_type=RuleType.DENY,
        technology="Consumer remote-desktop tools",
        version_spec="",
        evidence_quote=(
            "Annex C — Prohibited categories. Consumer remote-control and screen-sharing "
            "utilities shall not be installed on managed endpoints."
        ),
        evidence_location="Annex C, p. 18",
        confidence=0.71,
        # Extracted 41 days ago and still waiting for a human. The review queue
        # is meant to have something in it — that is the module's point.
        status=RuleStatus.PROPOSED,
        created_at=days_ago(41),
    )
    rule(
        "approved-software.python.floor",
        approved_software,
        statement="Python runtimes on build agents must be 3.11 or later.",
        rule_type=RuleType.VERSION_FLOOR,
        technology="Python",
        version_spec=">= 3.11",
        evidence_quote=(
            "Annex B — Runtimes. Build agents shall use Python 3.11 or later; 3.9 images "
            "are retired at the end of the current quarter."
        ),
        evidence_location="Annex B, p. 15",
        confidence=0.64,
        status=RuleStatus.PROPOSED,
        created_at=days_ago(41),
    )

    rule(
        "egress.corporate-domains.allow",
        egress_whitelist,
        statement="Outbound HTTPS to *.caspiandynamics.az is permitted from all segments.",
        rule_type=RuleType.ALLOW,
        technology="*.caspiandynamics.az",
        version_spec="",
        evidence_quote="Row 4 — destination *.caspiandynamics.az, protocol 443/tcp, scope: all segments.",
        evidence_location="Sheet 'Allowed', row 4",
        confidence=0.97,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(148),
        created_at=days_ago(150),
    )
    # Storyline support: a whitelist row that is itself the risk.
    rule(
        "egress.legacy-ftp.allow",
        egress_whitelist,
        statement=(
            "Outbound FTP (21/tcp) to ftp.partner-logistics.example.com is permitted "
            "from the Operations segment for shipping manifests."
        ),
        rule_type=RuleType.ALLOW,
        technology="ftp.partner-logistics.example.com",
        version_spec="",
        evidence_quote=(
            "Row 19 — destination ftp.partner-logistics.example.com, protocol 21/tcp, "
            "scope: Operations. Justification: nightly shipping manifest transfer."
        ),
        evidence_location="Sheet 'Allowed', row 19",
        confidence=0.93,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(148),
        created_at=days_ago(150),
    )
    rule(
        "egress.update-mirror.allow",
        egress_whitelist,
        statement="Outbound HTTPS to updates.vendor.example.az is permitted for patch mirroring.",
        rule_type=RuleType.ALLOW,
        technology="updates.vendor.example.az",
        version_spec="",
        evidence_quote="Row 22 — destination updates.vendor.example.az, protocol 443/tcp, scope: Operations.",
        evidence_location="Sheet 'Allowed', row 22",
        confidence=0.91,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(148),
        created_at=days_ago(150),
    )
    rule(
        "egress.paste-services.deny",
        egress_whitelist,
        statement="Public paste and file-drop services are blocked from all corporate segments.",
        rule_type=RuleType.DENY,
        technology="Public paste services",
        version_spec="",
        evidence_quote="Sheet 'Blocked', row 3 — category: paste/file-drop, scope: all segments.",
        evidence_location="Sheet 'Blocked', row 3",
        confidence=0.89,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(148),
        created_at=days_ago(150),
    )

    # Storyline (b) — the exception that expired and nobody renewed.
    rule(
        "exception.smbv1.scada-jump-host",
        exception_register,
        statement=(
            "SMBv1 remains enabled on the legacy SCADA jump host (198.51.100.24) until "
            "the vendor's protocol upgrade ships. Waiver expires 2026-06-28."
        ),
        rule_type=RuleType.EXCEPTION,
        technology="SMBv1",
        version_spec="",
        evidence_quote=(
            "EX-2025-114 — SMBv1 on host SCADA-JMP-01 (198.51.100.24). Justification: "
            "vendor HMI client does not support SMBv2. Compensating control: host isolated "
            "to VLAN 812. Expiry: 2026-06-28. Owner: Operations."
        ),
        evidence_location="EX-2025-114",
        confidence=0.94,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(94),
        created_at=days_ago(96),
    )
    rule(
        "exception.local-admin.field-laptops",
        exception_register,
        statement=(
            "Six field-survey laptops retain local administrator rights for offline "
            "instrument drivers. Waiver expires in five weeks."
        ),
        rule_type=RuleType.EXCEPTION,
        technology="Local administrator rights",
        version_spec="",
        evidence_quote=(
            "EX-2026-031 — Local administrator rights on six field-survey laptops. "
            "Compensating control: EDR in blocking mode. Expiry: 35 days from issue. "
            "Owner: Operations."
        ),
        evidence_location="EX-2026-031",
        confidence=0.9,
        status=RuleStatus.ACTIVE,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(30),
        created_at=days_ago(32),
    )
    rule(
        "exception.shared-mailbox.finance",
        exception_register,
        statement=(
            "The shared payments mailbox may be accessed without individual MFA from the "
            "Finance office network. Rejected on review — MFA exemption not accepted."
        ),
        rule_type=RuleType.EXCEPTION,
        technology="Shared mailbox MFA exemption",
        version_spec="",
        evidence_quote=(
            "EX-2026-044 (draft) — request to exempt the shared payments mailbox from "
            "individual MFA when accessed from the Finance office network."
        ),
        evidence_location="EX-2026-044 (draft)",
        confidence=0.86,
        status=RuleStatus.REJECTED,
        reviewed_by=ANALYST,
        reviewed_at=days_ago(23),
        created_at=days_ago(26),
    )

    rule(
        "ir.report-window",
        ir_procedure,
        statement="Suspected incidents must be reported to the SOC within 30 minutes of discovery.",
        rule_type=RuleType.REQUIRE,
        technology="",
        version_spec="",
        evidence_quote="§3.1 — Discovery to notification shall not exceed 30 minutes.",
        evidence_location="§3.1",
        # Typed by a human: there is no extraction confidence to report, and a
        # fabricated 1.0 would be a machine claim about a human's sentence.
        confidence=None,
        status=RuleStatus.ACTIVE,
        reviewed_by="murad.nasirov@caspiandynamics.az",
        reviewed_at=days_ago(58),
        created_at=days_ago(59),
    )
    rule(
        "ir.payment-change.second-channel",
        ir_procedure,
        statement=(
            "Any change to vendor payment details must be verified on a second channel "
            "using contact details already on file, never those supplied in the request."
        ),
        rule_type=RuleType.REQUIRE,
        technology="",
        version_spec="",
        evidence_quote=(
            "§7.4 — Beneficiary changes require out-of-band verification against contact "
            "details held on file prior to the request."
        ),
        evidence_location="§7.4",
        confidence=None,
        status=RuleStatus.ACTIVE,
        reviewed_by="murad.nasirov@caspiandynamics.az",
        reviewed_at=days_ago(58),
        created_at=days_ago(59),
    )
    db.flush()

    # ------------------------------------------------------- policy versions
    db.add_all([
        PolicyVersion(
            policy_id=approved_software.id,
            version="4.0",
            changed_by=ANALYST,
            change_summary="Initial extraction from the signed register; 3 rules activated.",
            diff={"added": ["approved-software.openssl.ceiling", "approved-software.chrome.floor", "approved-software.7zip.allow"], "removed": [], "changed": []},
            snapshot=[
                {"rule_key": "approved-software.openssl.ceiling", "technology": "OpenSSL", "version_spec": "<= 3.0.7", "status": "active"},
                {"rule_key": "approved-software.chrome.floor", "technology": "Google Chrome", "version_spec": ">= 120", "status": "active"},
                {"rule_key": "approved-software.7zip.allow", "technology": "7-Zip", "version_spec": ">= 23.01", "status": "active"},
            ],
            created_at=days_ago(208),
        ),
        PolicyVersion(
            policy_id=approved_software.id,
            version="4.1",
            changed_by=ANALYST,
            change_summary="Re-extraction after Annex C was added; 2 rules proposed, none activated.",
            diff={
                "added": ["approved-software.remote-desktop.deny", "approved-software.python.floor"],
                "removed": [],
                "changed": [],
            },
            snapshot=[
                {"rule_key": "approved-software.openssl.ceiling", "technology": "OpenSSL", "version_spec": "<= 3.0.7", "status": "active"},
                {"rule_key": "approved-software.chrome.floor", "technology": "Google Chrome", "version_spec": ">= 120", "status": "active"},
                {"rule_key": "approved-software.7zip.allow", "technology": "7-Zip", "version_spec": ">= 23.01", "status": "active"},
                {"rule_key": "approved-software.remote-desktop.deny", "technology": "Consumer remote-desktop tools", "version_spec": "", "status": "proposed"},
                {"rule_key": "approved-software.python.floor", "technology": "Python", "version_spec": ">= 3.11", "status": "proposed"},
            ],
            created_at=days_ago(41),
        ),
        PolicyVersion(
            policy_id=exception_register.id,
            version="9.7",
            changed_by=ANALYST,
            change_summary="EX-2026-031 added; EX-2026-044 rejected at review.",
            diff={
                "added": ["exception.local-admin.field-laptops"],
                "removed": [],
                "changed": [{"rule_key": "exception.shared-mailbox.finance", "before": {"status": "proposed"}, "after": {"status": "rejected"}}],
            },
            snapshot=[
                {"rule_key": "exception.smbv1.scada-jump-host", "technology": "SMBv1", "status": "active", "expires": "2026-06-28"},
                {"rule_key": "exception.local-admin.field-laptops", "technology": "Local administrator rights", "status": "active"},
                {"rule_key": "exception.shared-mailbox.finance", "technology": "Shared mailbox MFA exemption", "status": "rejected"},
            ],
            created_at=days_ago(23),
        ),
    ])

    # ============================================================ intel items
    cve_openssl = IntelItem(
        external_id="CVE-2026-21841",
        source=IntelSource.NVD,
        source_name="NVD",
        source_url="https://nvd.example.com/vuln/detail/CVE-2026-21841",
        title="OpenSSL 3.0.x: heap overflow in the X.509 policy constraint parser",
        summary=(
            "A malformed certificate policy extension can overflow a heap buffer during "
            "chain validation. Any service performing client-certificate validation with an "
            "affected build is remotely reachable. Fixed in 3.0.14."
        ),
        intel_type=IntelType.VULNERABILITY,
        severity=Severity.CRITICAL,
        cvss_score=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        published_at=days_ago(5, 3),
        fetched_at=days_ago(5, 1),
        affected_products=[
            {"vendor": "OpenSSL Project", "product": "OpenSSL", "versions": ">= 3.0.0, < 3.0.14"},
        ],
        mitre_techniques=["T1190 Exploit Public-Facing Application"],
        iocs={},
        reference_urls=[
            "https://nvd.example.com/vuln/detail/CVE-2026-21841",
            "https://openssl.example.org/news/secadv/20260727.txt",
        ],
        relevance=IntelRelevance.URGENT,
        relevance_reason="Matches the version this organisation's own register approves.",
        created_at=days_ago(5, 1),
    )
    cert_smb = IntelItem(
        external_id="AZ-CERT-2026-0142",
        source=IntelSource.CERT,
        source_name="CERT.GOV.AZ",
        source_url="https://cert.example.az/advisories/2026-0142",
        title="Active exploitation of SMBv1 against industrial jump hosts in the region",
        summary=(
            "Regional CERT reports lateral movement into OT networks via SMBv1 on "
            "internet-adjacent jump hosts. Operators are advised to disable SMBv1 or, where "
            "a vendor dependency prevents it, verify that isolation controls are still in force."
        ),
        intel_type=IntelType.ADVISORY,
        severity=Severity.HIGH,
        cvss_score=None,
        cvss_vector="",
        published_at=days_ago(3, 6),
        fetched_at=days_ago(3, 4),
        affected_products=[{"vendor": "Microsoft", "product": "SMBv1", "versions": "all"}],
        mitre_techniques=["T1210 Exploitation of Remote Services", "T1021.002 SMB/Windows Admin Shares"],
        iocs={"ips": ["203.0.113.47", "203.0.113.90"], "domains": ["smb-relay.example.net"]},
        reference_urls=["https://cert.example.az/advisories/2026-0142"],
        relevance=IntelRelevance.RELEVANT,
        relevance_reason="We hold an active SMBv1 exception on a SCADA jump host.",
        created_at=days_ago(3, 4),
    )
    cve_chrome = IntelItem(
        external_id="CVE-2026-11907",
        source=IntelSource.VENDOR,
        source_name="Chrome Releases",
        source_url="https://chromereleases.example.com/2026/07/stable-update.html",
        title="Google Chrome: type confusion in V8 fixed in 133.0.6943.98",
        summary=(
            "A type-confusion flaw in V8 allows remote code execution in the renderer. "
            "Exploitation observed in the wild. Fixed in 133.0.6943.98."
        ),
        intel_type=IntelType.VULNERABILITY,
        severity=Severity.HIGH,
        cvss_score=8.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
        published_at=days_ago(9, 2),
        fetched_at=days_ago(9),
        affected_products=[{"vendor": "Google", "product": "Chrome", "versions": "< 133.0.6943.98"}],
        mitre_techniques=["T1203 Exploitation for Client Execution"],
        iocs={},
        reference_urls=["https://chromereleases.example.com/2026/07/stable-update.html"],
        relevance=IntelRelevance.MONITORING,
        relevance_reason="Managed fleet auto-updates; the approved floor is far below current stable.",
        created_at=days_ago(9),
    )
    kev_vpn = IntelItem(
        external_id="AA26-198A",
        source=IntelSource.CISA,
        source_name="CISA Known Exploited Vulnerabilities",
        source_url="https://cisa.example.gov/known-exploited-vulnerabilities/AA26-198A",
        title="Authentication bypass in an SSL-VPN appliance added to the KEV catalogue",
        summary=(
            "An unauthenticated path-traversal chain on an edge VPN appliance is being used "
            "for initial access. Federal agencies were directed to patch within seven days; "
            "the same window is recommended for critical infrastructure operators."
        ),
        intel_type=IntelType.ADVISORY,
        severity=Severity.CRITICAL,
        cvss_score=9.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
        published_at=days_ago(11, 5),
        fetched_at=days_ago(11, 3),
        affected_products=[{"vendor": "Example Networks", "product": "EdgeConnect SSL-VPN", "versions": "< 9.4.2"}],
        mitre_techniques=["T1190 Exploit Public-Facing Application", "T1133 External Remote Services"],
        iocs={"ips": ["192.0.2.144"], "domains": ["vpn-update.example.net"]},
        reference_urls=["https://cisa.example.gov/known-exploited-vulnerabilities/AA26-198A"],
        relevance=IntelRelevance.NOT_APPLICABLE,
        relevance_reason="We do not operate this vendor's edge appliances; remote access is IdP-fronted.",
        dismissed_by=ANALYST,
        dismissed_reason="Asset inventory shows no EdgeConnect appliances in any site.",
        created_at=days_ago(11, 3),
    )
    campaign_energy = IntelItem(
        external_id="ISAC-2026-ENG-07",
        source=IntelSource.RESEARCH,
        source_name="Energy ISAC quarterly bulletin",
        source_url="https://isac.example.org/bulletins/2026-eng-07",
        title="Invoice-fraud campaign targeting Caspian-region energy suppliers",
        summary=(
            "A financially motivated cluster registers lookalike domains of regional energy "
            "firms and their logistics partners, then requests beneficiary changes on open "
            "invoices timed to quarter-end payment runs."
        ),
        intel_type=IntelType.CAMPAIGN,
        severity=Severity.HIGH,
        cvss_score=None,
        cvss_vector="",
        published_at=days_ago(7, 8),
        fetched_at=days_ago(7, 6),
        affected_products=[],
        mitre_techniques=["T1656 Impersonation", "T1657 Financial Theft"],
        iocs={"domains": ["caspian-dynamlcs.example.com", "partner-logistlcs.example.com"]},
        reference_urls=["https://isac.example.org/bulletins/2026-eng-07"],
        relevance=IntelRelevance.RELEVANT,
        relevance_reason="Two of the reported lookalike domains imitate us and our logistics partner.",
        created_at=days_ago(7, 6),
    )
    exposure_creds = IntelItem(
        external_id="EXP-2026-0731-CD",
        source=IntelSource.BREACH_MONITOR,
        source_name="Credential exposure monitor",
        source_url="",
        title="14 caspiandynamics.az addresses appear in a third-party breach corpus",
        summary=(
            "A monitored corpus published this week contains 14 addresses on the corporate "
            "domain, 3 with reused password hashes matching an earlier 2024 corpus. No "
            "corporate system was breached; the source is a third-party service."
        ),
        intel_type=IntelType.CREDENTIAL_EXPOSURE,
        severity=Severity.HIGH,
        cvss_score=None,
        cvss_vector="",
        published_at=days_ago(2, 4),
        fetched_at=days_ago(2, 2),
        affected_products=[],
        mitre_techniques=["T1078 Valid Accounts", "T1110.004 Credential Stuffing"],
        iocs={"domains": ["caspiandynamics.az"]},
        reference_urls=[],
        relevance=IntelRelevance.RELEVANT,
        relevance_reason="Named corporate accounts; three subject to password reuse.",
        created_at=days_ago(2, 2),
    )
    ransomware_note = IntelItem(
        external_id="TR-2026-0619",
        source=IntelSource.RESEARCH,
        source_name="Vendor threat research",
        source_url="https://research.example.com/reports/tr-2026-0619",
        title="Ransomware affiliate shifts to backup-appliance credentials before encryption",
        summary=(
            "An affiliate group now enumerates backup-appliance consoles and revokes retention "
            "locks hours before deploying the encryptor, converting a recoverable event into a "
            "negotiation."
        ),
        intel_type=IntelType.RANSOMWARE,
        severity=Severity.HIGH,
        cvss_score=None,
        cvss_vector="",
        published_at=days_ago(15, 3),
        fetched_at=days_ago(15),
        affected_products=[],
        mitre_techniques=["T1490 Inhibit System Recovery", "T1486 Data Encrypted for Impact"],
        iocs={"ips": ["192.0.2.201"], "hashes": []},
        reference_urls=["https://research.example.com/reports/tr-2026-0619"],
        relevance=IntelRelevance.MONITORING,
        relevance_reason="Backup console MFA is in place; retention-lock alerting is not yet wired.",
        created_at=days_ago(15),
    )
    osint_iocs = IntelItem(
        external_id="",
        source=IntelSource.OSINT,
        source_name="Community IOC digest",
        source_url="https://osint.example.org/digests/2026-07-30",
        title="Weekly community IOC digest — phishing infrastructure",
        summary=(
            "Bulk indicator list of newly registered domains used in credential-harvest kits. "
            "Unranked and unverified; published as raw material, not as an assessment."
        ),
        intel_type=IntelType.IOC,
        severity=Severity.LOW,
        cvss_score=None,
        cvss_vector="",
        published_at=days_ago(1, 9),
        fetched_at=days_ago(1, 7),
        affected_products=[],
        mitre_techniques=[],
        iocs={"domains": ["m365-verify.example.net", "sso-renew.example.net"], "ips": ["198.51.100.77"]},
        reference_urls=["https://osint.example.org/digests/2026-07-30"],
        # Nobody has judged this yet, and the UI must say so rather than imply
        # somebody cleared it.
        relevance=IntelRelevance.UNASSESSED,
        created_at=days_ago(1, 7),
    )
    printer_firmware = IntelItem(
        external_id="VSA-2026-0088",
        source=IntelSource.VENDOR,
        source_name="Office hardware vendor security advisory",
        source_url="https://vendor.example.com/security/VSA-2026-0088",
        title="Stored cross-site scripting in a multifunction printer web console",
        summary=(
            "The device web console fails to encode the address-book display name, allowing "
            "stored script execution in an administrator's session. Fixed in firmware 4.62."
        ),
        intel_type=IntelType.VULNERABILITY,
        severity=Severity.MEDIUM,
        cvss_score=5.4,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N",
        published_at=days_ago(19, 2),
        fetched_at=days_ago(19),
        affected_products=[{"vendor": "Example Office", "product": "MFP 5400 series", "versions": "< 4.62"}],
        mitre_techniques=[],
        iocs={},
        reference_urls=["https://vendor.example.com/security/VSA-2026-0088"],
        relevance=IntelRelevance.MONITORING,
        relevance_reason="Six affected devices on the office VLAN; firmware update scheduled.",
        created_at=days_ago(19),
    )
    db.add_all([
        cve_openssl, cert_smb, cve_chrome, kev_vpn, campaign_energy,
        exposure_creds, ransomware_note, osint_iocs, printer_firmware,
    ])
    db.flush()

    # ======================================================= findings (a),(b)
    finding_openssl = PolicyFinding(
        finding_type=FindingType.VULNERABLE_ALLOWED_VERSION,
        title="Approved OpenSSL build 3.0.7 is inside the CVE-2026-21841 range",
        description=(
            "The Approved Software Register pins OpenSSL to 3.0.7 for all Linux gateway and "
            "API hosts. CVE-2026-21841, published five days ago, affects every 3.0.x build "
            "below 3.0.14 with a remotely reachable heap overflow in certificate chain "
            "validation. The register is therefore mandating a vulnerable build: hosts that "
            "comply with policy are the exposed ones, and re-certification is required before "
            "anyone may deploy the fix."
        ),
        severity=Severity.CRITICAL,
        confidence=0.94,
        status=FindingStatus.OPEN,
        policy_id=approved_software.id,
        policy_rule_id=rules["approved-software.openssl.ceiling"].id,
        technology="OpenSSL",
        affected_version="3.0.7",
        approved_version="3.0.7",
        recommended_version="3.0.14",
        source="intel:CVE-2026-21841",
        source_ref="https://nvd.example.com/vuln/detail/CVE-2026-21841",
        published_at=days_ago(5, 3),
        detected_at=days_ago(5),
        affected_department_ids=[dept_id("Engineering"), dept_id("Operations")],
        affected_employee_ids=[emp_id("kamran.ismayilov"), emp_id("gunel.safarova"), emp_id("aytan.guliyeva")],
        suggested_remediation=(
            "Raise the approved ceiling to 3.0.14 and issue an emergency re-certification "
            "note against Annex B, then patch the four gateway hosts and the API tier."
        ),
        required_training=(
            "Change-control refresher for the platform team: why a version pin is a security "
            "control with an expiry date, and how to run an emergency re-certification."
        ),
        owner_name="Kamran Ismayilov",
        due_date=days_ahead(4),
        evidence=[
            {
                "label": "Policy text",
                "value": (
                    "Annex B — Cryptographic libraries. The approved OpenSSL build is 3.0.7 (LTS)."
                ),
                "ref": "Approved Software Register v4.1, Annex B, p. 14",
            },
            {
                "label": "Advisory range",
                "value": "OpenSSL >= 3.0.0, < 3.0.14 — CVSS 9.1 (AV:N/AC:L/PR:N/UI:N)",
                "ref": "CVE-2026-21841",
            },
            {
                "label": "Overlap",
                "value": "3.0.7 falls inside the affected range; the approved build is the vulnerable build.",
                "ref": "rule approved-software.openssl.ceiling",
            },
            {
                "label": "Register review date",
                "value": "Review was due 12 days ago and has not been carried out.",
                "ref": "Approved Software Register v4.1",
            },
        ],
        created_at=days_ago(5),
    )
    finding_exception = PolicyFinding(
        finding_type=FindingType.EXPIRED_EXCEPTION,
        title="SMBv1 waiver EX-2025-114 expired 34 days ago and is still in force",
        description=(
            "The exception permitting SMBv1 on the legacy SCADA jump host (198.51.100.24) "
            "carried an expiry of 2026-06-28. It has not been renewed, withdrawn, or closed "
            "out, and the host still has the protocol enabled. Regional CERT published an "
            "advisory three days ago describing active exploitation of exactly this exposure "
            "on industrial jump hosts."
        ),
        severity=Severity.HIGH,
        confidence=0.97,
        status=FindingStatus.IN_REVIEW,
        policy_id=exception_register.id,
        policy_rule_id=rules["exception.smbv1.scada-jump-host"].id,
        technology="SMBv1",
        affected_version="",
        approved_version="",
        recommended_version="",
        source="policy:exception-expiry",
        source_ref="EX-2025-114",
        published_at=days_ago(34),
        detected_at=days_ago(34),
        affected_department_ids=[dept_id("Operations")],
        affected_employee_ids=[emp_id("narmin.aslanova"), emp_id("javid.huseynli")],
        suggested_remediation=(
            "Confirm the VLAN 812 isolation is still applied, then either close the exception "
            "against the vendor's shipped upgrade or re-approve it with a new expiry and a "
            "named owner."
        ),
        required_training=(
            "Operations refresher: an expired waiver is an unapproved configuration, not a "
            "grace period."
        ),
        owner_name="Narmin Aslanova",
        due_date=days_ahead(2),
        evidence=[
            {
                "label": "Register entry",
                "value": (
                    "EX-2025-114 — SMBv1 on SCADA-JMP-01 (198.51.100.24). Expiry: 2026-06-28. "
                    "Compensating control: host isolated to VLAN 812."
                ),
                "ref": "Security Exception Register v9.7, EX-2025-114",
            },
            {"label": "Days past expiry", "value": "34", "ref": "computed at detection"},
            {
                "label": "Corroborating advisory",
                "value": "AZ-CERT-2026-0142 reports active SMBv1 exploitation against industrial jump hosts.",
                "ref": "CERT.GOV.AZ, published 3 days ago",
            },
        ],
        created_at=days_ago(34),
    )
    finding_ftp = PolicyFinding(
        finding_type=FindingType.UNSAFE_WHITELIST_ENTRY,
        title="Egress whitelist permits plaintext FTP to a partner host",
        description=(
            "Row 19 of the egress whitelist allows outbound 21/tcp from the Operations "
            "segment to ftp.partner-logistics.example.com for nightly shipping manifests. "
            "Credentials and manifest contents cross the internet unencrypted, and the "
            "partner has offered SFTP since last year."
        ),
        severity=Severity.MEDIUM,
        confidence=0.88,
        status=FindingStatus.REMEDIATION_PLANNED,
        policy_id=egress_whitelist.id,
        policy_rule_id=rules["egress.legacy-ftp.allow"].id,
        technology="ftp.partner-logistics.example.com",
        affected_version="",
        approved_version="",
        recommended_version="",
        source="policy:whitelist-review",
        source_ref="Sheet 'Allowed', row 19",
        published_at=None,
        detected_at=days_ago(28),
        affected_department_ids=[dept_id("Operations")],
        affected_employee_ids=[emp_id("narmin.aslanova")],
        suggested_remediation="Migrate the manifest transfer to SFTP and remove row 19 at the next review.",
        required_training="",
        owner_name="Narmin Aslanova",
        due_date=days_ahead(21),
        evidence=[
            {
                "label": "Whitelist row",
                "value": "destination ftp.partner-logistics.example.com, protocol 21/tcp, scope Operations",
                "ref": "Network Egress Whitelist v2.3, Sheet 'Allowed', row 19",
            },
            {"label": "Protocol", "value": "FTP transmits credentials and payload in plaintext.", "ref": "rule egress.legacy-ftp.allow"},
        ],
        created_at=days_ago(28),
    )
    finding_chrome = PolicyFinding(
        finding_type=FindingType.OUTDATED_APPROVED_VERSION,
        title="Approved Chrome floor (120) is thirteen releases behind stable",
        description=(
            "The register's minimum Chrome version is 120. Current stable is 133.0.6943.98, "
            "which carries the fix for an in-the-wild V8 type confusion. The floor is not "
            "itself a vulnerability — the managed fleet auto-updates — but it no longer means "
            "anything as a control."
        ),
        severity=Severity.LOW,
        confidence=0.79,
        status=FindingStatus.OPEN,
        policy_id=approved_software.id,
        policy_rule_id=rules["approved-software.chrome.floor"].id,
        technology="Google Chrome",
        affected_version="120",
        approved_version=">= 120",
        recommended_version=">= 133.0.6943.98",
        source="intel:CVE-2026-11907",
        source_ref="https://chromereleases.example.com/2026/07/stable-update.html",
        published_at=days_ago(9, 2),
        detected_at=days_ago(9),
        affected_department_ids=[],
        affected_employee_ids=[],
        suggested_remediation="Restate the floor as 'current stable minus one' so it ages correctly.",
        required_training="",
        owner_name="Kamran Ismayilov",
        due_date=days_ahead(45),
        evidence=[
            {"label": "Policy floor", "value": ">= 120", "ref": "Approved Software Register v4.1, Annex A, p. 9"},
            {"label": "Current stable", "value": "133.0.6943.98", "ref": "CVE-2026-11907 advisory"},
        ],
        created_at=days_ago(9),
    )
    finding_exposure = PolicyFinding(
        finding_type=FindingType.EXPOSURE_MATCH,
        title="14 corporate addresses in a published breach corpus; 3 with reused hashes",
        description=(
            "A third-party breach corpus published this week contains 14 caspiandynamics.az "
            "addresses. Three of them carry password hashes matching a 2024 corpus, which "
            "means the password was reused across two external services and may be reused "
            "internally. No corporate system was breached."
        ),
        severity=Severity.HIGH,
        confidence=0.91,
        status=FindingStatus.TRAINING_ASSIGNED,
        policy_id=None,
        policy_rule_id=None,
        technology="Credential reuse",
        affected_version="",
        approved_version="",
        recommended_version="",
        source="intel:EXP-2026-0731-CD",
        source_ref="Credential exposure monitor",
        published_at=days_ago(2, 4),
        detected_at=days_ago(2),
        affected_department_ids=[dept_id("Sales"), dept_id("Human Resources"), dept_id("Finance")],
        affected_employee_ids=[emp_id("rashad.mammadov"), emp_id("sevinj.rahimova"), emp_id("elvin.quliyev")],
        suggested_remediation=(
            "Force a password reset for the three reuse matches, verify MFA enrolment for all "
            "14, and assign the credential-reuse micro-module."
        ),
        required_training="Password reuse and what a breach corpus actually is (3 minutes).",
        owner_name="Murad Nasirov",
        due_date=days_ahead(6),
        evidence=[
            {"label": "Addresses matched", "value": "14 on caspiandynamics.az", "ref": "EXP-2026-0731-CD"},
            {"label": "Hash reuse", "value": "3 addresses match a 2024 corpus", "ref": "EXP-2026-0731-CD"},
            {"label": "Corporate breach", "value": "None. The source is a third-party service.", "ref": "monitor assessment"},
        ],
        created_at=days_ago(2),
    )
    finding_printer = PolicyFinding(
        finding_type=FindingType.MISSING_CONTROL,
        title="Endpoint hardening baseline has no extracted controls to check against",
        description=(
            "The Endpoint Hardening Baseline v1.8 was uploaded as a scan with no text layer, "
            "so no rules were extracted and nothing is being checked against it. This is a "
            "gap in coverage, not a clean result: the platform has never read this document."
        ),
        severity=Severity.MEDIUM,
        confidence=None,
        status=FindingStatus.OPEN,
        policy_id=endpoint_baseline.id,
        policy_rule_id=None,
        technology="",
        affected_version="",
        approved_version="",
        recommended_version="",
        source="policy:extraction-failed",
        source_ref="endpoint-baseline-1.8.pdf",
        published_at=None,
        detected_at=days_ago(75),
        affected_department_ids=[],
        affected_employee_ids=[],
        suggested_remediation="Re-export the baseline from its source file and re-run extraction.",
        required_training="",
        owner_name="Kamran Ismayilov",
        due_date=days_ahead(10),
        evidence=[
            {
                "label": "Extraction error",
                "value": "No extractable text layer — the document appears to be a scan.",
                "ref": "endpoint-baseline-1.8.pdf",
            },
            {"label": "Rules extracted", "value": "0 — because the document was never read.", "ref": "extraction_status=failed"},
        ],
        created_at=days_ago(75),
    )
    db.add_all([
        finding_openssl, finding_exception, finding_ftp,
        finding_chrome, finding_exposure, finding_printer,
    ])
    db.flush()

    # ========================================================= intel matches
    db.add_all([
        IntelMatch(
            intel_item_id=cve_openssl.id,
            match_type=MatchType.APPROVED_SOFTWARE,
            matched_policy_id=approved_software.id,
            matched_rule_id=rules["approved-software.openssl.ceiling"].id,
            matched_technology="OpenSSL",
            matched_version="3.0.7",
            confidence=0.94,
            explanation=(
                "The Approved Software Register pins OpenSSL to 3.0.7 (Annex B, p. 14). "
                "CVE-2026-21841 affects every 3.0.x build below 3.0.14, so the version this "
                "organisation approved sits inside the vulnerable range."
            ),
            affected_department_ids=[dept_id("Engineering"), dept_id("Operations")],
            affected_employee_ids=[emp_id("kamran.ismayilov"), emp_id("gunel.safarova")],
            created_finding_id=finding_openssl.id,
            created_at=days_ago(5),
        ),
        IntelMatch(
            intel_item_id=cert_smb.id,
            match_type=MatchType.POLICY_RULE,
            matched_policy_id=exception_register.id,
            matched_rule_id=rules["exception.smbv1.scada-jump-host"].id,
            matched_technology="SMBv1",
            matched_version="",
            confidence=0.9,
            explanation=(
                "Exception EX-2025-114 keeps SMBv1 enabled on SCADA-JMP-01. The advisory "
                "describes active exploitation of SMBv1 on exactly this class of host, and the "
                "waiver expired 34 days ago."
            ),
            affected_department_ids=[dept_id("Operations")],
            affected_employee_ids=[emp_id("narmin.aslanova")],
            created_finding_id=finding_exception.id,
            created_at=days_ago(3),
        ),
        IntelMatch(
            intel_item_id=cve_chrome.id,
            match_type=MatchType.TECHNOLOGY_IN_USE,
            matched_policy_id=approved_software.id,
            matched_rule_id=rules["approved-software.chrome.floor"].id,
            matched_technology="Google Chrome",
            matched_version=">= 120",
            confidence=0.72,
            explanation=(
                "Chrome is on the approved list with a floor of 120. The fleet auto-updates, "
                "so exposure is expected to be brief — but the policy floor no longer bounds "
                "anything useful."
            ),
            affected_department_ids=[],
            affected_employee_ids=[],
            created_finding_id=finding_chrome.id,
            created_at=days_ago(9),
        ),
        IntelMatch(
            intel_item_id=exposure_creds.id,
            match_type=MatchType.CREDENTIAL_DOMAIN,
            matched_policy_id=None,
            matched_rule_id=None,
            matched_technology="caspiandynamics.az",
            matched_version="",
            confidence=0.99,
            explanation=(
                "14 addresses on the corporate mail domain appear verbatim in the corpus; "
                "three carry hashes seen in an earlier corpus, which indicates reuse."
            ),
            affected_department_ids=[dept_id("Sales"), dept_id("Human Resources"), dept_id("Finance")],
            affected_employee_ids=[emp_id("rashad.mammadov"), emp_id("sevinj.rahimova"), emp_id("elvin.quliyev")],
            created_finding_id=finding_exposure.id,
            created_at=days_ago(2),
        ),
        IntelMatch(
            intel_item_id=campaign_energy.id,
            match_type=MatchType.DEPARTMENT_EXPOSURE,
            matched_policy_id=None,
            matched_rule_id=None,
            matched_technology="",
            matched_version="",
            confidence=0.83,
            explanation=(
                "Two reported lookalike domains imitate this company and its logistics partner, "
                "and the campaign targets beneficiary changes at quarter-end — which is Finance's "
                "payment run."
            ),
            affected_department_ids=[dept_id("Finance"), dept_id("Operations")],
            affected_employee_ids=[emp_id("tural.hasanov"), emp_id("elvin.quliyev"), emp_id("zahra.novruzova")],
            created_finding_id=None,
            created_at=days_ago(7),
        ),
    ])

    # ============================================ (c) incident-response risks
    ir_payment = IncidentRisk(
        title="Beneficiary change approved without second-channel verification",
        incident_ref="IR-2026-0148",
        risk_type=IncidentRiskType.PROCEDURE_FAILURE,
        severity=Severity.HIGH,
        description=(
            "During the quarter-end payment run, a beneficiary change on invoice INV-2214 was "
            "approved on the strength of an email thread alone. The callback was made to the "
            "number in the request rather than the one held on file, which is the exact "
            "inversion §7.4 exists to prevent. The payment was stopped by the bank's own "
            "screening before settlement; no funds left the account."
        ),
        # Restricted: the investigation names a third-party contact and the
        # partner organisation. The subjects see the obligation, not this text.
        confidentiality=Confidentiality.RESTRICTED,
        status=IncidentRiskStatus.ASSIGNED,
        affected_department_id=dept_id("Finance"),
        evidence=[
            {"label": "Procedure clause", "value": "IR Procedure v5.0 §7.4 — out-of-band verification against details held on file.", "ref": "ir.payment-change.second-channel"},
            {"label": "Verification path used", "value": "Callback placed to the number supplied inside the request email.", "ref": "IR-2026-0148 timeline"},
            {"label": "Outcome", "value": "Payment held by bank screening; no funds transferred.", "ref": "IR-2026-0148 closure draft"},
            {"label": "Corroborating intel", "value": "ISAC-2026-ENG-07 describes this exact campaign pattern against regional energy suppliers.", "ref": "intel:ISAC-2026-ENG-07"},
        ],
        required_action=(
            "Complete the payment-verification module and its quiz, then confirm in writing "
            "that you have the on-file contact list for all vendors you approve payments for."
        ),
        requires_training=True,
        requires_quiz=True,
        requires_sandbox=False,
        min_score=80,
        deadline=days_ahead(9),
        approver_name="Murad Nasirov",
        closure_criteria=(
            "All three subjects pass at 80% or above, and the Finance controller confirms the "
            "on-file vendor contact list has been reviewed."
        ),
        created_by="murad.nasirov@caspiandynamics.az",
        created_at=days_ago(6, 5),
    )
    ir_paste = IncidentRisk(
        title="Configuration fragment containing a service account name posted to a public paste site",
        incident_ref="IR-2026-0139",
        risk_type=IncidentRiskType.DATA_MISHANDLING,
        severity=Severity.MEDIUM,
        description=(
            "While debugging a build failure, a configuration fragment was pasted to a public "
            "paste service. It contained an internal hostname and a service account name but "
            "no secret. The paste was removed within 40 minutes and the account was rotated "
            "as a precaution."
        ),
        confidentiality=Confidentiality.INTERNAL,
        status=IncidentRiskStatus.CLOSED,
        affected_department_id=dept_id("Engineering"),
        evidence=[
            {"label": "Policy rule", "value": "Public paste and file-drop services are blocked from all corporate segments.", "ref": "egress.paste-services.deny"},
            {"label": "Exposure", "value": "Internal hostname and service account name. No credential material.", "ref": "IR-2026-0139 analysis"},
            {"label": "Time to removal", "value": "40 minutes", "ref": "IR-2026-0139 timeline"},
        ],
        required_action="Complete the data-handling micro-module and acknowledge the paste-service block.",
        requires_training=True,
        requires_quiz=False,
        requires_sandbox=False,
        min_score=None,
        deadline=days_ago(9),
        approver_name="Murad Nasirov",
        closure_criteria="Subject completes the module and the service account rotation is confirmed.",
        created_by="murad.nasirov@caspiandynamics.az",
        created_at=days_ago(24),
        closed_at=days_ago(8, 2),
        closure_note=(
            "Module completed, account rotated, egress block verified. No evidence the paste "
            "was retrieved before removal."
        ),
        reopened_count=0,
    )
    ir_smb = IncidentRisk(
        title="Expired SMBv1 waiver left an OT jump host outside the approved baseline",
        incident_ref="IR-2026-0155",
        risk_type=IncidentRiskType.KNOWLEDGE_GAP,
        severity=Severity.HIGH,
        description=(
            "The waiver covering SMBv1 on SCADA-JMP-01 expired on 2026-06-28 and nobody "
            "tracked the date. The gap surfaced only when a regional CERT advisory matched it. "
            "The finding is a process gap, not a decision anyone made."
        ),
        confidentiality=Confidentiality.INTERNAL,
        status=IncidentRiskStatus.IN_PROGRESS,
        affected_department_id=dept_id("Operations"),
        evidence=[
            {"label": "Waiver", "value": "EX-2025-114, expiry 2026-06-28", "ref": "exception.smbv1.scada-jump-host"},
            {"label": "Days unmanaged", "value": "34", "ref": "policy finding"},
            {"label": "Advisory", "value": "AZ-CERT-2026-0142 — active SMBv1 exploitation against industrial jump hosts.", "ref": "intel:AZ-CERT-2026-0142"},
        ],
        required_action="Complete the exception-lifecycle module and register a renewal or closure for EX-2025-114.",
        requires_training=True,
        requires_quiz=True,
        requires_sandbox=False,
        min_score=70,
        deadline=days_ahead(3),
        approver_name="Murad Nasirov",
        closure_criteria="EX-2025-114 is renewed or closed with a named owner, and both subjects pass at 70%.",
        created_by="murad.nasirov@caspiandynamics.az",
        created_at=days_ago(3, 1),
    )
    db.add_all([ir_payment, ir_paste, ir_smb])
    db.flush()

    db.add_all([
        IncidentRiskSubject(
            incident_risk_id=ir_payment.id,
            employee_id=emp_id("tural.hasanov"),
            status=SubjectStatus.COMPLETED,
            score=90.0,
            completed_at=days_ago(2, 3),
            reviewer_decision=ReviewerDecision.ACCEPTED,
            reviewer_note="Passed at 90% and produced the on-file vendor contact list.",
            reviewed_by="murad.nasirov@caspiandynamics.az",
            reviewed_at=days_ago(1, 8),
        ),
        IncidentRiskSubject(
            incident_risk_id=ir_payment.id,
            employee_id=emp_id("elvin.quliyev"),
            status=SubjectStatus.FAILED,
            score=60.0,
            completed_at=days_ago(1, 5),
            reviewer_decision=ReviewerDecision.REJECTED,
            reviewer_note="Below the 80% bar set for this incident. Reassigned; retake due with the incident deadline.",
            reviewed_by="murad.nasirov@caspiandynamics.az",
            reviewed_at=days_ago(1, 2),
        ),
        # Leyla Aliyeva rather than another Finance name without a login: this is
        # the only seeded subject of a RESTRICTED risk who can actually sign in,
        # so the redaction in the employee view is demonstrable instead of merely
        # implemented. Without her, /incident-risks/my returns [] for every demo
        # account and the withheld-evidence path never renders.
        IncidentRiskSubject(
            incident_risk_id=ir_payment.id,
            employee_id=emp_id("leyla.aliyeva"),
            status=SubjectStatus.IN_PROGRESS,
            score=None,
            completed_at=None,
            reviewer_decision=ReviewerDecision.PENDING,
        ),
        IncidentRiskSubject(
            incident_risk_id=ir_paste.id,
            employee_id=emp_id("orkhan.baghirov"),
            status=SubjectStatus.REVIEWED,
            score=100.0,
            completed_at=days_ago(10, 4),
            reviewer_decision=ReviewerDecision.ACCEPTED,
            reviewer_note="Completed same day. Raised the missing egress block himself.",
            reviewed_by="murad.nasirov@caspiandynamics.az",
            reviewed_at=days_ago(9, 6),
        ),
        IncidentRiskSubject(
            incident_risk_id=ir_smb.id,
            employee_id=emp_id("narmin.aslanova"),
            status=SubjectStatus.IN_PROGRESS,
            score=None,
            reviewer_decision=ReviewerDecision.PENDING,
        ),
        IncidentRiskSubject(
            incident_risk_id=ir_smb.id,
            employee_id=emp_id("javid.huseynli"),
            status=SubjectStatus.ASSIGNED,
            score=None,
            reviewer_decision=ReviewerDecision.PENDING,
        ),
    ])

    # =========================================================== integrations
    udemy = Integration(
        provider=IntegrationProvider.UDEMY_BUSINESS,
        display_name="Udemy Business — Caspian Dynamics",
        status=IntegrationStatus.CONNECTED,
        capabilities=[
            IntegrationCapability.IMPORT_COURSES,
            IntegrationCapability.ASSIGN,
            IntegrationCapability.SYNC_COMPLETION,
            IntegrationCapability.SYNC_SCORES,
        ],
        config_summary={
            "base_url": "https://caspiandynamics.udemy.example.com",
            "account_name": "Caspian Dynamics MMC",
            "seats": 180,
            "course_scope": "Security & Compliance collection",
        },
        last_sync_at=days_ago(0.2),
        last_sync_status=SyncStatus.OK,
        courses_imported=4,
        created_at=days_ago(112),
        updated_at=days_ago(0.2),
    )
    moodle = Integration(
        provider=IntegrationProvider.MOODLE,
        display_name="Moodle (internal HSE academy)",
        status=IntegrationStatus.DEGRADED,
        capabilities=[IntegrationCapability.IMPORT_COURSES, IntegrationCapability.SYNC_COMPLETION],
        config_summary={
            "base_url": "https://academy.example.az",
            "account_name": "cyclowareness-service",
            "web_service": "core_course_get_courses",
        },
        last_sync_at=days_ago(1, 4),
        # Partial, with the reason stated: half a catalogue is not a catalogue,
        # and the UI must not show 2 courses as though that were all of them.
        last_sync_status=SyncStatus.PARTIAL,
        last_sync_error=(
            "Imported 2 of 11 courses; the remaining 9 returned HTTP 403 "
            "(web-service token lacks the 'course:view' capability on category 'Security')."
        ),
        courses_imported=2,
        created_at=days_ago(64),
        updated_at=days_ago(1, 4),
    )
    saml = Integration(
        provider=IntegrationProvider.SSO_SAML,
        display_name="SAML single sign-on",
        status=IntegrationStatus.NOT_CONFIGURED,
        capabilities=[IntegrationCapability.SSO],
        config_summary={},
        last_sync_at=None,
        last_sync_status=SyncStatus.NEVER,
        courses_imported=0,
        created_at=days_ago(112),
        updated_at=days_ago(112),
    )
    cornerstone = Integration(
        provider=IntegrationProvider.CORNERSTONE,
        display_name="Cornerstone OnDemand (HR compliance catalogue)",
        status=IntegrationStatus.ERROR,
        capabilities=[IntegrationCapability.IMPORT_COURSES, IntegrationCapability.SYNC_COMPLETION],
        config_summary={
            "base_url": "https://caspian.cornerstone.example.com",
            "account_name": "cd-integration",
        },
        last_sync_at=days_ago(5, 9),
        last_sync_status=SyncStatus.FAILED,
        last_sync_error="OAuth token rejected (invalid_client). The integration has not synced since it was rotated.",
        courses_imported=0,
        created_at=days_ago(88),
        updated_at=days_ago(5, 9),
    )
    db.add_all([udemy, moodle, saml, cornerstone])
    db.flush()

    db.add_all([
        ExternalCourse(
            integration_id=udemy.id,
            external_ref="udemy:1284410",
            title="Business Email Compromise: verifying payment changes",
            description="Practical walkthrough of out-of-band verification for beneficiary changes.",
            provider_name="Udemy Business",
            url="https://caspiandynamics.udemy.example.com/course/1284410",
            duration_minutes=42,
            language="en",
            topics=["bec", "payments", "social-engineering"],
            mapped_behaviors=["verify_payment_change", "second_channel_check"],
            last_synced_at=days_ago(0.2),
            active=True,
        ),
        ExternalCourse(
            integration_id=udemy.id,
            external_ref="udemy:1190337",
            title="Password reuse and credential stuffing",
            description="What a breach corpus is, and why one reused password is an enterprise problem.",
            provider_name="Udemy Business",
            url="https://caspiandynamics.udemy.example.com/course/1190337",
            duration_minutes=28,
            language="en",
            topics=["credentials", "mfa"],
            mapped_behaviors=["unique_passwords", "mfa_enrolment"],
            last_synced_at=days_ago(0.2),
            active=True,
        ),
        ExternalCourse(
            integration_id=udemy.id,
            external_ref="udemy:1355902",
            title="Phishing in messaging platforms",
            description="Teams and Slack impersonation, OAuth consent phishing, and how to report.",
            provider_name="Udemy Business",
            url="https://caspiandynamics.udemy.example.com/course/1355902",
            duration_minutes=35,
            language="en",
            topics=["phishing", "chat", "oauth"],
            mapped_behaviors=["report_suspicious_message"],
            last_synced_at=days_ago(0.2),
            active=True,
        ),
        ExternalCourse(
            integration_id=udemy.id,
            external_ref="udemy:1401255",
            title="Change control for security-relevant configuration",
            description="Why a version pin is a control with an expiry date.",
            provider_name="Udemy Business",
            url="https://caspiandynamics.udemy.example.com/course/1401255",
            duration_minutes=51,
            language="en",
            topics=["change-control", "policy"],
            mapped_behaviors=["exception_lifecycle", "recertification"],
            last_synced_at=days_ago(0.2),
            active=True,
        ),
        ExternalCourse(
            integration_id=moodle.id,
            external_ref="moodle:course-217",
            title="Məlumat təhlükəsizliyi: əsaslar",
            description="Company-wide information security induction, delivered in Azerbaijani.",
            provider_name="Moodle (internal HSE academy)",
            url="https://academy.example.az/course/view.php?id=217",
            duration_minutes=60,
            language="az",
            topics=["induction", "policy"],
            mapped_behaviors=["policy_awareness"],
            last_synced_at=days_ago(1, 4),
            active=True,
        ),
        ExternalCourse(
            integration_id=moodle.id,
            external_ref="moodle:course-231",
            title="OT/SCADA access discipline",
            description="Jump-host hygiene and exception handling for the control network.",
            provider_name="Moodle (internal HSE academy)",
            url="https://academy.example.az/course/view.php?id=231",
            duration_minutes=75,
            language="az",
            topics=["ot", "scada", "access"],
            mapped_behaviors=["exception_lifecycle", "jump_host_hygiene"],
            last_synced_at=days_ago(1, 4),
            active=True,
        ),
    ])

    # ================================================================= audit
    analyst = _actor(ANALYST, "analyst")
    ir_lead = _actor("murad.nasirov@caspiandynamics.az", "analyst")
    platform_owner = _actor("kamran.ismayilov@caspiandynamics.az", "analyst")
    ANALYST_IP = "198.51.100.31"
    IR_IP = "198.51.100.44"
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Cyclowareness/1.0"

    audit_entries = [
        (analyst, "policy.upload", "policy", approved_software.id, approved_software.name,
         "Uploaded Approved Software Register v4.1 (PDF, 475 KB) and requested extraction.",
         None, {"version": "4.1", "extraction_status": "pending"}, days_ago(41, 2), ANALYST_IP),
        (analyst, "policy.extract", "policy", approved_software.id, approved_software.name,
         "Extraction completed by anthropic: 2 new rules proposed, 3 unchanged.",
         {"extraction_status": "pending"}, {"extraction_status": "extracted", "extraction_source": "anthropic", "rules_proposed": 2}, days_ago(41, 1), None),
        (analyst, "policy.rule.activate", "policy_rule", rules["approved-software.openssl.ceiling"].id, "approved-software.openssl.ceiling",
         "Activated the OpenSSL version ceiling after reading Annex B, p. 14.",
         {"status": "proposed"}, {"status": "active"}, days_ago(208), ANALYST_IP),
        (analyst, "policy.rule.activate", "policy_rule", rules["approved-software.chrome.floor"].id, "approved-software.chrome.floor",
         "Activated the Chrome version floor.",
         {"status": "proposed"}, {"status": "active"}, days_ago(208, 0.2), ANALYST_IP),
        (analyst, "policy.rule.reject", "policy_rule", rules["exception.shared-mailbox.finance"].id, "exception.shared-mailbox.finance",
         "Rejected EX-2026-044: an MFA exemption for a shared payments mailbox is not acceptable.",
         {"status": "proposed"}, {"status": "rejected"}, days_ago(23), ANALYST_IP),
        (analyst, "policy.version.snapshot", "policy_version", None, "Security Exception Register v9.7",
         "Snapshotted the exception register at v9.7 (1 added, 1 rejected).",
         None, {"version": "9.7"}, days_ago(23, 0.1), ANALYST_IP),
        (analyst, "policy.upload", "policy", endpoint_baseline.id, endpoint_baseline.name,
         "Uploaded Endpoint Hardening Baseline v1.8 (PDF, 1.1 MB).",
         None, {"version": "1.8"}, days_ago(75, 1), ANALYST_IP),
        (None, "policy.extract.fail", "policy", endpoint_baseline.id, endpoint_baseline.name,
         "Extraction failed: no text layer in the uploaded PDF. No rules were produced.",
         {"extraction_status": "pending"}, {"extraction_status": "failed"}, days_ago(75, 0.8), None),
        (_actor("zahra.novruzova@caspiandynamics.az", "analyst"), "policy.upload", "policy", vendor_requirements.id, vendor_requirements.name,
         "Uploaded vendor security requirements v3.2 without requesting extraction.",
         None, {"version": "3.2", "extraction_status": "not_attempted"}, days_ago(19), "198.51.100.62"),
        (None, "intel.fetch", "intel_item", cve_openssl.id, "CVE-2026-21841",
         "Fetched CVE-2026-21841 from NVD (CVSS 9.1).",
         None, {"severity": "critical", "cvss_score": 9.1}, days_ago(5, 1), None),
        (None, "intel.match", "intel_match", None, "CVE-2026-21841 ↔ approved-software.openssl.ceiling",
         "Matched CVE-2026-21841 to the approved OpenSSL ceiling (confidence 0.94).",
         None, {"match_type": "approved_software", "confidence": 0.94}, days_ago(5, 0.9), None),
        (None, "policy.finding.raise", "policy_finding", finding_openssl.id, finding_openssl.title,
         "Raised a critical finding: the approved build is inside the advisory's affected range.",
         None, {"severity": "critical", "status": "open"}, days_ago(5, 0.8), None),
        (analyst, "policy.finding.assign", "policy_finding", finding_openssl.id, finding_openssl.title,
         "Assigned to Kamran Ismayilov with a four-day due date.",
         {"owner_name": ""}, {"owner_name": "Kamran Ismayilov"}, days_ago(4, 6), ANALYST_IP),
        (analyst, "intel.relevance.set", "intel_item", kev_vpn.id, "AA26-198A",
         "Marked not applicable: asset inventory shows no EdgeConnect appliances.",
         {"relevance": "unassessed"}, {"relevance": "not_applicable"}, days_ago(11, 1), ANALYST_IP),
        (analyst, "intel.relevance.set", "intel_item", cert_smb.id, "AZ-CERT-2026-0142",
         "Marked relevant: we hold an active SMBv1 exception on a SCADA jump host.",
         {"relevance": "unassessed"}, {"relevance": "relevant"}, days_ago(3, 2), ANALYST_IP),
        (None, "policy.finding.raise", "policy_finding", finding_exception.id, finding_exception.title,
         "Raised on exception expiry: EX-2025-114 passed its expiry date 34 days ago.",
         None, {"severity": "high", "status": "open"}, days_ago(34), None),
        (analyst, "policy.finding.status", "policy_finding", finding_exception.id, finding_exception.title,
         "Moved to in_review after the CERT advisory corroborated the exposure.",
         {"status": "open"}, {"status": "in_review"}, days_ago(3), ANALYST_IP),
        (ir_lead, "incident_risk.create", "incident_risk", ir_payment.id, "IR-2026-0148",
         "Opened IR-2026-0148 against the quarter-end beneficiary change. Classified restricted.",
         None, {"severity": "high", "confidentiality": "restricted"}, days_ago(6, 5), IR_IP),
        (ir_lead, "incident_risk.assign", "incident_risk", ir_payment.id, "IR-2026-0148",
         "Assigned three Finance subjects with an 80% pass mark and a nine-day deadline.",
         {"subjects": 0}, {"subjects": 3}, days_ago(6, 4), IR_IP),
        (ir_lead, "incident_risk.subject.review", "incident_risk_subject", None, "IR-2026-0148 / Elvin Quliyev",
         "Rejected: 60% is below the 80% bar set for this incident. Retake required.",
         {"reviewer_decision": "pending"}, {"reviewer_decision": "rejected"}, days_ago(1, 2), IR_IP),
        (ir_lead, "incident_risk.close", "incident_risk", ir_paste.id, "IR-2026-0139",
         "Closed IR-2026-0139: module completed, service account rotated, egress block verified.",
         {"status": "in_progress"}, {"status": "closed"}, days_ago(8, 2), IR_IP),
        (platform_owner, "integration.configure", "integration", moodle.id, moodle.display_name,
         "Configured the Moodle web-service endpoint for the internal HSE academy.",
         None, {"status": "configured", "base_url": "https://academy.example.az"}, days_ago(64), "198.51.100.19"),
        (None, "integration.sync", "integration", moodle.id, moodle.display_name,
         "Partial sync: 2 of 11 courses imported; 9 rejected with HTTP 403.",
         {"courses_imported": 2}, {"courses_imported": 2, "last_sync_status": "partial"}, days_ago(1, 4), None),
        (None, "integration.sync", "integration", cornerstone.id, cornerstone.display_name,
         "Sync failed: OAuth token rejected (invalid_client).",
         {"last_sync_status": "failed"}, {"last_sync_status": "failed"}, days_ago(5, 9), None),
        (None, "integration.sync", "integration", udemy.id, udemy.display_name,
         "Sync ok: 4 courses in scope, all current.",
         {"courses_imported": 4}, {"courses_imported": 4, "last_sync_status": "ok"}, days_ago(0.2), None),
        (analyst, "policy.finding.status", "policy_finding", finding_exposure.id, finding_exposure.title,
         "Moved to training_assigned: credential-reuse module queued for the three reuse matches.",
         {"status": "open"}, {"status": "training_assigned"}, days_ago(1, 9), ANALYST_IP),
    ]
    for actor, action, obj_type, obj_id, label, summary, before, after, at, ip in audit_entries:
        record(
            db,
            actor=actor,
            action=action,
            object_type=obj_type,
            object_id=obj_id,
            object_label=label,
            summary=summary,
            before=before,
            after=after,
            ip_address=ip,
            user_agent=UA if ip else None,
            at=at,
        )

    db.flush()
    logger.info(
        "Platform seed complete: 6 policies, %d rules, 9 intel items, 6 findings, "
        "3 incident risks, 4 integrations, %d audit events",
        len(rules),
        len(audit_entries),
    )
