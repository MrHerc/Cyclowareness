"""Build the printable tour guide.

The same journey the in-app tour walks, written for someone reading before
they sit down at the portal — a booth visitor, a new analyst, an auditor who
wants the shape of the thing on paper.

Two rules it inherits from the product:

* **It describes what exists.** No roadmap language, no "will support". Where
  a capability is conditional (dynamic detonation, a live model) it says so.
* **It never shows a number the deployment did not produce.** There are no
  invented metrics in here; the screens carry the numbers, this carries the
  meaning.

Run:  python docs/build_tour_pdf.py [output.pdf]
"""

from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# The product's own palette, so the paper and the screen agree.
INK = colors.HexColor("#16171a")
MUTED = colors.HexColor("#55585f")
FAINT = colors.HexColor("#666a72")
BRAND = colors.HexColor("#c2410c")      # the accent, darkened for paper
RULE = colors.HexColor("#e3e3e0")
PANEL = colors.HexColor("#faf9f7")

BASE = getSampleStyleSheet()


def style(name, **kw):
    return ParagraphStyle(name, parent=BASE["BodyText"], alignment=TA_LEFT, **kw)


S = {
    "h1": style("h1", fontName="Helvetica-Bold", fontSize=26, leading=30,
                textColor=INK, spaceAfter=4),
    "sub": style("sub", fontName="Helvetica", fontSize=11.5, leading=16,
                 textColor=MUTED, spaceAfter=18),
    "h2": style("h2", fontName="Helvetica-Bold", fontSize=15, leading=19,
                textColor=INK, spaceBefore=16, spaceAfter=6),
    "step": style("step", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                  textColor=BRAND, spaceAfter=3),
    "body": style("body", fontName="Helvetica", fontSize=10, leading=15,
                  textColor=INK, spaceAfter=8),
    "note": style("note", fontName="Helvetica-Oblique", fontSize=9, leading=13,
                  textColor=FAINT, spaceAfter=8),
    "cell": style("cell", fontName="Helvetica", fontSize=9, leading=13, textColor=INK),
    "cellhead": style("cellhead", fontName="Helvetica-Bold", fontSize=9, leading=13,
                      textColor=INK),
}


def rule():
    t = Table([[""]], colWidths=[170 * mm], rowHeights=[0.6])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), RULE)]))
    return t


def panel(rows):
    """A bordered box of label/value rows."""
    data = [[Paragraph(k, S["cellhead"]), Paragraph(v, S["cell"])] for k, v in rows]
    t = Table(data, colWidths=[42 * mm, 128 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def step(n, total, title, paras, note=None):
    flow = [
        Paragraph(f"STEP {n} OF {total}", S["step"]),
        Paragraph(title, S["h2"]),
    ]
    flow += [Paragraph(p, S["body"]) for p in paras]
    if note:
        flow.append(Paragraph(note, S["note"]))
    return KeepTogether(flow)


STEPS = [
    ("Start here: the Command Center", "/command-center", [
        "One question per screen: <b>what needs a person right now.</b> The tiles are live "
        "counts — what waits at the approval gate, what is moving through the loop, what "
        "the sandbox cannot do today. Every tile is a link into the screen behind it.",
        "The panel above them lists the things this deployment currently <i>cannot</i> do — "
        "an integration in error, dynamic detonation unavailable, no language model "
        "connected. A capability that is missing is stated, never left to be discovered.",
    ], "If a figure was never measured, the screen says so instead of showing a zero. "
       "Absent and zero mean opposite things and must never render the same."),

    ("Intake: where a threat arrives", "/threats", [
        "Real artifacts, through three doors: an employee reports one from their portal, a "
        "curated intelligence feed carries one, or an analyst submits one directly.",
        "Everything downstream is built from these. The training this platform delivers is "
        "never generated from a template about a threat nobody saw — that is the difference "
        "between awareness training and this.",
    ]),

    ("Analysis: the sandbox", "/sandbox", [
        "Static analysis runs inside the platform. <b>Dynamic detonation runs only on an "
        "isolated off-host worker</b> — no submitted sample is ever executed inside the web "
        "application.",
        "When detonation is unavailable the verdict says so, rather than implying it looked "
        "at runtime behaviour and found nothing.",
    ]),

    ("Incident risks: the IR team's findings", "/incident-risks", [
        "This is the front door for governance work, and the heart of the product. A finding "
        "binds <b>named people</b>, may carry a deadline and a pass mark, and is the record "
        "an auditor will ask about.",
        "<b>Auto-train</b> turns it into training in one click. The platform looks for an "
        "already-approved module matching the finding's topic and assigns it immediately, "
        "with verified external courses attached. When nothing on the shelf fits, it "
        "generates a module and queues it for review.",
    ], "Generation never assigns. A generated module reaches nobody until a named person "
       "approves it — and that approval is what completes the assignment."),

    ("The approval gate", "/approvals", [
        "Nothing generated reaches an employee until a person decides. The analyst reads "
        "exactly what the employee will read, may edit it first, and a rejection requires a "
        "written reason.",
        "The queue shows each item's provenance — whether a live model or an offline "
        "template wrote it — because approving content means standing behind it.",
    ], "This gate is the product's central claim, not a configurable step."),

    ("Training: modules and real courses", "/training", [
        "Micro-lessons converted from real threats, backed by <b>verified external "
        "material</b>: YouTube and Coursera links that something actually fetched and "
        "checked.",
        "A link that has never been dereferenced is not shown at all. A dead link at the one "
        "moment somebody was willing to learn is worse than no link.",
    ]),

    ("Policy and the GRC watch", "/policy-intelligence", [
        "Your own documents as a rules register. ISO/IEC 27001:2022, NIST CSF 2.0, NIS2 "
        "(Directive (EU) 2022/2555) and PCI DSS 4.0 ship as control registers with active, "
        "technology-bearing rules.",
        "The <b>GRC watcher</b> runs in the background, matching new advisories against those "
        "active rules and surfacing what it finds. It never raises a finding on its own: a "
        "finding is an obligation against named people, and escalating a match stays a "
        "human decision.",
    ]),

    ("People and risk", "/employees", [
        "<b>Behaviour moves the score; attendance does not.</b> Completing training earns "
        "credit on a separate axis, so nobody can lower their risk score by clicking through "
        "lessons.",
        "Every figure states its sample size and where it came from. Where a score was never "
        "measured, the screen says so.",
    ]),

    ("Cyber AI, in the corner", "any screen", [
        "The assistant is docked on every page. Ask it what a screen is for, who depends on "
        "which system, which cyber role owns what, or what actually prevents a given attack.",
        "Every answer carries where it came from — the curated knowledge base or a live "
        "model — and a question it has no grounding for is refused rather than improvised.",
    ]),
]

EMPLOYEE_STEPS = [
    ("Your training", [
        "What is assigned to you and why. Each item names the real incident or threat that "
        "put it there — not a generic annual course.",
        "Finish the lesson, answer the questions, and the result feeds back into your own "
        "risk picture.",
    ]),
    ("Report anything suspicious", [
        "An email, a link, a text, a chat message or a file. It reaches an analyst; if it "
        "turns out to be real it starts a loop that protects everyone else.",
        "<b>Reporting is always the right move — including after you clicked.</b> Fast "
        "reporting shrinks the attacker's window more than anything else you can do.",
    ]),
]


def build(path: Path) -> None:
    doc = BaseDocTemplate(
        str(path), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title="Cyclowareness — Portal Tour Guide",
        author="Safarov Industries Inc.",
        subject="A walkthrough of the closed-loop human cyber-risk platform",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")

    def furniture(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(FAINT)
        canvas.drawString(20 * mm, 10 * mm, "Cyclowareness — Portal Tour Guide")
        canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"{canvas.getPageNumber()}")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, 13 * mm, A4[0] - 20 * mm, 13 * mm)
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=furniture)])

    flow = []
    flow.append(Paragraph("Cyclowareness", S["h1"]))
    flow.append(Paragraph(
        "Portal tour guide — the closed loop, one screen at a time", S["sub"]))
    flow.append(rule())
    flow.append(Spacer(1, 14))

    flow.append(Paragraph("What this platform does", S["h2"]))
    flow.append(Paragraph(
        "Cyclowareness turns <b>real threats into measurable change in human behaviour</b>, "
        "in a loop that closes. A threat arrives, it is analysed, it becomes training, a "
        "named person approves that training, it reaches the people actually at risk, the "
        "result is measured, and the measurement updates the risk model that chooses who "
        "gets targeted next.", S["body"]))
    flow.append(Paragraph(
        "Ordinary awareness platforms run invented scenarios past everyone and count "
        "attendance. This one teaches from the attacks that reached <i>your</i> organisation, "
        "targets the people the evidence names, and reports behaviour rather than "
        "completion.", S["body"]))

    flow.append(Spacer(1, 6))
    flow.append(panel([
        ("The loop", "Intake &rarr; Analysis &rarr; Conversion &rarr; "
                     "<b>[human approval gate]</b> &rarr; Targeting &rarr; Training &rarr; "
                     "Measurement &rarr; Feedback"),
        ("The gate", "Nothing generated reaches an employee until a named analyst approves "
                     "it. Rejection requires a written reason."),
        ("Roles", "<b>Analyst</b> — the console and every decision. "
                  "<b>Executive</b> — posture without the run-by-run detail. "
                  "<b>Employee</b> — their own training and the report button."),
        ("Languages", "English and Azerbaijani, switchable on the sign-in screen and in the "
                      "user menu; the choice persists."),
    ]))

    flow.append(PageBreak())
    flow.append(Paragraph("The analyst's walkthrough", S["h2"]))
    flow.append(Paragraph(
        "These are the nine steps the in-app tour walks. Open it any time from the help menu "
        "(the life-ring icon, top right) &rarr; <b>Take the tour</b>.", S["body"]))
    flow.append(Spacer(1, 4))

    total = len(STEPS)
    for i, entry in enumerate(STEPS, start=1):
        title, route, paras = entry[0], entry[1], entry[2]
        note = entry[3] if len(entry) > 3 else None
        flow.append(step(i, total, f"{title} <font size=9 color='#666a72'>· {route}</font>",
                         paras, note))
        flow.append(Spacer(1, 2))

    flow.append(PageBreak())
    flow.append(Paragraph("The employee's two screens", S["h2"]))
    flow.append(Paragraph(
        "An employee signs in to a different product entirely: no queues, no analysis, no "
        "other people's records. Their tour is two steps.", S["body"]))
    flow.append(Spacer(1, 6))
    for i, (title, paras) in enumerate(EMPLOYEE_STEPS, start=1):
        flow.append(step(i, len(EMPLOYEE_STEPS), title, paras))

    flow.append(Spacer(1, 12))
    flow.append(rule())
    flow.append(Spacer(1, 12))
    flow.append(Paragraph("What the platform refuses to do", S["h2"]))
    flow.append(Paragraph(
        "These are design commitments, not settings — the reason a number on one of these "
        "screens can be quoted to a regulator.", S["body"]))
    flow.append(panel([
        ("Never invents a figure", "An unmeasured value renders as “not measured”, "
                                   "never as zero, and every rate carries its sample size."),
        ("Never bypasses the gate", "Generated content cannot reach an employee without a "
                                    "named approver, including through the automated "
                                    "finding&rarr;training pipeline."),
        ("Never executes a sample", "in the web application. Dynamic detonation is off-host "
                                    "and isolated, or it does not happen."),
        ("Never hides a limitation", "A degraded integration, an absent model, an "
                                     "unavailable analyzer — each is stated on the screen "
                                     "whose numbers it affects."),
        ("Never lets a job create an obligation", "The GRC watcher surfaces matches; only a "
                                                  "person turns one into a finding against "
                                                  "named people."),
    ]))

    flow.append(Spacer(1, 16))
    flow.append(Paragraph(
        "Cyclowareness is made by Safarov Industries Inc. This guide describes the platform "
        "as deployed; screens show each deployment's own data, and where that data is absent "
        "they say so.", S["note"]))

    doc.build(flow)


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "Cyclowareness-Tour-Guide.pdf")
    build(out)
    print(f"wrote {out} ({out.stat().st_size:,} bytes)")
