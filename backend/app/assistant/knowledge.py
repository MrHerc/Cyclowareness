"""Cyber AI's knowledge: the interface guide and the preventive playbook.

Everything here is AUTHORED, not generated — the assistant's fallback answers
come straight from these entries, so a wrong sentence here is a wrong answer
in production. Each entry is bilingual; the responder picks the caller's
locale and never machine-translates.

Retrieval is deliberately dumb: lowercase keyword overlap, best score wins.
The corpus is small and curated; a ranking model would add an unauditable
layer between a question and a hand-written answer.
"""

from __future__ import annotations

import re
from typing import Any

# --------------------------------------------------------------------------
# The interface guide — what each screen is FOR, in the product's own voice.
# --------------------------------------------------------------------------

GUIDE: list[dict[str, Any]] = [
    {
        "id": "guide.command-center",
        "keywords": ["command", "center", "mərkəz", "komanda", "dashboard", "panel", "əsas"],
        "title_az": "Komanda Mərkəzi",
        "title_en": "Command Center",
        "az": (
            "Komanda Mərkəzi dövrənin hazırkı vəziyyətini göstərir: təsdiq qapısında "
            "gözləyənlər, aktiv dövrələr, yeni təhdid bildirişləri və sistem "
            "məhdudiyyətləri. Hər plitə kliklənəndir və aid olduğu ekrana aparır."
        ),
        "en": (
            "The Command Center shows the loop's current state: what waits at the "
            "approval gate, active runs, new threat reports and system limitations. "
            "Every tile is a link to its own screen."
        ),
    },
    {
        "id": "guide.loop",
        "keywords": ["loop", "dövrə", "mərhələ", "stage", "qapalı", "closed"],
        "title_az": "Qapalı dövrə",
        "title_en": "The closed loop",
        "az": (
            "Dövrə yeddi mərhələdən keçir: Qəbul → Təhlil → Çevirmə → [İnsan təsdiq "
            "qapısı] → Hədəfləmə → Təlim → Ölçmə → Geri əlaqə. Təsdiq qapısından "
            "heç nə öz-özünə keçmir — adı bəlli analitik qərar verir."
        ),
        "en": (
            "A run crosses seven stages: Intake → Analysis → Conversion → [human "
            "approval gate] → Targeting → Training → Measurement → Feedback. Nothing "
            "crosses the gate on its own — a named analyst decides."
        ),
    },
    {
        "id": "guide.incident-risks",
        "keywords": ["incident", "insident", "risk", "ir", "obligation", "öhdəlik", "tapıntı", "finding"],
        "title_az": "İnsident riskləri",
        "title_en": "Incident risks",
        "az": (
            "İR komandasının tapıntıları buraya düşür. Hər risk konkret işçilərə "
            "bağlanır, təlim tələb edə bilər və son tarix daşıyır. “Avtomatik təlim” "
            "düyməsi kataloqdan uyğun modul tapır, tapmasa AI ilə yaradıb təsdiq "
            "növbəsinə qoyur — təsdiqdən sonra təyinat özü tamamlanır."
        ),
        "en": (
            "IR team findings land here. Each risk binds named employees, may require "
            "training and carries a deadline. “Auto-train” matches an approved module "
            "from the catalogue, or generates one and queues it for review — approval "
            "completes the assignment automatically."
        ),
    },
    {
        "id": "guide.policy",
        "keywords": ["policy", "siyasət", "grc", "iso", "nist", "nis2", "pci", "compliance", "uyğunluq", "watch"],
        "title_az": "Siyasət kəşfiyyatı və GRC",
        "title_en": "Policy intelligence and GRC",
        "az": (
            "GRC sənədləri (ISO 27001, NIST CSF 2.0, NIS2, PCI DSS) qaydalar reyestri "
            "kimi saxlanılır. GRC müşahidəçisi arxa planda kəşfiyyat lentini aktiv "
            "qaydalarla tutuşdurur və yenilik tapanda uyğunluq kimi bildirir — "
            "tapıntıya çevirmək qərarı analitikindir."
        ),
        "en": (
            "GRC documents (ISO 27001, NIST CSF 2.0, NIS2, PCI DSS) live as a rules "
            "register. The GRC watcher continuously matches the intel feed against "
            "active rules and surfaces news as matches — escalating one to a finding "
            "is the analyst's decision."
        ),
    },
    {
        "id": "guide.sandbox",
        "keywords": ["sandbox", "analiz", "analysis", "detonation", "detonasiya", "sample", "nümunə", "fayl"],
        "title_az": "Sandbox",
        "title_en": "Sandbox",
        "az": (
            "Şübhəli fayllar Sandbox-da təhlil olunur: statik analiz burada, dinamik "
            "detonasiya isə yalnız izolyasiya olunmuş kənar işçidə. Heç bir nümunə "
            "veb tətbiqin içində icra olunmur."
        ),
        "en": (
            "Suspicious files are analysed in the Sandbox: static analysis here, "
            "dynamic detonation only on an isolated off-host worker. No sample is "
            "ever executed inside the web application."
        ),
    },
    {
        "id": "guide.training",
        "keywords": ["training", "təlim", "kurs", "course", "modul", "quiz", "test", "assignment", "təyinat"],
        "title_az": "Təlim",
        "title_en": "Training",
        "az": (
            "Təlim Studiyası modulları idarə edir; işçi portalı isə təyin edilmiş "
            "təlimi göstərir. Modullar real təhdidlərdən çevrilir və ya yaradılır, "
            "yoxlanılmış YouTube/Coursera resursları ilə dəstəklənir. Hər modul "
            "təsdiqdən keçməmiş heç kimə çatmır."
        ),
        "en": (
            "The Training Studio manages modules; the employee portal shows assigned "
            "training. Modules are converted from real threats or generated, backed "
            "by verified YouTube/Coursera resources. No module reaches anyone before "
            "review."
        ),
    },
    {
        "id": "guide.approvals",
        "keywords": ["approval", "təsdiq", "gate", "qapı", "review", "baxış"],
        "title_az": "Təsdiq qapısı",
        "title_en": "The approval gate",
        "az": (
            "Yaradılan hər məzmun Təsdiq növbəsinə düşür. Analitik oxuyur, "
            "redaktə edə bilir və qərar verir. Rədd üçün şərh məcburidir — növbəyə "
            "nəyin səhv olduğunu demədən heç nə qaytarılmır."
        ),
        "en": (
            "Everything generated lands in the Approvals queue. An analyst reads, may "
            "edit, and decides. A rejection requires a comment — nothing returns to "
            "the queue without a stated reason."
        ),
    },
    {
        "id": "guide.reporting",
        "keywords": ["report", "bildir", "şübhəli", "suspicious", "phishing", "fişinq", "email"],
        "title_az": "Şübhəlini bildirmək",
        "title_en": "Reporting something suspicious",
        "az": (
            "İşçi portalında “Şübhəlini bildir” düyməsi var: e-poçt, link, SMS, söhbət "
            "və ya fayl. Bildiriş analitikə düşür; irəli aparılsa real təhdid qeydinə "
            "çevrilir və dövrə başlayır. Bildirmək həmişə düzgün addımdır."
        ),
        "en": (
            "The employee portal has a “Report suspicious” button: email, link, SMS, "
            "chat or file. The report reaches an analyst; taken forward it becomes a "
            "real threat record and starts a loop. Reporting is always the right move."
        ),
    },
]

# --------------------------------------------------------------------------
# The preventive playbook — per attack topic, what actually reduces risk.
# --------------------------------------------------------------------------

PREVENTIVE: list[dict[str, Any]] = [
    {
        "id": "prevent.phishing",
        "keywords": ["phishing", "fişinq", "email", "e-poçt", "link", "prevent", "qabaqlayıcı", "qorun"],
        "title_az": "Fişinqə qarşı qabaqlayıcı tədbirlər",
        "title_en": "Preventing phishing",
        "az": (
            "1) Linkə basmazdan əvvəl ünvanı yoxlayın — həqiqi xidmətə əlfəcindən "
            "gedin. 2) Təcililik təzyiqi (“4 saat”, “hesab bağlanacaq”) fırıldağın "
            "əlamətidir. 3) Bildirin — kliklədikdən sonra da: tez bildiriş "
            "hücumçunun pəncərəsini kiçildir. 4) MFA-nı heç vaxt təsdiq basqını "
            "altında qəbul etməyin."
        ),
        "en": (
            "1) Check the address before clicking — reach the real service from a "
            "bookmark. 2) Urgency pressure (“4 hours”, “account suspended”) is the "
            "tell. 3) Report — even after clicking: fast reporting shrinks the "
            "attacker's window. 4) Never approve MFA under a push storm."
        ),
    },
    {
        "id": "prevent.credentials",
        "keywords": ["password", "parol", "credential", "mfa", "token", "hesab", "account"],
        "title_az": "Hesab və parol təhlükəsizliyi",
        "title_en": "Account and credential safety",
        "az": (
            "Unikal parollar + parol meneceri; imtiyazlı giriş üçün fişinqə davamlı "
            "MFA (FIDO2). Parolu heç kimə deməyin — İT də daxil olmaqla; həqiqi "
            "inzibatçı parol soruşmur. Şübhəli girişdə dərhal parolu dəyişib bildirin."
        ),
        "en": (
            "Unique passwords + a manager; phishing-resistant MFA (FIDO2) for "
            "privileged access. Never share a password — including with IT; a real "
            "admin does not ask. On suspicious sign-in, rotate and report at once."
        ),
    },
    {
        "id": "prevent.data",
        "keywords": ["data", "məlumat", "usb", "fayl", "paylaş", "share", "sızma", "leak"],
        "title_az": "Məlumatla davranış",
        "title_en": "Data handling",
        "az": (
            "Tapılmış USB-ni taxmayın — İT-yə təhvil verin. Paylaşımdan əvvəl "
            "təsnifata baxın; “hamıya açıq link” son çarə deyil, istisnadır. Şəxsi "
            "e-poçta iş sənədi göndərmək sızmadır, rahatlıq deyil."
        ),
        "en": (
            "Never plug in found media — hand it to IT. Check classification before "
            "sharing; an “anyone with the link” share is an exception, not a "
            "convenience. Work documents to personal mail is exfiltration, not comfort."
        ),
    },
    {
        "id": "prevent.social",
        "keywords": ["vishing", "zəng", "call", "voice", "ceo", "bec", "transfer", "köçürmə", "social"],
        "title_az": "Sosial mühəndisliyə qarşı",
        "title_en": "Against social engineering",
        "az": (
            "Pul köçürməsi və ya rekvizit dəyişikliyi istəyən HƏR sorğu ikinci "
            "kanalla təsdiqlənməlidir — məktubdakı nömrə ilə yox, kataloqdakı nömrə "
            "ilə. Rəhbərin “təcili və məxfi” tapşırığı klassik BEC ssenaridir."
        ),
        "en": (
            "ANY request to move money or change payment details is verified on a "
            "second channel — the directory number, not the one in the message. The "
            "boss's “urgent and confidential” errand is the classic BEC script."
        ),
    },
]


def _score(text: str, keywords: list[str]) -> int:
    """Substring for real words, WHOLE-WORD for short ones. "ir" matched inside
    "dərəcədir" and routed a weather question to the incident-risk guide — a
    two-letter keyword is only evidence when it stands alone."""
    hay = text.lower()
    words = set(re.findall(r"[\w-]+", hay, re.UNICODE))
    score = 0
    for k in keywords:
        if len(k) <= 3:
            score += 1 if k in words else 0
        elif k in hay:
            score += 1
    return score


def retrieve(message: str, corpus: list[dict[str, Any]], limit: int = 2) -> list[dict[str, Any]]:
    """Best-scoring entries for the message; empty when nothing overlaps."""
    scored = [(e, _score(message, e["keywords"])) for e in corpus]
    hits = [e for e, s in sorted(scored, key=lambda p: -p[1]) if s > 0]
    return hits[:limit]
