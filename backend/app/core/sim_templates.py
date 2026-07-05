"""Prebuilt multi-channel phishing-simulation lure templates (spec §6.4, §6.6).

Two sources feed the simulation launcher:
  1. Real analyzed threats (the differentiator — see routers/simulations.py).
  2. These curated, ready-to-run lures covering every channel: email,
     SMS (smishing), QR (quishing) and chat (Slack/Teams-style).

Templates are static content, not persisted — the analyst picks one and the
campaign records the resulting per-employee click/report events as usual.
"""

SIM_TEMPLATES: list[dict] = [
    {
        "id": "email-credential-reset",
        "name": "Password reset — credential harvest",
        "channel": "email",
        "threat_type": "phishing",
        "difficulty": "easy",
        "description": "Classic 'your password expires today' lure with a fake reset link.",
        "sample_lure": (
            "From: it-security@caspiandynamlcs.az\n"
            "Subject: Action required: your password expires in 2 hours\n\n"
            "Our records show your corporate password expires today. To keep your "
            "access, reset it now: https://caspian-reset.top/pwd . Unreset accounts "
            "are locked automatically."
        ),
    },
    {
        "id": "email-invoice-bec",
        "name": "Vendor invoice — payment redirect (BEC)",
        "channel": "email",
        "threat_type": "bec",
        "difficulty": "hard",
        "description": "Finance-targeted business email compromise: changed bank details on an open invoice.",
        "sample_lure": (
            "From: accounts@vendor-billing.online\n"
            "Subject: Updated bank details — invoice #INV-4471\n\n"
            "Please note our banking details have changed for this quarter. Kindly "
            "update the beneficiary account for invoice #INV-4471 before the Friday "
            "payment run. Treat as confidential."
        ),
    },
    {
        "id": "sms-delivery-fee",
        "name": "Parcel customs fee (smishing)",
        "channel": "sms",
        "threat_type": "smishing",
        "difficulty": "medium",
        "description": "SMS about a held package requiring a small fee — harvests card + OTP.",
        "sample_lure": (
            "[Delivery] Your parcel CD-8841 is held at customs. Pay the 2.50 AZN "
            "clearance fee to release: https://az-parcel-fee.link/cd8841 . "
            "Unpaid parcels return in 24h."
        ),
    },
    {
        "id": "qr-parking-portal",
        "name": "Office parking QR (quishing)",
        "channel": "qr",
        "threat_type": "quishing",
        "difficulty": "medium",
        "description": "Physical QR poster imitating an internal parking-registration service.",
        "sample_lure": (
            "New employee parking registration — scan to register your plate before "
            "Monday: https://cd-parking-portal.site/register (QR code on level -1 poster)."
        ),
    },
    {
        "id": "chat-helpdesk-migration",
        "name": "IT helpdesk mailbox migration (chat)",
        "channel": "chat",
        "threat_type": "phishing",
        "difficulty": "hard",
        "description": "Teams/Slack message from a fake external helpdesk pushing a consent link.",
        "sample_lure": (
            "IT Helpdesk (external): We are migrating mailboxes tonight. Please "
            "confirm your access here to avoid interruption: "
            "https://m365-verify.online/consent"
        ),
    },
    {
        "id": "email-hr-benefits",
        "name": "HR benefits enrollment",
        "channel": "email",
        "threat_type": "phishing",
        "difficulty": "easy",
        "description": "Seasonal 'open enrollment closes today' lure aimed at all staff.",
        "sample_lure": (
            "From: hr-benefits@caspian-portal.info\n"
            "Subject: Open enrollment closes at 5 PM today\n\n"
            "You have not completed your 2026 benefits enrollment. Sign in with your "
            "work credentials to finalize before the deadline: "
            "https://caspian-portal.info/enroll"
        ),
    },
]


def get_template(template_id: str) -> dict | None:
    return next((t for t in SIM_TEMPLATES if t["id"] == template_id), None)
