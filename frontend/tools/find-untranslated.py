"""Every user-visible English string still outside t().

Three shapes, because they fail differently:

  JSX   — text sitting between tags: <p>Some sentence.</p>
  PROP  — a display prop given a literal: label="Some sentence"
  FIELD — a display field in an object literal: caveat: 'Some sentence'
          (the HonestMetric definition blocks, badge details, and their kin)

Props that carry behaviour rather than words (className, id, href, variant …)
are excluded by an allow-list of the props that actually reach a reader, which
is the opposite of a deny-list and therefore does not silently grow holes.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path("C:/Users/Safar/Desktop/Cyclowareness/.claude/worktrees/adoring-cori-f75dc2/frontend/src")

VISIBLE_PROPS = (
    "label|title|subtitle|headline|description|placeholder|hint|heading|blurb"
    "|emptyDescription|caption|tooltip|summary|aria-label|helpText|note|legend"
    "|confirmLabel|cancelLabel|submitLabel|actionLabel|emptyLabel|unit|suffix|prefix"
    "|emptyTitle|emptyMessage|retryLabel|sampleNoun|sourceDetail|unmeasuredReason"
    "|what|detail"
)

VISIBLE_FIELDS = (
    "calculation|caveat|sampleNoun|sourceDetail|unmeasuredReason|what|detail"
    "|hint|description|note"
)

# a JSX text run: >Some words< with no braces or tags inside
JSX_TEXT = re.compile(r">\s*([A-Z][^<>{}\n]{6,180}?)\s*<")
PROP_STR = re.compile(r'\b(' + VISIBLE_PROPS + r')=\{?["\']([^"\']{6,180})["\']')
# an object field: `caveat: 'Some sentence'` — single or double quoted, one line
FIELD_STR = re.compile(r"\b(" + VISIBLE_FIELDS + r")\s*:\s*['\"]([^'\"\n]{6,180})['\"]")

WORDS = re.compile(r"[A-Za-z]{2,}")
# a real sentence has at least two words and at least one lower-case run
LOWER = re.compile(r"[a-z]{3,}")

rows = []
for f in sorted(ROOT.rglob("*.tsx")):
    if "i18n" in f.as_posix():
        continue
    src = f.read_text(encoding="utf-8", errors="replace")
    rel = f.relative_to(ROOT).as_posix()
    seen_spans = set()
    for kind, rx, gi in (("JSX", JSX_TEXT, 1), ("PROP", PROP_STR, 2), ("FIELD", FIELD_STR, 2)):
        for m in rx.finditer(src):
            text = m.group(gi).strip()
            if len(WORDS.findall(text)) < 2 or not LOWER.search(text):
                continue
            if text.startswith(("http", "/", "#", "&")) or "${" in text:
                continue
            # a message KEY stored in a field the component later resolves with
            # t() — `detail: 'p.the-loop-stops-here'` — is already translated
            if re.fullmatch(r"[a-z]{1,4}\.[a-z0-9-]+", text):
                continue
            # PROP and FIELD patterns overlap on `label: '...'` inside objects
            span = (m.start(gi), text)
            if span in seen_spans:
                continue
            seen_spans.add(span)
            line = src.count("\n", 0, m.start()) + 1
            rows.append({"file": rel, "line": line, "kind": kind, "text": text})

out = pathlib.Path(sys.argv[1])
out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

by_file = {}
for r in rows:
    by_file[r["file"]] = by_file.get(r["file"], 0) + 1
print("untranslated user-visible strings:", len(rows), "across", len(by_file), "files")
print()
for f, n in sorted(by_file.items(), key=lambda kv: -kv[1])[:25]:
    print("%4d  %s" % (n, f))
