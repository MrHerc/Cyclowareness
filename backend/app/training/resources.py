"""Importing and verifying external training resources.

The whole point of this module is the word *verified*. A resource row is written
with `verified_at = NULL` and stays invisible to every learner until something
here has fetched its URL and recorded the response. Nothing else in the product
is allowed to set that column.

Why it is built this way rather than trusting a list:

* A link that 404s, a video that was taken down, a region-blocked upload and a
  URL a language model invented are **indistinguishable to the person clicking
  it**. All four waste the one moment somebody was willing to learn something.
* This product's standing rule is that no model-authored string may contain a
  URL. A catalogue populated by generation would break that rule the day it ran.
  A catalogue populated by *dereferencing* cannot: the URL existed before the
  row did.

So there are exactly two ways in — an operator supplies candidates, or the
YouTube Data API is queried with a configured key — and both go through
`verify()` before anything is stored as usable.

WHAT THIS DOES NOT DO. It does not judge whether a video is any good, whether it
teaches the topic it is filed under, or whether its advice is current. A 200 OK
means the bytes are reachable, nothing more. `added_by` records who vouched for
the *content*, and that is a human's name or an importer's, never a claim the
product makes on its own behalf.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import parse_qs, urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import TrainingResource

#: The attacks the catalogue is organised around. These mirror the channels and
#: lure families the sandbox and the loop already speak in, so a module built
#: from a real threat can ask for resources in the same vocabulary.
TOPICS: dict[str, str] = {
    "phishing": "Credential phishing over email",
    "bec": "Business email compromise and payment fraud",
    "ransomware": "Ransomware delivery and first response",
    "mfa_fatigue": "MFA fatigue and push-bombing",
    "qr": "Malicious QR codes (quishing)",
    "vishing": "Voice phishing and helpdesk impersonation",
    "credential_theft": "Credential reuse and password attacks",
    "insider": "Insider risk and data exfiltration",
    "data_handling": "Handling sensitive data safely",
}

#: Only these hosts may be stored. A catalogue that will accept any URL is a
#: catalogue that will one day hold a link an attacker put there.
ALLOWED_HOSTS: dict[str, tuple[str, ...]] = {
    "youtube": ("youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"),
    "coursera": ("coursera.org", "www.coursera.org"),
    "udemy": ("udemy.com", "www.udemy.com"),
}

_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


class ResourceRejected(ValueError):
    """The candidate cannot be stored, and the message says exactly why."""


@dataclass(frozen=True)
class Candidate:
    """A resource somebody proposes. Not yet trusted, not yet stored."""

    provider: str
    url: str
    title: str
    topic: str
    channel: str = "email"
    author: str = ""
    language: str = "en"
    duration_seconds: int | None = None


@dataclass(frozen=True)
class VerifyResult:
    ok: bool
    http_status: int | None
    error: str
    #: What the PROVIDER says this resource is called. Empty when the provider
    #: does not tell us. Preferred over anything the caller claimed — see
    #: `store_verified`.
    title: str = ""
    author: str = ""


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def youtube_id(url: str) -> str | None:
    """The video id, or None if this is not a single-video YouTube URL.

    Playlists and channels are deliberately not accepted: their contents change
    after the row is written, so "verified" would stop meaning anything.
    """
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host.endswith("youtu.be"):
        candidate = parsed.path.lstrip("/")
    elif "youtube.com" in host:
        if parsed.path not in ("/watch", "/watch/"):
            return None
        candidate = (parse_qs(parsed.query).get("v") or [""])[0]
    else:
        return None
    return candidate if _YT_ID.match(candidate) else None


def external_id_for(provider: str, url: str) -> str:
    if provider == "youtube":
        found = youtube_id(url)
        if not found:
            raise ResourceRejected(
                "Not a single-video YouTube URL. Playlists and channels change "
                "after verification, so they are not accepted."
            )
        return found
    # Course platforms: the slug is the last meaningful path segment.
    slug = [part for part in urlparse(url).path.split("/") if part]
    if not slug:
        raise ResourceRejected("No course identifier in the URL.")
    return slug[-1][:120]


def check_candidate(candidate: Candidate) -> None:
    """Structural checks, before anything touches the network."""
    if candidate.provider not in ALLOWED_HOSTS:
        raise ResourceRejected(f"Unknown provider {candidate.provider!r}.")
    if candidate.topic not in TOPICS:
        raise ResourceRejected(f"Unknown topic {candidate.topic!r}.")
    parsed = urlparse(candidate.url)
    if parsed.scheme != "https":
        raise ResourceRejected("Only https URLs are accepted.")
    if parsed.netloc.lower() not in ALLOWED_HOSTS[candidate.provider]:
        raise ResourceRejected(
            f"{parsed.netloc!r} is not a {candidate.provider} host."
        )
    if not candidate.title.strip():
        raise ResourceRejected("A resource without a title is not usable.")


#: YouTube's oEmbed endpoint. No API key, and — the reason it is used here — it
#: answers 400 for a video that does not exist, where the watch page answers 200
#: and renders the error in JavaScript.
_YT_OEMBED = "https://www.youtube.com/oembed"


def _verify_youtube(video_id: str, timeout: float) -> VerifyResult:
    """Ask YouTube whether this video exists, and what it is called.

    MEASURED, not assumed. Fetching the watch page and looking for "Video
    unavailable" in the HTML — the obvious approach, and this module's first
    one — passes a fabricated id: `.../watch?v=aaaaaaaaaaa` returns HTTP 200
    with an empty shell that JavaScript later fills in. A verifier that green-
    lights an invented id is worse than no verifier, because it launders a
    guess into a stored fact.

    oEmbed answers 400 for that same id, and 200 with the real title and
    channel for one that exists. That title is what gets stored: it comes from
    the provider rather than from whoever filed the row, so the catalogue cannot
    describe a video as something it is not.
    """
    watch = f"https://www.youtube.com/watch?v={video_id}"
    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Cyclowareness-ResourceCheck/1.0"},
        ) as client:
            response = client.get(_YT_OEMBED, params={"url": watch, "format": "json"})
    except httpx.HTTPError as exc:
        return VerifyResult(False, None, f"{type(exc).__name__}: {exc}"[:300])

    if response.status_code != 200:
        return VerifyResult(
            False,
            response.status_code,
            "YouTube does not serve this video (oEmbed refused it).",
        )

    try:
        payload = response.json()
    except ValueError:
        return VerifyResult(False, 200, "oEmbed returned a body that is not JSON.")

    return VerifyResult(
        True,
        200,
        "",
        title=str(payload.get("title") or "")[:300],
        author=str(payload.get("author_name") or "")[:200],
    )


def verify(url: str, *, timeout: float = 8.0) -> VerifyResult:
    """Establish that a resource is really there. Never raises.

    Reachability only. A pass means the provider served it today; it says
    nothing about whether the content is any good or teaches what it is filed
    under. `added_by` records who vouched for that, and it is a person.
    """
    video_id = youtube_id(url)
    if video_id:
        return _verify_youtube(video_id, timeout)

    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Cyclowareness-ResourceCheck/1.0"},
        ) as client:
            response = client.get(url)
    except httpx.HTTPError as exc:
        return VerifyResult(False, None, f"{type(exc).__name__}: {exc}"[:300])

    if response.status_code != 200:
        return VerifyResult(False, response.status_code, "")
    return VerifyResult(True, response.status_code, "")


def store_verified(
    session: Session,
    candidates: Iterable[Candidate],
    *,
    added_by: str,
    verifier=verify,
) -> dict[str, list[str]]:
    """Verify each candidate and store the ones that answered.

    Returns what happened to every candidate, by URL, so a caller can report the
    rejections rather than quietly importing fewer than it was given. A silent
    partial import is how a catalogue comes to look fuller than it is.
    """
    report: dict[str, list[str]] = {"stored": [], "updated": [], "rejected": []}

    for candidate in candidates:
        try:
            check_candidate(candidate)
            ext_id = external_id_for(candidate.provider, candidate.url)
        except ResourceRejected as exc:
            report["rejected"].append(f"{candidate.url} — {exc}")
            continue

        result = verifier(candidate.url)
        if not result.ok:
            detail = result.error or f"HTTP {result.http_status}"
            report["rejected"].append(f"{candidate.url} — {detail}")
            continue

        existing = session.scalar(
            select(TrainingResource).where(
                TrainingResource.provider == candidate.provider,
                TrainingResource.external_id == ext_id,
            )
        )
        if existing is not None:
            existing.verified_at = utcnow()
            existing.http_status = result.http_status
            existing.verify_error = ""
            if result.title:
                existing.title = result.title
            if result.author:
                existing.author = result.author
            report["updated"].append(candidate.url)
            continue

        # The provider's own title wins. Whoever filed the row may have typed
        # it from memory; YouTube knows what the video is called.
        title = (result.title or candidate.title).strip()[:300]
        author = (result.author or candidate.author).strip()[:200]

        session.add(
            TrainingResource(
                provider=candidate.provider,
                external_id=ext_id,
                url=candidate.url,
                title=title,
                author=author,
                duration_seconds=candidate.duration_seconds,
                language=candidate.language,
                topic=candidate.topic,
                channel=candidate.channel,
                verified_at=utcnow(),
                http_status=result.http_status,
                verify_error="",
                added_by=added_by,
            )
        )
        report["stored"].append(candidate.url)

    session.flush()
    return report


def revalidate(session: Session, *, limit: int = 50, verifier=verify) -> dict[str, int]:
    """Re-check stored resources and demote the ones that have gone dark.

    A catalogue verified once is a catalogue verified never: videos are deleted,
    courses are retired, and a row that passed in March is not evidence about
    today. Demotion clears `verified_at`, which removes it from every learner
    view while keeping the row and the reason.
    """
    rows = session.scalars(
        select(TrainingResource)
        .where(TrainingResource.verified_at.is_not(None))
        .order_by(TrainingResource.verified_at)
        .limit(limit)
    ).all()

    still_good = demoted = 0
    for row in rows:
        result = verifier(row.url)
        row.http_status = result.http_status
        if result.ok:
            row.verified_at = utcnow()
            row.verify_error = ""
            still_good += 1
        else:
            row.verified_at = None
            row.verify_error = (result.error or f"HTTP {result.http_status}")[:300]
            demoted += 1

    session.flush()
    return {"checked": len(rows), "still_reachable": still_good, "demoted": demoted}
