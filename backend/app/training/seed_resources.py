"""Candidate resources for the catalogue, one topic at a time.

WHERE THESE CAME FROM, because it is the only thing that makes them usable:
they were found by searching the web, not recalled. A language model does not
know YouTube video ids — it produces eleven plausible characters, and eleven
plausible characters are a working URL to a video about something else, or to
nothing at all. Every id below came back from a search engine as a real result.

They are still only CANDIDATES. Nothing here is trusted: `import_candidates`
puts each through `resources.verify()`, which asks YouTube's oEmbed endpoint
whether the video exists, and stores only the ones that answer — with the title
YouTube gives, not the title written here. Anything that has been deleted since
the search will be rejected rather than shipped, and the rejection is reported.

The titles in this file are therefore descriptive, not authoritative. If one
disagrees with what is stored, the stored one is right.
"""
from __future__ import annotations

from .resources import Candidate

#: Grouped by the attack they teach. Several per topic on purpose — one dead
#: link should not empty a topic, and a learner who has already seen one video
#: should have somewhere else to go.
CANDIDATES: list[Candidate] = [
    # --- credential phishing over email ---------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=gSQdERqtR5o",
              "Avoiding phishing scams: spotting and preventing email phishing",
              "phishing", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=o0btqyGWIQw",
              "Spot phishing emails", "phishing", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=xvN3IZww91I",
              "How to spot spam and phishing emails", "phishing", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=Xrzsu-FFvu8",
              "Detecting phishing emails, from an analyst's seat", "phishing",
              channel="email"),

    # --- business email compromise --------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=-h62k39ohjw",
              "Business email compromise and CEO fraud", "bec", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=Q-gUiHFJqWY",
              "Business email compromise: worked examples", "bec", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=mlKZjKUj0Ko",
              "What business email compromise is", "bec", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=LL2u-_bxbSI",
              "BEC fraud awareness course", "bec", channel="email"),

    # --- MFA fatigue ------------------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=aIeJ-EOirIo",
              "MFA fatigue attacks: detecting and stopping them", "mfa_fatigue",
              channel="chat"),
    Candidate("youtube", "https://www.youtube.com/watch?v=lIRRwlki05o",
              "MFA fatigue: one approval can compromise an account", "mfa_fatigue",
              channel="chat"),
    Candidate("youtube", "https://www.youtube.com/watch?v=R5tpxtlktOo",
              "Spotting and stopping MFA bombing", "mfa_fatigue", channel="chat"),
    Candidate("youtube", "https://www.youtube.com/watch?v=s4DQdCc9xMc",
              "Avoiding MFA bombing, and what happened at Uber", "mfa_fatigue",
              channel="chat"),

    # --- malicious QR codes ----------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=PbqsOYSpyMw",
              "Quishing: QR code phishing", "qr", channel="qr"),
    Candidate("youtube", "https://www.youtube.com/watch?v=RVF6NVnJvd8",
              "How QR codes are used to steal data", "qr", channel="qr"),
    Candidate("youtube", "https://www.youtube.com/watch?v=ObFS01lYbo4",
              "Do not scan that QR code — real examples", "qr", channel="qr"),
    Candidate("youtube", "https://www.youtube.com/watch?v=d2Vo19QhoTU",
              "QR-code-based phishing attacks", "qr", channel="qr"),

    # --- ransomware -------------------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=8ElqWPpFw8I",
              "Defending against ransomware attacks", "ransomware", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=M9n1BusgjKE",
              "Security awareness: ransomware", "ransomware", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=tMUz4dagGYk",
              "Ransomware staff awareness course", "ransomware", channel="email"),
    Candidate("youtube", "https://www.youtube.com/watch?v=rgLjNQFun-M",
              "The first sixty minutes after a breach", "ransomware", channel="email"),
]
