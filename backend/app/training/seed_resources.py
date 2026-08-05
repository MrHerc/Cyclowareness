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

    # --- vishing ----------------------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=-XQ5GrpWiqk",
              "How to spot voice-based phishing", "vishing", channel="sms"),
    Candidate("youtube", "https://www.youtube.com/watch?v=XbMx6D7fNSs",
              "Vishing scams explained", "vishing", channel="sms"),
    Candidate("youtube", "https://www.youtube.com/watch?v=DGlthoSCr_w",
              "Identifying and avoiding vishing scams", "vishing", channel="sms"),
    Candidate("youtube", "https://www.youtube.com/watch?v=ffLlgEpfDCg",
              "What vishing is, and how to avoid it", "vishing", channel="sms"),

    # --- credential theft -------------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=lRldR0JCb6U",
              "Credential stuffing: how reused passwords are exploited",
              "credential_theft", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=70laPBopWIo",
              "Password reuse and credential stuffing risks",
              "credential_theft", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=monuthoz3Bk",
              "Credential stuffing and password cracking explained",
              "credential_theft", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=FwwLTI5Q0Fg",
              "The dangers of reusing passwords online",
              "credential_theft", channel="web"),

    # --- insider risk -----------------------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=RgtbmxX90nM",
              "The unintentional insider threat", "insider", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=tjIM8SL3YbQ",
              "Insider threats and corporate data exfiltration", "insider",
              channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=XI832Apu_0o",
              "Insider threats explained", "insider", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=_6m-LACmYVc",
              "Insider risk: education, awareness and training", "insider",
              channel="web"),

    # --- handling sensitive data -----------------------------------------
    Candidate("youtube", "https://www.youtube.com/watch?v=dGRhSCdCCQQ",
              "Data protection and privacy training requirements",
              "data_handling", channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=aZdsiLTdaT0",
              "Data protection and privacy, lesson one", "data_handling",
              channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=BGMG7AIKNRg",
              "Protecting company data and reputation", "data_handling",
              channel="web"),
    Candidate("youtube", "https://www.youtube.com/watch?v=sQBSVa4FicI",
              "Data privacy awareness for employees", "data_handling",
              channel="web"),

    # --- Coursera ---------------------------------------------------------
    # No oEmbed here, so the stored title is the one written below — these are
    # the courses' own names as their pages state them. Verification is a page
    # fetch: a real course answers 200, a fabricated slug answers 404, which
    # was measured before this list was written.
    Candidate("coursera", "https://www.coursera.org/learn/cybersecurity-for-everyone",
              "Cybersecurity for Everyone (University of Maryland)",
              "data_handling", channel="web", author="University of Maryland"),
    Candidate("coursera",
              "https://www.coursera.org/learn/cybersecurity-protecting-your-information-on-the-go",
              "Cybersecurity: Protecting your Information on the Go",
              "data_handling", channel="web"),
    Candidate("coursera",
              "https://www.coursera.org/learn/csafe-protecting-your-information-at-home",
              "Cybersecurity: Protecting your Information at Home",
              "data_handling", channel="web"),
    Candidate("coursera", "https://www.coursera.org/learn/cybersecurity",
              "Cybersecurity Awareness and Innovation",
              "credential_theft", channel="web"),
]

# Udemy is DELIBERATELY absent. Measured on 2026-08-05: udemy.com answers 403
# to every automated fetch — a real course and a fabricated slug are
# indistinguishable — so this deployment cannot verify a Udemy link today, and
# an unverifiable link does not enter the catalogue. The host stays allowed so
# an analyst import fails with the real reason rather than "unknown provider".
