"""AI providers behind the ai_service (spec §6.3).

* ``AnthropicProvider`` — real Claude API calls; active when
  ANTHROPIC_API_KEY is set. Prompts live in versioned files under
  ``prompts/``; no secrets are ever sent to the model.
* ``MockAIProvider`` — deterministic, high-quality generation derived from
  the actual analysis payload, so the full loop demos offline. Also the
  graceful fallback if a live call fails or returns malformed output.
"""
import json
from pathlib import Path
from typing import Any

from ..config import get_settings

PROMPT_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")


class AnthropicProvider:
    def __init__(self) -> None:
        import anthropic

        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.ai_model

    async def complete(self, task: str, payload: dict[str, Any]) -> str:
        template = load_prompt(task)
        key = "metrics_json" if task == "executive_briefing" else (
            "report_json" if task == "triage_assist" else "analysis_json"
        )
        prompt = template.replace("{" + key + "}", json.dumps(payload, indent=2, default=str))
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


class MockAIProvider:
    """Deterministic generation keyed off the analysis payload itself."""

    async def complete(self, task: str, payload: dict[str, Any]) -> str:
        if task == "training_generation":
            return json.dumps(self._training(payload))
        if task == "threat_explanation":
            return self._explanation(payload)
        if task == "triage_assist":
            return json.dumps(self._triage(payload))
        if task == "executive_briefing":
            return self._briefing(payload)
        raise ValueError(f"Unknown AI task: {task}")

    # -- training generation --------------------------------------------------

    def _training(self, analysis: dict[str, Any]) -> dict[str, Any]:
        threat_type = analysis.get("threat_type", "phishing")
        iocs = analysis.get("iocs") or {}
        domains = iocs.get("domains") or []
        senders = iocs.get("sender_patterns") or []
        domain = domains[0] if domains else "a lookalike domain"
        sender = senders[0] if senders else "an unfamiliar external address"
        channel = {"smishing": "sms", "quishing": "qr", "bec": "email", "malware": "email",
                   "phishing": "email"}.get(threat_type, analysis.get("artifact_type", "email"))

        blueprints = {
            "phishing": {
                "title": f"Spotting the credential trap: the '{analysis.get('title') or 'account alert'}' phish",
                "description": "You're receiving this because a real phishing attempt just targeted people in roles like yours. This 3-minute module shows you exactly how it worked.",
                "content": [
                    {"heading": "What just happened",
                     "body": f"A real phishing email reached our company. It pretended to be a routine account notice from a trusted service and pushed readers to 'verify' their login through a link. The link led to {domain} — a fake page built to steal passwords."},
                    {"heading": "How to spot it",
                     "body": f"Three tells gave it away: the sender ({sender}) did not match the service it claimed to be; the link's real destination ({domain}) was not the official site; and the message manufactured urgency — act now, or lose access. Real providers don't threaten deadlines measured in hours."},
                    {"heading": "What attackers wanted",
                     "body": "One set of working credentials. With your password, an attacker can read mail, reset other accounts, and move deeper into company systems — all while looking like you."},
                    {"heading": "Your move next time",
                     "body": "Never log in through a link in a message. Open the service from your bookmarks or type the address yourself. Then use the Report button — one click turns you into the company's early-warning sensor."},
                ],
                "quiz": [
                    {"question": "An email says your account will be suspended in 4 hours unless you verify. What's the safest first move?",
                     "options": ["Click the link quickly before the deadline", "Open the service yourself via bookmark and check", "Reply asking if it's real", "Forward it to a colleague to check"],
                     "correct_index": 1,
                     "explanation": "Going to the service directly bypasses any fake link. Deadlines are pressure tactics."},
                    {"question": f"The message links to {domain}. What does that tell you?",
                     "options": ["Nothing — domains change all the time", "It's safe if the page looks right", "The real destination doesn't match the claimed sender — classic phishing", "It's an internal IT redirect"],
                     "correct_index": 2,
                     "explanation": "The mismatch between claimed identity and actual destination is the single strongest tell."},
                    {"question": "Which sender detail should raise suspicion?",
                     "options": [f"A sender like {sender} that doesn't match the service's real domain", "A sender with a first and last name", "A sender you've emailed before", "A sender inside your department"],
                     "correct_index": 0,
                     "explanation": "Attackers spoof display names, but the underlying address usually betrays them."},
                    {"question": "You clicked a suspicious link before thinking. What now?",
                     "options": ["Say nothing and hope for the best", "Delete the email so there's no trace", "Change the password and report it immediately", "Turn off your computer"],
                     "correct_index": 2,
                     "explanation": "Fast reporting shrinks the attacker's window. Nobody is blamed for reporting."},
                ],
                "takeaway": "Links take you where attackers want; bookmarks take you where YOU want. When pressured, slow down and report.",
            },
            "bec": {
                "title": "The fake executive: recognising payment-fraud email",
                "description": "A real business-email-compromise attempt targeted our payment process. This module shows how to break the manipulation chain.",
                "content": [
                    {"heading": "What just happened",
                     "body": f"An email posing as a senior executive (sent from {sender}) asked for an urgent, confidential wire transfer with changed bank details. There was no malware — the entire attack was persuasion."},
                    {"heading": "How to spot it",
                     "body": "The pattern: authority (a name you obey), urgency (today, quietly), and a change to payment details. Any one alone is common; all three together is the BEC signature."},
                    {"heading": "What attackers wanted",
                     "body": "A single approved transfer. BEC steals more money globally than ransomware — one wire can equal a year of profit, and recovery after 48 hours is rare."},
                    {"heading": "Your move next time",
                     "body": "Verify any payment-detail change through a second channel you already trust — call the known number, never the one in the email. No legitimate executive will punish you for verifying."},
                ],
                "quiz": [
                    {"question": "The 'CEO' emails: urgent confidential transfer, new IBAN, today. Best response?",
                     "options": ["Execute — it's the CEO", "Verify by calling the CEO's known number", "Reply to the email asking for confirmation", "Wait a day to see if they follow up"],
                     "correct_index": 1,
                     "explanation": "Out-of-band verification defeats BEC. Replying just talks to the attacker."},
                    {"question": "What makes BEC hard for filters to catch?",
                     "options": ["It uses new malware", "It contains no links or attachments — just persuasive text", "It's sent at night", "It targets only IT staff"],
                     "correct_index": 1,
                     "explanation": "Pure social engineering carries no technical payload to detect — humans are the control."},
                    {"question": "A vendor emails a bank-details change on an invoice due this week. You should…",
                     "options": ["Update the details — invoices are routine", "Check the sender's grammar", "Confirm via the vendor's known phone contact before changing anything", "Pay the old account instead"],
                     "correct_index": 2,
                     "explanation": "Payment-detail changes are always verified through a pre-existing trusted channel."},
                    {"question": "Which combination is the BEC signature?",
                     "options": ["Authority + urgency + payment change", "Long email + attachment", "Unknown sender + typos", "Internal sender + meeting invite"],
                     "correct_index": 0,
                     "explanation": "That triple is the manipulation chain BEC relies on."},
                ],
                "takeaway": "Money moves only after a second-channel check. Authority plus urgency plus new bank details = stop.",
            },
            "malware": {
                "title": "The armed attachment: how one click becomes an infection",
                "description": "A real malicious attachment was caught targeting our team. See what it would have done — and the two-second habit that stops it.",
                "content": [
                    {"heading": "What just happened",
                     "body": f"An email carried an attachment that, once opened, silently installed a program giving attackers remote control. Our sandbox watched it phone home to {domain} and set itself to restart with the computer."},
                    {"heading": "How to spot it",
                     "body": "Red flags: an unexpected attachment, a generic pretext ('invoice attached', 'see document'), and a request to 'Enable Content' or run something. Office documents asking to enable macros are the classic trap."},
                    {"heading": "What attackers wanted",
                     "body": "A foothold. From one infected laptop, attackers harvest passwords, spread across shared drives, and stage ransomware — the click is just step one of their plan."},
                    {"heading": "Your move next time",
                     "body": "Don't open attachments you weren't expecting — even from known names. Never click 'Enable Content' on a document that arrived by email. Report first; opening can wait, infection can't be undone."},
                ],
                "quiz": [
                    {"question": "A document asks you to 'Enable Content' to view it. What is that button really doing?",
                     "options": ["Improving formatting", "Allowing embedded code (macros) to run", "Checking for updates", "Verifying your license"],
                     "correct_index": 1,
                     "explanation": "'Enable Content' executes macros — the most common malware delivery trick."},
                    {"question": "An unexpected 'invoice.zip' arrives from a supplier's address. Safest action?",
                     "options": ["Open it — suppliers send invoices", "Scan it yourself, then open", "Report it and confirm with the supplier through a known contact", "Forward it to finance"],
                     "correct_index": 2,
                     "explanation": "Sender addresses get compromised; the report flow checks it safely in a sandbox."},
                    {"question": "Why is one infected laptop a company-wide problem?",
                     "options": ["It isn't — IT reimages it", "Malware spreads via saved passwords and shared drives", "It voids the warranty", "It slows the Wi-Fi"],
                     "correct_index": 1,
                     "explanation": "Modern malware moves laterally — the first machine is a beachhead."},
                    {"question": "You already opened a suspicious attachment. Best next step?",
                     "options": ["Delete the file and move on", "Run a personal antivirus and wait", "Disconnect from the network and report immediately", "Restart the computer"],
                     "correct_index": 2,
                     "explanation": "Disconnect + report limits spread and gives responders their best window."},
                ],
                "takeaway": "Unexpected attachment = report first, open never. 'Enable Content' is the attacker's favourite button.",
            },
            "smishing": {
                "title": "Phishing by text: the delivery-SMS trap",
                "description": "A real smishing (SMS phishing) attempt targeted employees' phones. Here's how the small screen hides big lies.",
                "content": [
                    {"heading": "What just happened",
                     "body": f"A text message claiming a package delivery problem asked recipients to tap a link ({domain}) and 'confirm details'. The page harvested logins and card numbers."},
                    {"heading": "How to spot it",
                     "body": "Phones hide the tells: you can't hover to preview a link and the sender is just a number. Any unexpected SMS with a link and a deadline should be treated as hostile until proven otherwise."},
                    {"heading": "What attackers wanted",
                     "body": "Credentials and payment data — and increasingly, your one-time login codes. A phone compromise reaches into work accounts too."},
                    {"heading": "Your move next time",
                     "body": "Never tap links in unexpected texts. Go to the courier's or bank's app directly. Report smishing exactly like email phishing — screenshots help the security team block the domain for everyone."},
                ],
                "quiz": [
                    {"question": "A text says a package needs a small customs fee via link. You're actually expecting a package. Now what?",
                     "options": ["Pay — it's a small amount", "Tap the link but enter fake data first", "Check the courier's official app or site directly", "Reply STOP"],
                     "correct_index": 2,
                     "explanation": "Expected deliveries make the lure work; the official app shows the truth."},
                    {"question": "Why is smishing harder to inspect than email phishing?",
                     "options": ["Texts are encrypted", "No hover-preview and no sender domain to inspect on a phone", "SMS links are always safe", "Phones have no security"],
                     "correct_index": 1,
                     "explanation": "The small screen strips away your usual verification tools."},
                    {"question": "A text asks for the one-time code you just received. Who's asking?",
                     "options": ["The bank verifying you", "Almost certainly an attacker mid-login", "The phone carrier", "A wrong number"],
                     "correct_index": 1,
                     "explanation": "Real services never ask you to relay a code — someone is using your credentials right now."},
                ],
                "takeaway": "A link in an unexpected text is a hook, not a shortcut. Open the app instead.",
            },
            "quishing": {
                "title": "The poisoned QR code: quishing decoded",
                "description": "A real QR-code phishing attempt was found where employees would scan without thinking. Here's the new trick and the old defence.",
                "content": [
                    {"heading": "What just happened",
                     "body": f"A QR code (in an email posing as an IT notice) promised quick access but resolved to {domain} — a credential-harvesting page dressed as our login portal."},
                    {"heading": "How to spot it",
                     "body": "A QR code is just a link you can't read. The tells move around it: an unexpected request to scan, urgency, and a login page appearing after the scan. Legitimate IT never delivers login flows by QR in email."},
                    {"heading": "What attackers wanted",
                     "body": "The same as any phish — your password — but routed through your phone, where corporate email filters can't see the click."},
                    {"heading": "Your move next time",
                     "body": "Treat a scan like a click: check the URL your camera shows before opening, and never enter work credentials on a page reached from a QR code. Report the message with a photo."},
                ],
                "quiz": [
                    {"question": "Why do attackers like QR codes in emails?",
                     "options": ["They look modern", "The 'click' happens on your phone, outside corporate protection", "QR codes can't be faked", "They load faster"],
                     "correct_index": 1,
                     "explanation": "Scanning moves the attack to a device the company can't filter."},
                    {"question": "After scanning a code from a poster, a company login page appears. You should…",
                     "options": ["Log in — it looks right", "Close it and navigate to the service manually", "Bookmark it for later", "Enter an old password to test it"],
                     "correct_index": 1,
                     "explanation": "Login pages reached by QR are unverifiable at a glance — navigate yourself."},
                    {"question": "What is a QR code, functionally?",
                     "options": ["An image", "A link you cannot read before following", "An encrypted file", "A tracking pixel"],
                     "correct_index": 1,
                     "explanation": "That unreadability is exactly what attackers exploit."},
                ],
                "takeaway": "A QR code is a link with a blindfold. Peek at the URL before you trust it.",
            },
        }
        blueprint = blueprints.get(threat_type, blueprints["phishing"])
        blueprint["channel"] = channel
        blueprint["est_minutes"] = 3
        return blueprint

    # -- explanation -----------------------------------------------------------

    def _explanation(self, analysis: dict[str, Any]) -> str:
        threat_type = analysis.get("threat_type", "phishing")
        iocs = analysis.get("iocs") or {}
        domain = (iocs.get("domains") or ["a fake website"])[0]
        texts = {
            "phishing": f"This was a fake message designed to steal passwords. It pretended to be a trusted service and tried to rush the reader into 'verifying' their account on {domain}, a copycat page controlled by the attacker. The giveaway: the real destination of the link didn't match who the message claimed to be from.",
            "bec": "This was a con, not a virus. Someone impersonated a senior colleague to pressure an urgent, confidential payment to a new bank account. The giveaway: authority plus urgency plus changed bank details — a combination real executives don't use over email.",
            "malware": f"This message carried a booby-trapped attachment. Opening it would quietly install a program letting criminals control the computer and reach into company files, contacting {domain} behind the scenes. The giveaway: an unexpected attachment pushing you to 'enable' something.",
            "smishing": f"This was a scam text message. It invented a small problem — a stuck delivery — and pushed a link to {domain} to 'fix' it, actually a page built to steal logins and card details. The giveaway: an unexpected text with a link and a deadline.",
            "quishing": f"This was a scam hidden inside a QR code. Scanning it opened {domain}, a fake login page that captures whatever is typed. The giveaway: nobody legitimate asks you to log in through a QR code from an email.",
            "other": "This artifact looked unusual but showed no clearly malicious behaviour. It was flagged for caution — when in doubt, reporting is always the right call.",
        }
        return texts.get(threat_type, texts["other"])

    # -- triage assist ----------------------------------------------------------

    def _triage(self, report: dict[str, Any]) -> dict[str, Any]:
        content = (report.get("artifact_ref") or "").lower()
        meta = report.get("artifact_meta") or {}
        import re

        urls = re.findall(r"https?://[^\s<>\"')\]]+", report.get("artifact_ref") or "")[:5]
        domains = sorted({u.split("/")[2] for u in urls if u.count("/") >= 2})[:5]
        indicators = []
        if any(w in content for w in ("urgent", "immediately", "expire", "suspended", "act now")):
            indicators.append("Manufactured urgency / deadline pressure")
        if urls:
            indicators.append(f"Embedded link(s): {', '.join(domains) if domains else urls[0]}")
        if any(w in content for w in ("password", "verify", "login", "credential", "confirm")):
            indicators.append("Requests credential or identity verification")
        if any(w in content for w in ("wire", "payment", "iban", "invoice", "bank")):
            indicators.append("References payment or banking changes")
        if any(w in content for w in (".exe", ".zip", "attachment", "macro", "enable content")):
            indicators.append("Attachment / executable content mentioned")
        sender = meta.get("sender", "")
        if sender and not sender.endswith(("company.az", "caspiandynamics.az")):
            indicators.append(f"External sender: {sender}")
        level = "high" if len(indicators) >= 3 else ("medium" if len(indicators) >= 1 else "low")
        return {
            "summary": (
                "The reported artifact shows classic social-engineering structure: "
                + (indicators[0].lower() if indicators else "no strong indicators")
                + (" combined with further red flags." if len(indicators) > 1 else ".")
                + " Recommend sandbox analysis before dismissal."
                if indicators
                else "No strong phishing indicators found in the reported content; may be a false alarm, but the report itself is valuable sensor signal."
            ),
            "suspicion_level": level,
            "indicators": indicators or ["No obvious indicators — manual review advised"],
            "likely_iocs": {"urls": urls, "domains": domains, "sender_patterns": [sender] if sender else []},
            "recommended_action": (
                "Push into the loop for sandbox analysis and targeted training."
                if level != "low"
                else "Verify manually; likely benign — thank the reporter to reinforce the behaviour."
            ),
        }

    # -- executive briefing -------------------------------------------------------

    def _briefing(self, metrics: dict[str, Any]) -> str:
        current = metrics.get("current", {})
        trend = metrics.get("trend", [])
        depts = metrics.get("departments", [])
        click = current.get("phishing_click_rate", 0) * 100
        report_rate = current.get("report_rate", 0) * 100
        risk = current.get("avg_risk_score", 0)
        direction = "improving"
        if len(trend) >= 2:
            direction = "improving" if trend[-1]["avg_risk_score"] <= trend[0]["avg_risk_score"] else "under pressure"
        best = min(depts, key=lambda d: d["avg_risk"])["name"] if depts else "—"
        worst = max(depts, key=lambda d: d["avg_risk"])["name"] if depts else "—"
        return (
            f"Our human cyber-risk posture is {direction}: the organisation-wide risk score now stands at {risk:.0f} out of 100. "
            f"Employees clicked {click:.0f} percent of simulated phishing lures in the last month, while {report_rate:.0f} percent were proactively reported — "
            f"every reported message becomes new, targeted training the same day, which is the engine behind the trend. "
            f"{best} is currently our most resilient department, while {worst} carries the highest concentration of risk and is receiving prioritised micro-training. "
            f"The clearest proof of behaviour change is the gap between click rate and report rate closing month over month. "
            f"For the next thirty days the focus should be lifting the report rate above the click rate in {worst}, converting our most exposed team into our best early-warning sensor."
        )
