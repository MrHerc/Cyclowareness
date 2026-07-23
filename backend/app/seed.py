"""Demo seed data — a believable mid-size company with six months of history,
so the dashboard proves the loop works from the first login.

Fictional org: Caspian Dynamics (energy-tech, Baku). Domain: caspiandynamics.az
Logins (see README):
    analyst@caspiandynamics.az  / analyst123   — Security Analyst
    exec@caspiandynamics.az     / exec123      — Executive (read-only)
    leyla.aliyeva@caspiandynamics.az   / demo123 — Employee (Finance)
    rashad.mammadov@caspiandynamics.az / demo123 — Employee (Sales, high risk)
    aysel.huseynova@caspiandynamics.az / demo123 — Employee (Engineering, champion)
"""
import logging
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .core.risk_engine import baseline_for
from .models import (
    AssignmentStatus,
    Department,
    Employee,
    FeedItem,
    LoopRun,
    LoopStatus,
    MetricSnapshot,
    ModuleStatus,
    PhishingReport,
    PhishingSimulation,
    ReportStatus,
    RiskEvent,
    Role,
    SimOutcome,
    SimulationStatus,
    SimulationTarget,
    Threat,
    ThreatSource,
    TrainingAssignment,
    TrainingModule,
    User,
)
from .security import hash_password

logger = logging.getLogger("cyclowareness.seed")
rng = random.Random(2026)

NOW = datetime.now(timezone.utc)

# Tables cleared (child → parent order) by reset_and_reseed before re-seeding.
_ALL_MODELS = [
    RiskEvent,
    SimulationTarget,
    PhishingSimulation,
    TrainingAssignment,
    PhishingReport,
    LoopRun,
    TrainingModule,
    Threat,
    FeedItem,
    MetricSnapshot,
    User,
    Employee,
    Department,
]


def days_ago(days: float, hour_jitter: float = 0.0) -> datetime:
    return NOW - timedelta(days=days, hours=hour_jitter)


def reset_and_reseed(db: Session) -> None:
    """Wipe all data and re-seed the demo world (one-click exhibition reset)."""
    global rng
    logger.info("Resetting demo data…")
    for model in _ALL_MODELS:
        db.query(model).delete()
    db.commit()
    rng = random.Random(2026)  # deterministic world on every reset
    seed_if_empty(db)


def seed_if_empty(db: Session) -> None:
    if db.execute(select(User)).first() is not None:
        return
    logger.info("Seeding demo data (Caspian Dynamics)…")

    # Anchor the six months of history to the moment of (re)seeding so a reset
    # weeks later still shows a fresh, current-looking timeline.
    global NOW
    NOW = datetime.now(timezone.utc)

    # ------------------------------------------------------------------ org
    dept_specs = [
        ("Finance", 0.9),
        ("Engineering", 0.6),
        ("Sales", 0.5),
        ("Human Resources", 0.7),
        ("Operations", 0.4),
        ("Executive Office", 1.0),
    ]
    departments: dict[str, Department] = {}
    for name, _ in dept_specs:
        dept = Department(name=name)
        db.add(dept)
        departments[name] = dept
    db.flush()

    employee_specs = [
        # (name, email-local, dept, role_title, sensitivity, risk_score)
        ("Leyla Aliyeva", "leyla.aliyeva", "Finance", "Senior Accountant", 0.9, 48.0),
        ("Tural Hasanov", "tural.hasanov", "Finance", "Payments Specialist", 0.9, 66.0),
        ("Nigar Karimova", "nigar.karimova", "Finance", "Financial Controller", 0.9, 38.0),
        ("Elvin Quliyev", "elvin.quliyev", "Finance", "AP Clerk", 0.8, 71.0),
        ("Aysel Huseynova", "aysel.huseynova", "Engineering", "Backend Engineer", 0.6, 16.0),
        ("Kamran Ismayilov", "kamran.ismayilov", "Engineering", "DevOps Engineer", 0.7, 33.0),
        ("Sabina Mammadli", "sabina.mammadli", "Engineering", "QA Engineer", 0.5, 28.0),
        ("Orkhan Baghirov", "orkhan.baghirov", "Engineering", "Frontend Engineer", 0.5, 41.0),
        ("Gunel Safarova", "gunel.safarova", "Engineering", "Data Engineer", 0.6, 24.0),
        ("Rashad Mammadov", "rashad.mammadov", "Sales", "Account Executive", 0.5, 74.0),
        ("Aida Valiyeva", "aida.valiyeva", "Sales", "Sales Manager", 0.6, 52.0),
        ("Farid Jafarov", "farid.jafarov", "Sales", "Business Development", 0.5, 58.0),
        ("Lala Ahmadova", "lala.ahmadova", "Sales", "Sales Operations", 0.4, 35.0),
        ("Murad Nasirov", "murad.nasirov", "Human Resources", "HR Director", 0.8, 44.0),
        ("Sevinj Rahimova", "sevinj.rahimova", "Human Resources", "Recruiter", 0.7, 62.0),
        ("Emil Tagiyev", "emil.tagiyev", "Human Resources", "HR Generalist", 0.6, 39.0),
        ("Narmin Aslanova", "narmin.aslanova", "Operations", "Logistics Lead", 0.4, 31.0),
        ("Javid Huseynli", "javid.huseynli", "Operations", "Facilities Manager", 0.4, 47.0),
        ("Zahra Novruzova", "zahra.novruzova", "Operations", "Procurement Officer", 0.6, 55.0),
        ("Anar Suleymanov", "anar.suleymanov", "Operations", "Office Coordinator", 0.3, 26.0),
        ("Vusal Abbasov", "vusal.abbasov", "Executive Office", "Chief Financial Officer", 1.0, 42.0),
        ("Konul Hajiyeva", "konul.hajiyeva", "Executive Office", "Chief Executive Officer", 1.0, 36.0),
        ("Ilkin Mustafayev", "ilkin.mustafayev", "Executive Office", "Executive Assistant", 0.9, 59.0),
        ("Aytan Guliyeva", "aytan.guliyeva", "Engineering", "Engineering Manager", 0.7, 22.0),
        ("Samir Aliyev", "samir.aliyev", "Finance", "Treasury Analyst", 0.9, 50.0),
        ("Fidan Isgandarova", "fidan.isgandarova", "Sales", "Customer Success", 0.4, 30.0),
    ]
    employees: dict[str, Employee] = {}
    for name, local, dept, title, sensitivity, risk in employee_specs:
        emp = Employee(
            name=name,
            email=f"{local}@caspiandynamics.az",
            department_id=departments[dept].id,
            role_title=title,
            role_sensitivity=sensitivity,
            current_risk_score=risk,
            created_at=days_ago(400),
        )
        db.add(emp)
        employees[local] = emp
    db.flush()

    # ---------------------------------------------------------------- users
    db.add_all(
        [
            User(email="analyst@caspiandynamics.az", hashed_password=hash_password("analyst123"), role=Role.ANALYST),
            User(email="exec@caspiandynamics.az", hashed_password=hash_password("exec123"), role=Role.EXECUTIVE),
            User(email="leyla.aliyeva@caspiandynamics.az", hashed_password=hash_password("demo123"), role=Role.EMPLOYEE, employee_id=employees["leyla.aliyeva"].id),
            User(email="rashad.mammadov@caspiandynamics.az", hashed_password=hash_password("demo123"), role=Role.EMPLOYEE, employee_id=employees["rashad.mammadov"].id),
            User(email="aysel.huseynova@caspiandynamics.az", hashed_password=hash_password("demo123"), role=Role.EMPLOYEE, employee_id=employees["aysel.huseynova"].id),
        ]
    )

    # ------------------------------------------------- metric history (6 mo)
    # Story: the loop went live ~5 months ago; click rate falls, report rate
    # rises, avg risk drifts down, completion climbs. Slight noise for realism.
    for week in range(26, -1, -1):
        progress = (26 - week) / 26.0
        db.add(
            MetricSnapshot(
                date=days_ago(week * 7),
                phishing_click_rate=round(max(0.10, 0.34 - 0.23 * progress + rng.uniform(-0.02, 0.02)), 3),
                report_rate=round(min(0.60, 0.08 + 0.28 * progress + rng.uniform(-0.02, 0.02)), 3),
                avg_risk_score=round(59.0 - 16.0 * progress + rng.uniform(-1.5, 1.5), 1),
                training_completion_rate=round(min(0.97, 0.42 + 0.45 * progress + rng.uniform(-0.03, 0.03)), 3),
            )
        )

    # -------------------------------------------------- historical risk events
    def event(emp: Employee, type_: str, delta: float, reason: str, at: datetime, run_id: int | None = None):
        db.add(RiskEvent(employee_id=emp.id, type=type_, delta=delta, reason=reason, created_at=at, loop_run_id=run_id))

    # Repeat clickers (they explain today's high scores)
    for local, sims_clicked in [("rashad.mammadov", 3), ("elvin.quliyev", 2), ("tural.hasanov", 2), ("sevinj.rahimova", 2), ("ilkin.mustafayev", 1), ("zahra.novruzova", 1)]:
        for i in range(sims_clicked):
            event(employees[local], "simulated_phish_click", 12.0, f"Clicked lure in Q{2 + i} awareness simulation", days_ago(30 + i * 35, rng.uniform(0, 12)))
    # Good reporters — with matching PhishingReport records (drives report
    # badges & the human-sensor metric), closed as dismissed so they don't
    # crowd the live triage queue.
    reporter_samples = [
        ("Suspicious 'shared document' link from an unknown sender", "email"),
        ("Text message about a prize I never entered", "sms"),
        ("QR code taped over the cafeteria menu board", "qr"),
        ("Teams message from 'IT' asking me to confirm my password", "chat"),
    ]
    for local, count in [("aysel.huseynova", 5), ("nigar.karimova", 3), ("gunel.safarova", 2), ("aytan.guliyeva", 3), ("lala.ahmadova", 1), ("anar.suleymanov", 1)]:
        for i in range(count):
            event(employees[local], "simulated_phish_report", -5.0, "Reported simulation lure within minutes", days_ago(25 + i * 28, rng.uniform(0, 12)))
            sample_text, sample_type = reporter_samples[i % len(reporter_samples)]
            db.add(PhishingReport(
                employee_id=employees[local].id,
                artifact_type=sample_type,
                artifact_ref=sample_text,
                note="",
                status=ReportStatus.DISMISSED,
                created_at=days_ago(20 + i * 12, rng.uniform(0, 12)),
            ))
            if i % 2 == 0:
                event(employees[local], "real_threat_report", -4.0, "Reported a suspicious external email", days_ago(20 + i * 31, rng.uniform(0, 12)))
    # Past training completions — with matching completed assignments (drives
    # the Fast Learner / Perfect Score / Streak badges).
    past_completions = [
        ("leyla.aliyeva", 100.0), ("rashad.mammadov", 100.0), ("tural.hasanov", 80.0),
        ("sevinj.rahimova", 80.0), ("aysel.huseynova", 100.0), ("murad.nasirov", 80.0),
        ("samir.aliyev", 100.0), ("javid.huseynli", 80.0), ("aytan.guliyeva", 100.0),
        ("nigar.karimova", 100.0),
    ]
    for local, score in past_completions:
        event(employees[local], "training_completed", -4.0, 'Completed "Invoice fraud: the pressure play"', days_ago(52, rng.uniform(0, 10)))
        event(employees[local], "training_comprehension", round(-6.0 * score / 100, 2), f"Quiz comprehension {score:.0f}%", days_ago(52, rng.uniform(0, 10)))

    # ------------------------------------------------------- past loop run #1
    threat1 = Threat(
        source=ThreatSource.HUMAN_SENSOR,
        artifact_type="email",
        artifact_ref=(
            "From: billing@azconnect-telecom.xyz\nSubject: URGENT: Your corporate line will be suspended\n\n"
            "Dear customer, unusual activity was detected on your corporate account. "
            "To avoid suspension you must verify your identity within 4 hours: "
            "https://azconnect-telecom.xyz/verify?acc=cd-8841 . Failure to act will result in service interruption."
        ),
        artifact_meta={"sender": "billing@azconnect-telecom.xyz", "subject": "URGENT: Your corporate line will be suspended", "recipients": ["tural.hasanov@caspiandynamics.az", "elvin.quliyev@caspiandynamics.az"]},
        title="Fake telecom suspension notice",
        verdict="malicious",
        confidence=0.93,
        threat_type="phishing",
        iocs={"urls": ["https://azconnect-telecom.xyz/verify?acc=cd-8841"], "domains": ["azconnect-telecom.xyz"], "hashes": [], "sender_patterns": ["billing@azconnect-telecom.xyz"]},
        behavior_summary="Lure impersonates a telecom provider and pressures the user to act fast. Embedded link redirects to a credential-harvesting page. Lookalike domain detected: azconnect-telecom.xyz.",
        analysis_result={"engine": "Cyclowareness MockSandbox v2.1", "sandbox_score": 9.1, "mitre_techniques": ["T1566.002 Spearphishing Link", "T1056 Input Capture"]},
        explanation="This was a fake message designed to steal passwords. It pretended to be a telecom provider and tried to rush the reader into verifying their account on a copycat page controlled by the attacker.",
        reported_by_employee_id=employees["nigar.karimova"].id,
        created_at=days_ago(21),
    )
    db.add(threat1)
    db.flush()

    module1 = TrainingModule(
        threat_id=threat1.id,
        title="Spotting the credential trap: the fake telecom suspension",
        description="Built from a real phishing email reported inside our company on the same day.",
        content=[
            {"heading": "What just happened", "body": "A real phishing email reached Finance. It posed as our telecom provider, claimed the corporate line would be suspended, and pushed a 4-hour deadline to 'verify' credentials on azconnect-telecom.xyz — a fake page."},
            {"heading": "How to spot it", "body": "The sender domain (azconnect-telecom.xyz) is not our provider's real domain; the link destination didn't match the claimed brand; and the artificial deadline is a pressure tactic real providers don't use."},
            {"heading": "What attackers wanted", "body": "One set of working credentials to read mail and pivot into payment systems."},
            {"heading": "Your move next time", "body": "Never log in through a link in a message. Open the provider's site from bookmarks, then hit Report — you become the company's sensor."},
        ],
        quiz=[
            {"question": "An email threatens suspension in 4 hours unless you verify. Safest first move?", "options": ["Click and verify quickly", "Open the service from a bookmark and check", "Reply to ask if it's real", "Ignore all telecom emails forever"], "correct_index": 1, "explanation": "Direct navigation bypasses fake links; deadlines are pressure tactics."},
            {"question": "The link goes to azconnect-telecom.xyz. Why does that matter?", "options": ["It doesn't", "Real destination doesn't match the claimed sender — classic phish", "xyz domains are always fine", "It's an IT redirect"], "correct_index": 1, "explanation": "Destination/identity mismatch is the strongest tell."},
            {"question": "You clicked before thinking. Now what?", "options": ["Say nothing", "Delete the email", "Change password and report immediately", "Turn off the computer"], "correct_index": 2, "explanation": "Fast reporting shrinks the attacker's window."},
        ],
        takeaway="Links take you where attackers want; bookmarks take you where YOU want.",
        channel="email",
        est_minutes=3,
        ai_generated=True,
        generation_source="mock",
        status=ModuleStatus.APPROVED,
        approved_by="analyst@caspiandynamics.az",
        created_at=days_ago(21),
    )
    db.add(module1)
    db.flush()

    run1 = LoopRun(
        trigger_threat_id=threat1.id,
        current_stage=7,
        status=LoopStatus.COMPLETED,
        training_module_id=module1.id,
        stage_history=_fabricated_history(days_ago(21), [
            "Artifact reported by an employee (human sensor)",
            "Verdict: malicious (phishing), confidence 93%, 3 IOCs extracted",
            'AI generated module "Spotting the credential trap: the fake telecom suspension" (3 quiz questions)',
            "4 at-risk employees selected (targeted, not blasted)",
            "Micro-training assigned to 4 employees; awaiting completion",
            "4/4 completed, avg quiz score 83%, net risk change -13.6",
            "Risk model updated — Finance 52, Sales 55, Human Resources 48 — next targeting will use the new scores",
        ]),
        targeting=[
            {"employee_id": employees["tural.hasanov"].id, "name": "Tural Hasanov", "department_id": departments["Finance"].id, "risk_score": 70.0, "reasons": ["Received this artifact", "Recently clicked a simulated phishing lure", "High risk score (70)"]},
            {"employee_id": employees["elvin.quliyev"].id, "name": "Elvin Quliyev", "department_id": departments["Finance"].id, "risk_score": 74.0, "reasons": ["Received this artifact", "High risk score (74)"]},
            {"employee_id": employees["rashad.mammadov"].id, "name": "Rashad Mammadov", "department_id": departments["Sales"].id, "risk_score": 78.0, "reasons": ["Recently clicked a simulated phishing lure", "High risk score (78)"]},
            {"employee_id": employees["samir.aliyev"].id, "name": "Samir Aliyev", "department_id": departments["Finance"].id, "risk_score": 55.0, "reasons": ["Works in an exposed department"]},
        ],
        measure_summary={
            "assigned": 4, "completed": 4, "completion_rate": 1.0, "avg_score": 83.3,
            "avg_time_seconds": 174, "risk_delta_total": -13.6,
            "per_employee": [
                {"employee_id": employees["tural.hasanov"].id, "name": "Tural Hasanov", "status": "completed", "score": 100.0, "risk_delta": -2.0, "risk_score_now": 68.0},
                {"employee_id": employees["elvin.quliyev"].id, "name": "Elvin Quliyev", "status": "completed", "score": 66.7, "risk_delta": 0.0, "risk_score_now": 74.0},
                {"employee_id": employees["rashad.mammadov"].id, "name": "Rashad Mammadov", "status": "completed", "score": 100.0, "risk_delta": -2.0, "risk_score_now": 76.0},
                {"employee_id": employees["samir.aliyev"].id, "name": "Samir Aliyev", "status": "completed", "score": 66.7, "risk_delta": 0.0, "risk_score_now": 55.0},
            ],
        },
        created_at=days_ago(21),
        completed_at=days_ago(19.4),
    )
    db.add(run1)
    db.flush()

    for local, score, minutes_spent in [("tural.hasanov", 100.0, 3), ("elvin.quliyev", 66.7, 4), ("rashad.mammadov", 100.0, 2), ("samir.aliyev", 66.7, 3)]:
        emp = employees[local]
        db.add(TrainingAssignment(
            module_id=module1.id, employee_id=emp.id, loop_run_id=run1.id,
            status=AssignmentStatus.COMPLETED, score=score, time_spent_seconds=minutes_spent * 60,
            targeting_reasons=next(t["reasons"] for t in run1.targeting if t["employee_id"] == emp.id),
            assigned_at=days_ago(20.9), completed_at=days_ago(19.8, rng.uniform(0, 8)),
        ))
        event(emp, "real_threat_exposure", 8.0, 'Exposed to real threat "Fake telecom suspension notice"', days_ago(20.9), run1.id)
        event(emp, "training_completed", -4.0, f'Completed "{module1.title}"', days_ago(19.8), run1.id)
        if score >= 60:
            event(emp, "training_comprehension", round(-6.0 * score / 100, 2), f"Quiz comprehension {score:.0f}%", days_ago(19.8), run1.id)

    # ------------------------------------------------------- past loop run #2
    threat2 = Threat(
        source=ThreatSource.FEED,
        artifact_type="email",
        artifact_ref=(
            "From: k.hajiyeva-ceo@secure-caspian.online\nSubject: Confidential — urgent vendor payment\n\n"
            "I need you to process a wire transfer today for the Guangzhou expansion deal. "
            "New beneficiary details attached. Keep this between us until the announcement. — Konul"
        ),
        artifact_meta={"sender": "k.hajiyeva-ceo@secure-caspian.online", "subject": "Confidential — urgent vendor payment", "targeted_departments": ["Finance"]},
        title="CEO impersonation wire-fraud attempt",
        verdict="malicious",
        confidence=0.91,
        threat_type="bec",
        iocs={"urls": [], "domains": ["secure-caspian.online"], "hashes": [], "sender_patterns": ["k.hajiyeva-ceo@secure-caspian.online"]},
        behavior_summary="Message imitates the CEO and requests an urgent confidential wire transfer with changed bank details; no payload — pure social engineering.",
        analysis_result={"engine": "Cyclowareness MockSandbox v2.1", "sandbox_score": 8.7, "mitre_techniques": ["T1534 Internal Spearphishing", "T1657 Financial Theft"]},
        explanation="This was a con, not a virus. Someone impersonated our CEO to pressure an urgent, confidential payment to a new bank account.",
        created_at=days_ago(9),
    )
    db.add(threat2)
    db.flush()

    module2 = TrainingModule(
        threat_id=threat2.id,
        title="The fake executive: recognising payment-fraud email",
        description="Built from a real CEO-impersonation attempt targeting our Finance team.",
        content=[
            {"heading": "What just happened", "body": "An email posing as our CEO (from secure-caspian.online — not our domain) asked Finance for an urgent, confidential wire transfer with new bank details. No malware — the whole attack was persuasion."},
            {"heading": "How to spot it", "body": "Authority (the CEO's name), urgency (today), secrecy (keep this between us), and changed payment details. All four together is the BEC signature."},
            {"heading": "What attackers wanted", "body": "One approved transfer. BEC steals more money globally than ransomware."},
            {"heading": "Your move next time", "body": "Verify any payment-detail change on a second channel you already trust — call the known number, never the one in the email."},
        ],
        quiz=[
            {"question": "The 'CEO' emails: urgent confidential transfer, new IBAN, today. Best response?", "options": ["Execute — it's the CEO", "Verify by calling the CEO's known number", "Reply asking for confirmation", "Wait a day"], "correct_index": 1, "explanation": "Out-of-band verification defeats BEC."},
            {"question": "What makes BEC hard for filters to catch?", "options": ["New malware", "No links or attachments — just persuasive text", "Sent at night", "Targets only IT"], "correct_index": 1, "explanation": "Pure social engineering has no payload to detect."},
            {"question": "Which combination is the BEC signature?", "options": ["Authority + urgency + payment change", "Long email + attachment", "Unknown sender + typos", "Internal sender + invite"], "correct_index": 0, "explanation": "That triple is the manipulation chain."},
        ],
        takeaway="Money moves only after a second-channel check.",
        channel="email",
        est_minutes=3,
        ai_generated=True,
        generation_source="mock",
        status=ModuleStatus.APPROVED,
        approved_by="analyst@caspiandynamics.az",
        created_at=days_ago(9),
    )
    db.add(module2)
    db.flush()

    run2 = LoopRun(
        trigger_threat_id=threat2.id,
        current_stage=7,
        status=LoopStatus.COMPLETED,
        training_module_id=module2.id,
        stage_history=_fabricated_history(days_ago(9), [
            "Artifact pushed from the threat intel feed",
            "Verdict: malicious (bec), confidence 91%, 2 IOCs extracted",
            'AI generated module "The fake executive: recognising payment-fraud email" (3 quiz questions)',
            "5 at-risk employees selected (targeted, not blasted)",
            "Micro-training assigned to 5 employees; awaiting completion",
            "4/5 completed, avg quiz score 91%, net risk change -1.9",
            "Risk model updated — Finance 50, Executive Office 46, Sales 54 — next targeting will use the new scores",
        ]),
        targeting=[
            {"employee_id": employees["leyla.aliyeva"].id, "name": "Leyla Aliyeva", "department_id": departments["Finance"].id, "risk_score": 50.0, "reasons": ["Works in an exposed department"]},
            {"employee_id": employees["tural.hasanov"].id, "name": "Tural Hasanov", "department_id": departments["Finance"].id, "risk_score": 68.0, "reasons": ["Works in an exposed department", "High risk score (68)"]},
            {"employee_id": employees["elvin.quliyev"].id, "name": "Elvin Quliyev", "department_id": departments["Finance"].id, "risk_score": 74.0, "reasons": ["Works in an exposed department", "High risk score (74)"]},
            {"employee_id": employees["vusal.abbasov"].id, "name": "Vusal Abbasov", "department_id": departments["Executive Office"].id, "risk_score": 44.0, "reasons": ["Directly targeted by this artifact"]},
            {"employee_id": employees["ilkin.mustafayev"].id, "name": "Ilkin Mustafayev", "department_id": departments["Executive Office"].id, "risk_score": 61.0, "reasons": ["High risk score (61)"]},
        ],
        measure_summary={
            "assigned": 5, "completed": 4, "completion_rate": 0.8, "avg_score": 91.7,
            "avg_time_seconds": 156, "risk_delta_total": -1.9,
            "per_employee": [
                {"employee_id": employees["leyla.aliyeva"].id, "name": "Leyla Aliyeva", "status": "completed", "score": 100.0, "risk_delta": -2.0, "risk_score_now": 48.0},
                {"employee_id": employees["tural.hasanov"].id, "name": "Tural Hasanov", "status": "completed", "score": 100.0, "risk_delta": -2.0, "risk_score_now": 66.0},
                {"employee_id": employees["elvin.quliyev"].id, "name": "Elvin Quliyev", "status": "completed", "score": 66.7, "risk_delta": 0.0, "risk_score_now": 71.0},
                {"employee_id": employees["vusal.abbasov"].id, "name": "Vusal Abbasov", "status": "completed", "score": 100.0, "risk_delta": -2.0, "risk_score_now": 42.0},
                {"employee_id": employees["ilkin.mustafayev"].id, "name": "Ilkin Mustafayev", "status": "expired", "score": None, "risk_delta": 4.0, "risk_score_now": 59.0},
            ],
        },
        created_at=days_ago(9),
        completed_at=days_ago(6.5),
    )
    db.add(run2)
    db.flush()

    for local, score in [("leyla.aliyeva", 100.0), ("tural.hasanov", 100.0), ("elvin.quliyev", 66.7), ("vusal.abbasov", 100.0)]:
        emp = employees[local]
        db.add(TrainingAssignment(
            module_id=module2.id, employee_id=emp.id, loop_run_id=run2.id,
            status=AssignmentStatus.COMPLETED, score=score, time_spent_seconds=rng.randint(120, 240),
            targeting_reasons=next(t["reasons"] for t in run2.targeting if t["employee_id"] == emp.id),
            assigned_at=days_ago(8.8), completed_at=days_ago(7, rng.uniform(0, 10)),
        ))
        event(emp, "real_threat_exposure", 8.0, 'Exposed to real threat "CEO impersonation wire-fraud attempt"', days_ago(8.8), run2.id)
        event(emp, "training_completed", -4.0, f'Completed "{module2.title}"', days_ago(7), run2.id)
        if score >= 60:
            event(emp, "training_comprehension", round(-6.0 * score / 100, 2), f"Quiz comprehension {score:.0f}%", days_ago(7), run2.id)
    db.add(TrainingAssignment(
        module_id=module2.id, employee_id=employees["ilkin.mustafayev"].id, loop_run_id=run2.id,
        status=AssignmentStatus.EXPIRED,
        targeting_reasons=["High risk score (61)"],
        assigned_at=days_ago(8.8),
    ))
    event(employees["ilkin.mustafayev"], "real_threat_exposure", 8.0, 'Exposed to real threat "CEO impersonation wire-fraud attempt"', days_ago(8.8), run2.id)
    event(employees["ilkin.mustafayev"], "training_ignored", 4.0, "Assigned micro-training expired uncompleted", days_ago(6.5), run2.id)

    # ------------------------------------------------------------ simulations
    sim1 = PhishingSimulation(
        name="Q2 credential-harvest drill (real telecom lure)",
        template_threat_id=threat1.id,
        channel="email",
        status=SimulationStatus.COMPLETED,
        launched_at=days_ago(14),
        completed_at=days_ago(12),
        created_by="analyst@caspiandynamics.az",
        created_at=days_ago(14.2),
    )
    db.add(sim1)
    db.flush()
    sim1_outcomes = [
        ("rashad.mammadov", SimOutcome.CLICKED), ("elvin.quliyev", SimOutcome.CLICKED),
        ("sevinj.rahimova", SimOutcome.CLICKED), ("zahra.novruzova", SimOutcome.IGNORED),
        ("aysel.huseynova", SimOutcome.REPORTED), ("nigar.karimova", SimOutcome.REPORTED),
        ("aytan.guliyeva", SimOutcome.REPORTED), ("gunel.safarova", SimOutcome.REPORTED),
        ("leyla.aliyeva", SimOutcome.REPORTED), ("tural.hasanov", SimOutcome.IGNORED),
        ("murad.nasirov", SimOutcome.IGNORED), ("javid.huseynli", SimOutcome.CLICKED),
        ("farid.jafarov", SimOutcome.IGNORED), ("aida.valiyeva", SimOutcome.REPORTED),
    ]
    for local, outcome in sim1_outcomes:
        db.add(SimulationTarget(
            simulation_id=sim1.id, employee_id=employees[local].id,
            outcome=outcome, outcome_at=days_ago(13, rng.uniform(0, 20)),
        ))
        if outcome == SimOutcome.CLICKED:
            event(employees[local], "simulated_phish_click", 12.0, f'Clicked lure in simulation "{sim1.name}"', days_ago(13, rng.uniform(0, 20)))
        elif outcome == SimOutcome.REPORTED:
            event(employees[local], "simulated_phish_report", -5.0, f'Reported lure in simulation "{sim1.name}"', days_ago(13, rng.uniform(0, 20)))

    sim2 = PhishingSimulation(
        name="BEC wire-fraud drill — Finance & Exec (real CEO lure)",
        template_threat_id=threat2.id,
        channel="email",
        status=SimulationStatus.ACTIVE,
        launched_at=days_ago(1.5),
        created_by="analyst@caspiandynamics.az",
        created_at=days_ago(2),
    )
    db.add(sim2)
    db.flush()
    sim2_targets = [
        ("leyla.aliyeva", SimOutcome.REPORTED), ("tural.hasanov", SimOutcome.PENDING),
        ("nigar.karimova", SimOutcome.REPORTED), ("elvin.quliyev", SimOutcome.CLICKED),
        ("samir.aliyev", SimOutcome.PENDING), ("vusal.abbasov", SimOutcome.PENDING),
        ("ilkin.mustafayev", SimOutcome.PENDING), ("konul.hajiyeva", SimOutcome.PENDING),
    ]
    for local, outcome in sim2_targets:
        target = SimulationTarget(simulation_id=sim2.id, employee_id=employees[local].id, outcome=outcome)
        if outcome != SimOutcome.PENDING:
            target.outcome_at = days_ago(1, rng.uniform(0, 10))
            if outcome == SimOutcome.CLICKED:
                event(employees[local], "simulated_phish_click", 12.0, f'Clicked lure in simulation "{sim2.name}"', days_ago(1, rng.uniform(0, 10)))
            else:
                event(employees[local], "simulated_phish_report", -5.0, f'Reported lure in simulation "{sim2.name}"', days_ago(1, rng.uniform(0, 10)))
        db.add(target)

    # Champion completed assignments (unlinked to a run) so the badge & points
    # systems have something to reward from the first login.
    champion_completions = [
        ("aysel.huseynova", module1, 100.0), ("aysel.huseynova", module2, 100.0),
        ("nigar.karimova", module1, 100.0), ("nigar.karimova", module2, 80.0),
        ("aytan.guliyeva", module1, 100.0), ("gunel.safarova", module1, 80.0),
        ("kamran.ismayilov", module1, 100.0), ("sabina.mammadli", module2, 80.0),
    ]
    for local, module, score in champion_completions:
        db.add(TrainingAssignment(
            module_id=module.id, employee_id=employees[local].id, loop_run_id=None,
            status=AssignmentStatus.COMPLETED, score=score,
            time_spent_seconds=rng.randint(120, 260),
            targeting_reasons=["Proactive awareness assignment"],
            assigned_at=days_ago(40, rng.uniform(0, 10)),
            completed_at=days_ago(39, rng.uniform(0, 10)),
        ))

    # ------------------------------------------------ open reports (triage queue)
    db.add(PhishingReport(
        employee_id=employees["gunel.safarova"].id,
        artifact_type="qr",
        artifact_ref="Poster in the parking garage: 'New employee parking registration — scan to register your plate' → https://cd-parking-portal.site/register",
        artifact_meta={"location": "Parking garage, level -1"},
        note="This poster appeared overnight, nobody in Operations knows about it.",
        status=ReportStatus.NEW,
        triage_summary={
            "summary": "QR code delivers a link to a non-corporate domain imitating an internal service. Physical placement suggests a targeted quishing attempt against staff.",
            "suspicion_level": "high",
            "indicators": ["Non-corporate domain: cd-parking-portal.site", "Unannounced physical QR placement", "Imitates an internal employee service"],
            "likely_iocs": {"urls": ["https://cd-parking-portal.site/register"], "domains": ["cd-parking-portal.site"], "sender_patterns": []},
            "recommended_action": "Push into the loop for sandbox analysis and targeted training.",
        },
        created_at=days_ago(0.3),
    ))
    db.add(PhishingReport(
        employee_id=employees["lala.ahmadova"].id,
        artifact_type="chat",
        artifact_ref="Teams message from 'IT Helpdesk (external)': We are migrating mailboxes tonight. Please confirm your password at https://caspian-migrate.top/sso so you don't lose access.",
        artifact_meta={"sender": "IT Helpdesk (external)", "platform": "Teams"},
        note="The real helpdesk never asks for passwords, right?",
        status=ReportStatus.NEW,
        triage_summary={
            "summary": "Chat-based credential phish impersonating the internal helpdesk with an external lookalike domain and a same-day deadline.",
            "suspicion_level": "high",
            "indicators": ["Requests credential confirmation", "Lookalike domain: caspian-migrate.top", "External account posing as internal IT", "Manufactured urgency (tonight)"],
            "likely_iocs": {"urls": ["https://caspian-migrate.top/sso"], "domains": ["caspian-migrate.top"], "sender_patterns": ["IT Helpdesk (external)"]},
            "recommended_action": "Push into the loop for sandbox analysis and targeted training.",
        },
        created_at=days_ago(0.1),
    ))

    # --------------------------------------------------------------- intel feed
    feed_items = [
        FeedItem(
            title="Wave of QR 'parking fine' lures hitting Baku offices",
            summary="Regional CERT reports laminated QR posters and windshield flyers directing victims to credential-harvesting portals styled as municipal payment pages.",
            threat_type="quishing", severity="high", source_name="CERT.GOV.AZ advisory",
            published_at=days_ago(0.8),
            iocs={"domains": ["baku-parking-pay.site", "azpark-fine.online"]},
            artifact_example="Scan to pay your parking fine within 48 hours: https://baku-parking-pay.site/fine?id=88213 — Baku Transport Agency",
            artifact_type="qr",
        ),
        FeedItem(
            title="Energy-sector BEC campaign impersonating procurement chiefs",
            summary="Threat actors register lookalike domains of Caspian-region energy firms and request urgent beneficiary changes on open invoices. Losses reported in 6 companies.",
            threat_type="bec", severity="critical", source_name="Industry ISAC bulletin",
            published_at=days_ago(1.6),
            iocs={"domains": ["secure-caspian.online", "caspian-proc.top"], "sender_patterns": ["*-ceo@*", "procurement-*@*"]},
            artifact_example="From: procurement-chief@caspian-proc.top\nSubject: Beneficiary update — invoice #INV-2214\n\nPlease update the beneficiary account for the attached open invoice before Friday's payment run. Treat as confidential.",
            artifact_type="email",
        ),
        FeedItem(
            title="Smishing surge: fake customs-fee texts around Guangzhou trade fair",
            summary="Attendees of Guangzhou trade events receive SMS about held packages requiring small customs payments; pages harvest card data and OTP codes.",
            threat_type="smishing", severity="high", source_name="GSMA fraud watch",
            published_at=days_ago(2.5),
            iocs={"domains": ["cn-customs-fee.link", "gz-parcel.top"]},
            artifact_example="[Customs] Your parcel GZ-77120 is held. Pay 3.50 fee to release: https://cn-customs-fee.link/gz77120 . Unpaid parcels return after 24h.",
            artifact_type="sms",
        ),
        FeedItem(
            title="Macro-laden 'salary revision' documents targeting HR teams",
            summary="HR departments receive tailored .docm files claiming to contain salary benchmark data; enabling macros drops a loader with registry persistence.",
            threat_type="malware", severity="high", source_name="VirusBulletin telemetry",
            published_at=days_ago(4),
            iocs={"hashes": ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"], "domains": ["hr-benchmarks.info"]},
            artifact_example="Subject: 2026 salary revision benchmarks (confidential)\nAttachment: salary_revision_2026.docm — Please enable content to view the comparison tables.",
            artifact_type="email",
        ),
        FeedItem(
            title="Teams/Slack helpdesk impersonation with OAuth consent phishing",
            summary="Attackers join workspaces via compromised vendor accounts, pose as IT helpdesk and push 'mailbox migration' consent links granting mail.read scope.",
            threat_type="phishing", severity="medium", source_name="Microsoft MSTIC",
            published_at=days_ago(6),
            iocs={"domains": ["caspian-migrate.top", "m365-verify.online"]},
            artifact_example="IT Helpdesk: We are migrating mailboxes tonight. Confirm access here to avoid interruption: https://m365-verify.online/consent",
            artifact_type="chat",
        ),
        FeedItem(
            title="Deepfake voice callbacks added to invoice-fraud playbooks",
            summary="Following a BEC email, targets receive a WhatsApp voice note cloned from public executive interviews to 'confirm' the payment instruction.",
            threat_type="bec", severity="medium", source_name="Europol IOCTA preview",
            published_at=days_ago(8),
            iocs={"sender_patterns": ["whatsapp:+44*", "whatsapp:+86*"]},
            artifact_example="Voice note transcript: 'Hi, it's really me — please push the transfer we discussed by email today, the deal depends on it.'",
            artifact_type="chat",
        ),
    ]
    db.add_all(feed_items)

    # --------------------------------- a run awaiting approval (demo star-state)
    threat3 = Threat(
        source=ThreatSource.HUMAN_SENSOR,
        artifact_type="email",
        artifact_ref=(
            "From: no-reply@m365-account-verify.online\nSubject: Action required: mailbox storage full\n\n"
            "Your mailbox has exceeded its storage limit. Messages are being rejected. "
            "Sign in now to expand your quota: https://m365-account-verify.online/quota?u=cd . "
            "This link expires in 6 hours."
        ),
        artifact_meta={"sender": "no-reply@m365-account-verify.online", "subject": "Action required: mailbox storage full", "recipients": ["sevinj.rahimova@caspiandynamics.az"]},
        title="Fake mailbox-quota credential phish",
        verdict="malicious",
        confidence=0.94,
        threat_type="phishing",
        iocs={"urls": ["https://m365-account-verify.online/quota?u=cd"], "domains": ["m365-account-verify.online"], "hashes": [], "sender_patterns": ["no-reply@m365-account-verify.online"]},
        behavior_summary="Lure impersonates Microsoft 365 and pressures the user to act fast. Embedded link redirects to a credential-harvesting page. Lookalike domain detected: m365-account-verify.online.",
        analysis_result={"engine": "Cyclowareness MockSandbox v2.1", "sandbox_score": 9.3, "mitre_techniques": ["T1566.002 Spearphishing Link", "T1056 Input Capture"]},
        explanation="This was a fake storage warning designed to steal work passwords. It pretended to be Microsoft and pushed a 6-hour deadline to sign in on a copycat page. The giveaway: the sign-in link doesn't lead to Microsoft at all.",
        reported_by_employee_id=employees["sevinj.rahimova"].id,
        created_at=days_ago(0.05),
    )
    db.add(threat3)
    db.flush()

    module3 = TrainingModule(
        threat_id=threat3.id,
        title="The full-mailbox trick: fake Microsoft 365 quota alerts",
        description="You're receiving this because a real phishing attempt just targeted people in roles like yours. This 3-minute module shows exactly how it worked.",
        content=[
            {"heading": "What just happened", "body": "A real phishing email reached our company claiming mailboxes were full and messages were being rejected. The 'sign in to fix it' link led to m365-account-verify.online — a fake Microsoft login page built to steal passwords."},
            {"heading": "How to spot it", "body": "Three tells: the sender domain isn't Microsoft's; the link destination (m365-account-verify.online) doesn't match the claimed brand; and the 6-hour deadline manufactures panic. Microsoft never expires storage warnings by the hour."},
            {"heading": "What attackers wanted", "body": "Your work password. With it, attackers read mail, reset other accounts and impersonate you to colleagues — all invisibly."},
            {"heading": "Your move next time", "body": "Never sign in through a link in an email. Open office.com from your bookmarks and check there. Then hit Report — one click protects everyone."},
        ],
        quiz=[
            {"question": "An email says your mailbox is full and gives a sign-in link. Safest first move?", "options": ["Sign in quickly before mail is lost", "Open office.com from a bookmark and check", "Forward it to a colleague", "Reply to the sender"], "correct_index": 1, "explanation": "Direct navigation bypasses any fake link."},
            {"question": "The link goes to m365-account-verify.online. What does that tell you?", "options": ["Nothing", "It's a Microsoft testing domain", "Destination doesn't match the claimed brand — phishing", "It's safe because of https"], "correct_index": 2, "explanation": "Brand/destination mismatch is the strongest tell."},
            {"question": "Why do attackers add '6-hour' deadlines?", "options": ["Servers really expire", "Panic makes people skip verification", "Legal requirement", "To seem organised"], "correct_index": 1, "explanation": "Urgency is a manipulation primitive."},
            {"question": "You entered your password on such a page. What now?", "options": ["Nothing, it's probably fine", "Change the password and report immediately", "Delete the email", "Wait to see if anything happens"], "correct_index": 1, "explanation": "Fast rotation + reporting shrinks the attacker's window."},
        ],
        takeaway="A storage warning with a countdown is a phish. Bookmarks beat links, every time.",
        channel="email",
        est_minutes=3,
        ai_generated=True,
        generation_source="mock",
        status=ModuleStatus.PENDING_REVIEW,
        created_at=days_ago(0.04),
    )
    db.add(module3)
    db.flush()

    report3 = PhishingReport(
        employee_id=employees["sevinj.rahimova"].id,
        artifact_type="email",
        artifact_ref=threat3.artifact_ref,
        artifact_meta=threat3.artifact_meta,
        note="Looked real at first, but we just got storage upgrades last month…",
        status=ReportStatus.IN_LOOP,
        triage_summary={
            "summary": "Credential phish impersonating Microsoft 365 with a lookalike domain and hard deadline.",
            "suspicion_level": "high",
            "indicators": ["Lookalike domain m365-account-verify.online", "Credential verification request", "6-hour deadline pressure"],
            "likely_iocs": {"urls": ["https://m365-account-verify.online/quota?u=cd"], "domains": ["m365-account-verify.online"], "sender_patterns": ["no-reply@m365-account-verify.online"]},
            "recommended_action": "Push into the loop for sandbox analysis and targeted training.",
        },
        linked_threat_id=threat3.id,
        created_at=days_ago(0.05),
    )
    db.add(report3)
    db.flush()

    run3_start = days_ago(0.05)
    run3 = LoopRun(
        trigger_threat_id=threat3.id,
        current_stage=3,
        status=LoopStatus.AWAITING_APPROVAL,
        training_module_id=module3.id,
        report_id=report3.id,
        stage_history=[
            {"stage": 1, "name": "ingest", "status": "completed", "started_at": run3_start.isoformat(), "completed_at": run3_start.isoformat(), "detail": "Artifact reported by an employee (human sensor)", "error": None},
            {"stage": 2, "name": "analyze", "status": "completed", "started_at": (run3_start + timedelta(seconds=4)).isoformat(), "completed_at": (run3_start + timedelta(seconds=11)).isoformat(), "detail": "Verdict: malicious (phishing), confidence 94%, 3 IOCs extracted", "error": None},
            {"stage": 3, "name": "convert", "status": "completed", "started_at": (run3_start + timedelta(seconds=11)).isoformat(), "completed_at": (run3_start + timedelta(seconds=19)).isoformat(), "detail": 'AI generated module "The full-mailbox trick: fake Microsoft 365 quota alerts" (4 quiz questions)', "error": None},
        ],
        created_at=run3_start,
    )
    db.add(run3)
    db.flush()
    report3.linked_loop_run_id = run3.id

    _reconcile_scores_with_audit_trail(db, employees.values())

    db.commit()
    logger.info("Seed complete: %d employees, 6 departments, 3 loop runs, 2 simulations", len(employee_specs))


def _reconcile_scores_with_audit_trail(db: Session, employees) -> None:
    """Make every seeded score derivable from its own events.

    The demo scores are hand-chosen so the roster tells a story (Rashad is the
    high-risk account executive, Aysel the model citizen) while the seeded
    RiskEvents are written independently. That left the employee drawer showing
    "Score breakdown (explainable)" summing to one number directly beneath a
    "Current risk score" showing another — on every one of the 26 employees.

    Explainability is the product's central claim about this number, so the
    unexplained remainder is written as one labelled event rather than left as
    a silent gap. It is a truthful label: an organisation adopting the platform
    genuinely does arrive with a prior assessment, and everything after it is
    earned inside the loop.
    """
    db.flush()
    totals = dict(
        db.execute(
            select(RiskEvent.employee_id, func.sum(RiskEvent.delta)).group_by(RiskEvent.employee_id)
        ).all()
    )
    for emp in employees:
        explained = baseline_for(emp) + float(totals.get(emp.id) or 0.0)
        remainder = round(emp.current_risk_score - explained, 2)
        if abs(remainder) < 0.05:
            continue
        db.add(
            RiskEvent(
                employee_id=emp.id,
                type="baseline_assessment",
                delta=remainder,
                reason="Pre-platform risk assessment, carried over at onboarding",
                created_at=days_ago(400),
            )
        )


def _fabricated_history(start: datetime, details: list[str]) -> list[dict]:
    """Build a completed 7-stage history with plausible spacing."""
    gaps_minutes = [0, 0.3, 0.5, 0.2, 0.4, 2100, 90]  # train→measure gap ≈ 1.5 days
    history = []
    cursor = start
    for stage, detail in enumerate(details, start=1):
        started = cursor
        cursor = cursor + timedelta(minutes=gaps_minutes[stage - 1] if stage - 1 < len(gaps_minutes) else 1)
        history.append(
            {
                "stage": stage,
                "name": {1: "ingest", 2: "analyze", 3: "convert", 4: "target", 5: "train", 6: "measure", 7: "feedback"}[stage],
                "status": "completed",
                "started_at": started.isoformat(),
                "completed_at": cursor.isoformat(),
                "detail": detail,
                "error": None,
            }
        )
    return history


def main() -> None:
    """`python -m app.seed` — build the demo world explicitly.

    Seeding is no longer automatic on startup: a production database must never
    fill itself with a fictional company. This entry point refuses to run
    outside the demo environment for the same reason.
    """
    import sys

    from .config import get_settings
    from .database import Base, engine, session_scope

    settings = get_settings()
    if not settings.is_demo:
        sys.exit(
            "Refusing to seed: APP_ENV is not 'demo'.\n"
            "The Caspian Dynamics demo world is fictional data and must never be "
            "written into a production database."
        )

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    Base.metadata.create_all(bind=engine)
    db = session_scope()
    try:
        seed_if_empty(db)
        print("Demo world ready. Sign in as analyst@caspiandynamics.az / analyst123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
