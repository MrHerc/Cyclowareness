"""The demo enterprise's asset and dependency inventory.

Who depends on which server, which cyber role owns what — the questions the
Cyber AI answers about the ORGANISATION rather than the interface. This is
the Caspian Dynamics demo world's inventory, seeded in code and labelled demo
wherever it surfaces: a real deployment would read a CMDB, and inventing one
silently would be exactly the fabrication this product refuses.

Names here must exist in `seed.py`'s employee roster — the assistant links
people, and a person the portal cannot show is a broken answer.
"""

from __future__ import annotations

from typing import Any

ASSETS: list[dict[str, Any]] = [
    {
        "id": "srv-dc-01",
        "name": "AD-DC-01",
        "kind": "domain controller",
        "description_az": "Əsas domen kontrolleri (Active Directory). Bütün autentifikasiya bundan asılıdır.",
        "description_en": "Primary domain controller (Active Directory). All authentication depends on it.",
        "owner": "Kamran Ismayilov",
        "owner_role": "Infrastructure lead",
        "cyber_role": "Identity provider — tier 0",
        "depends_on": [],
        "dependents": ["ERP-PROD", "MAIL-EDGE", "FILE-SRV-02", "SCADA-HIST"],
        "departments": ["Engineering", "Operations", "Finance", "HR"],
    },
    {
        "id": "srv-erp",
        "name": "ERP-PROD",
        "kind": "application server",
        "description_az": "Maliyyə və satınalma ERP sistemi. Maliyyə bölməsinin gündəlik işi buradadır.",
        "description_en": "Finance and procurement ERP. Finance's daily work lives here.",
        "owner": "Leyla Aliyeva",
        "owner_role": "Finance systems owner",
        "cyber_role": "Crown-jewel application — payment data",
        "depends_on": ["AD-DC-01", "DB-CLUSTER-01"],
        "dependents": [],
        "departments": ["Finance"],
    },
    {
        "id": "srv-db",
        "name": "DB-CLUSTER-01",
        "kind": "database cluster",
        "description_az": "Mərkəzi PostgreSQL klasteri: ERP və insan resursları sxemləri.",
        "description_en": "Central PostgreSQL cluster: ERP and HR schemas.",
        "owner": "Aysel Huseynova",
        "owner_role": "Data platform engineer",
        "cyber_role": "Data store — restricted",
        "depends_on": ["AD-DC-01"],
        "dependents": ["ERP-PROD", "HR-PORTAL"],
        "departments": ["Engineering"],
    },
    {
        "id": "srv-mail",
        "name": "MAIL-EDGE",
        "kind": "mail gateway",
        "description_az": "Poçt şlüzü və spam filtri. Fişinq hücumlarının ilk toxunduğu nöqtə.",
        "description_en": "Mail gateway and spam filter. The first surface phishing touches.",
        "owner": "Rashad Mammadov",
        "owner_role": "Security engineer",
        "cyber_role": "Email security boundary",
        "depends_on": ["AD-DC-01"],
        "dependents": [],
        "departments": ["Engineering", "Operations", "Finance", "HR"],
    },
    {
        "id": "srv-scada",
        "name": "SCADA-HIST",
        "kind": "OT historian",
        "description_az": "Əməliyyat texnologiyası tarixçə serveri. OT şəbəkəsi ilə İT arasındakı körpü — ən həssas keçid.",
        "description_en": "The OT historian. The bridge between the OT network and IT — the most sensitive crossing.",
        "owner": "Kamran Ismayilov",
        "owner_role": "Infrastructure lead",
        "cyber_role": "OT/IT boundary — segmented, SMBv1 forbidden",
        "depends_on": ["AD-DC-01"],
        "dependents": [],
        "departments": ["Operations"],
    },
    {
        "id": "srv-file",
        "name": "FILE-SRV-02",
        "kind": "file server",
        "description_az": "Ümumi fayl serveri. Məlumat təsnifatı siyasəti bilavasitə buna aiddir.",
        "description_en": "The shared file server. The data-classification policy binds here directly.",
        "owner": "Aysel Huseynova",
        "owner_role": "Data platform engineer",
        "cyber_role": "Unstructured data store — internal",
        "depends_on": ["AD-DC-01"],
        "dependents": [],
        "departments": ["Engineering", "Operations", "Finance", "HR"],
    },
    {
        "id": "srv-hr",
        "name": "HR-PORTAL",
        "kind": "web application",
        "description_az": "Kadr portalı: şəxsi məlumatlar, məzuniyyət, əməkhaqqı çıxarışları.",
        "description_en": "The HR portal: personal data, leave, payslips.",
        "owner": "Leyla Aliyeva",
        "owner_role": "Finance systems owner",
        "cyber_role": "Personal-data application — GDPR scope",
        "depends_on": ["DB-CLUSTER-01", "AD-DC-01"],
        "dependents": [],
        "departments": ["HR"],
    },
]

ROLES: list[dict[str, Any]] = [
    {
        "id": "role-ciso",
        "name": "Security lead (CISO funksiyası)",
        "holder": "Rashad Mammadov",
        "az": "Təhlükəsizlik proqramının sahibi: risk qəbulu, insident eskalasiyası, təsdiq qapısının son instansiyası.",
        "en": "Owns the security programme: risk acceptance, incident escalation, final authority at the approval gate.",
    },
    {
        "id": "role-ir",
        "name": "Incident response",
        "holder": "Rashad Mammadov",
        "az": "İnsidentlərə cavab: tapıntılar İnsident riskləri modulunа bu roldan düşür.",
        "en": "Responds to incidents: findings land in the Incident risks module from this role.",
    },
    {
        "id": "role-identity",
        "name": "Identity & access",
        "holder": "Kamran Ismayilov",
        "az": "AD-DC-01 və giriş nəzarəti; rüblük giriş baxışları ISO A.5.15 qaydasına bağlıdır.",
        "en": "AD-DC-01 and access control; quarterly access reviews trace to ISO A.5.15.",
    },
    {
        "id": "role-data",
        "name": "Data protection",
        "holder": "Aysel Huseynova",
        "az": "DB-CLUSTER-01 və FILE-SRV-02; məlumat təsnifatı və saxlama siyasətləri.",
        "en": "DB-CLUSTER-01 and FILE-SRV-02; data classification and retention policies.",
    },
]

DISCLAIMER_AZ = "Bu inventar nümayiş dünyasınındır (Caspian Dynamics) — real quraşdırmada CMDB-dən oxunar."
DISCLAIMER_EN = "This inventory belongs to the demo world (Caspian Dynamics) — a real deployment reads a CMDB."


def find_assets(message: str) -> list[dict[str, Any]]:
    hay = message.lower()
    hits = []
    for asset in ASSETS:
        names = [asset["name"].lower(), asset["id"].lower(), asset["kind"].lower()]
        if any(n in hay for n in names) or any(
            d.lower() in hay for d in asset["departments"]
        ):
            hits.append(asset)
    # server/asset questions with no specific name get the tier-0 picture
    if not hits and any(w in hay for w in ("server", "asıl", "depend", "asset", "infrastruktur")):
        hits = [ASSETS[0]]
    return hits[:3]


def find_roles(message: str) -> list[dict[str, Any]]:
    hay = message.lower()
    return [
        r
        for r in ROLES
        if r["holder"].split()[0].lower() in hay
        or any(w in hay for w in r["name"].lower().split())
        or any(w in hay.split() for w in ("rol", "role", "kim", "who", "rolu"))
    ][:3]
