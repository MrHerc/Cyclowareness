"""Cyber AI — the portal's assistant, honest about where its words come from.

Three jobs, matching the ask exactly: explain the portal's own interface,
answer who depends on which server and which cyber role owns what, and give
preventive guidance.

The answering order is retrieval → model, never model alone:

1. The curated knowledge base (interface guide, preventive playbook) and the
   demo inventory are searched first. Their entries are AUTHORED — a hit is a
   sentence a person wrote and stands behind.
2. When a live model is configured, it composes the retrieved context into a
   conversational answer — grounded in that context, and the response still
   carries `sources` so the reader can see what it stood on.
3. With no model, the retrieved entries ARE the answer, stitched in the
   caller's locale and labelled `knowledge-base`. No model, no imitation of
   one.

The one thing this endpoint refuses: questions with no grounding. An empty
retrieval with no model returns "I don't have that" in so many words rather
than an improvised paragraph — an assistant that guesses about YOUR incident
process is worse than none.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..ai.ai_service import get_provider
from ..assistant import inventory, knowledge
from ..models import User
from ..security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

_HISTORY_LIMIT = 6


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    text: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    locale: str = "az"
    history: list[ChatTurn] = Field(default_factory=list, max_length=_HISTORY_LIMIT)


class ChatSource(BaseModel):
    kind: str  # "guide" | "preventive" | "asset" | "role"
    title: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    generated_by: str  # "anthropic" | "knowledge-base"
    disclaimer: str = ""


def _lang(locale: str) -> str:
    return "az" if locale.startswith("az") else "en"


def _compose_fallback(message: str, lang: str, hits: dict[str, list]) -> tuple[str, str]:
    """Stitch retrieved entries into an answer without a model."""
    parts: list[str] = []
    for entry in hits["guide"] + hits["preventive"]:
        parts.append(f"**{entry['title_' + lang]}**\n{entry[lang]}")
    for asset in hits["assets"]:
        deps = ", ".join(asset["depends_on"]) or ("yoxdur" if lang == "az" else "none")
        dependents = ", ".join(asset["dependents"]) or ("yoxdur" if lang == "az" else "none")
        if lang == "az":
            parts.append(
                f"**{asset['name']}** ({asset['kind']}) — {asset['description_az']}\n"
                f"Sahibi: {asset['owner']} ({asset['owner_role']}). "
                f"Kiber rolu: {asset['cyber_role']}. "
                f"Asılı olduğu: {deps}. Ondan asılı olanlar: {dependents}."
            )
        else:
            parts.append(
                f"**{asset['name']}** ({asset['kind']}) — {asset['description_en']}\n"
                f"Owner: {asset['owner']} ({asset['owner_role']}). "
                f"Cyber role: {asset['cyber_role']}. "
                f"Depends on: {deps}. Dependents: {dependents}."
            )
    for role in hits["roles"]:
        parts.append(f"**{role['name']}** — {role['holder']}. {role[lang]}")

    if not parts:
        answer = (
            "Bu suala əsaslandırılmış cavabım yoxdur. Portalın ekranları, qabaqlayıcı "
            "tədbirlər və nümayiş inventarı barədə soruşa bilərsiniz — məsələn: "
            "“Komanda Mərkəzi nə göstərir?”, “ERP hansı serverdən asılıdır?”, "
            "“Fişinqə qarşı nə edim?”"
            if lang == "az"
            else "I have no grounded answer for that. Ask about the portal's screens, "
            "preventive measures, or the demo inventory — e.g. “What does the "
            "Command Center show?”, “What does the ERP depend on?”, “How do I "
            "prevent phishing?”"
        )
        return answer, ""
    disclaimer = (
        inventory.DISCLAIMER_AZ if lang == "az" else inventory.DISCLAIMER_EN
    ) if hits["assets"] or hits["roles"] else ""
    return "\n\n".join(parts), disclaimer


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
):
    lang = _lang(payload.locale)
    message = payload.message.strip()

    hits = {
        "guide": knowledge.retrieve(message, knowledge.GUIDE),
        "preventive": knowledge.retrieve(message, knowledge.PREVENTIVE),
        "assets": inventory.find_assets(message),
        "roles": inventory.find_roles(message),
    }
    sources = (
        [ChatSource(kind="guide", title=e["title_" + lang]) for e in hits["guide"]]
        + [ChatSource(kind="preventive", title=e["title_" + lang]) for e in hits["preventive"]]
        + [ChatSource(kind="asset", title=a["name"]) for a in hits["assets"]]
        + [ChatSource(kind="role", title=r["name"]) for r in hits["roles"]]
    )

    fallback_answer, disclaimer = _compose_fallback(message, lang, hits)

    provider = get_provider()
    if type(provider).__name__ == "AnthropicProvider" and sources:
        try:
            context = fallback_answer
            history = "\n".join(f"{t.role}: {t.text}" for t in payload.history[-_HISTORY_LIMIT:])
            raw = await provider.complete(
                "assistant_chat",
                {
                    "question": message,
                    "language": "Azerbaijani" if lang == "az" else "English",
                    "context": context,
                    "history": history,
                },
            )
            return ChatResponse(
                answer=raw.strip(),
                sources=sources,
                generated_by="anthropic",
                disclaimer=disclaimer,
            )
        except Exception:  # noqa: BLE001 — the grounded fallback is always available
            logger.exception("Assistant model call failed; serving the knowledge base")

    return ChatResponse(
        answer=fallback_answer,
        sources=sources,
        generated_by="knowledge-base",
        disclaimer=disclaimer,
    )
