"""Every user-visible English string still outside t().

Run it:

    python tools/find-untranslated.py                 # report to stdout
    python tools/find-untranslated.py out.json        # ... and write the rows
    python tools/find-untranslated.py --self-test     # prove the scanner still works

THE PATH USED TO BE ABSOLUTE, and pointed at a git worktree on one Windows
machine: `C:/Users/Safar/Desktop/Cyclowareness/.claude/worktrees/.../frontend/src`.
So the tool crashed on every other checkout, which meant nobody ran it, which
meant "the translation backlog is done" rested on a scanner that had not
executed since the day it was written. It is resolved from this file's own
location now.

SHAPES, because untranslated text fails in more than one way. Each shape below
was a real class of miss found by rendering the signed-in product in `az` and
reading what came out in English:

  JSX      text sitting between tags: <p>Some sentence.</p>
  JSXML    the same, wrapped across several lines — the old pattern forbade
           newlines inside the run, so every paragraph long enough to wrap was
           invisible to it
  PROP     a display prop given a literal: label="Some sentence"
  FIELD    a display field in an object literal: caveat: 'Some sentence'
  BRACE    a literal inside a JSX expression container:
           {file ? file.name : 'No file chosen yet.'} — braces put it out of
           reach of the JSX pattern and it is rendered all the same
  TEMPL    a template literal with an interpolation:
           `Up to ${maxMb} MB. Content is identified by its bytes...` — these
           were skipped wholesale on the reasoning that a `${}` means the string
           is computed, but the prose around the hole is still prose

ONE-WORD LABELS COUNT. The old rule required two words, so `label="Password"`
on the sign-in screen — the first control the first user touches — was out of
scope by construction, along with 132 others like it. A word is a word.

WHAT IS DELIBERATELY NOT A FINDING:

  * an English literal that sits beside its own translation key, which is the
    `{label: 'Command Center', labelKey: 'nav.command-center'}` shape in
    `app/navigation.ts`: the literal is the fallback, the key is what renders.
    Flagging those buried the real findings under 267 false ones.
  * message keys stored in a field the component later resolves — `detail:
    'p.the-loop-stops-here'`.
  * URLs, identifiers, and anything with no lower-case run (`SHA-256`, `MITRE`).

Props that carry behaviour rather than words (className, id, href, variant …)
are excluded by an allow-list of the props that actually reach a reader, which
is the opposite of a deny-list and therefore does not silently grow holes.
"""
import json
import pathlib
import re
import sys

#: `frontend/tools/find-untranslated.py` -> `frontend/src`.
ROOT = pathlib.Path(__file__).resolve().parents[1] / "src"

VISIBLE_PROPS = (
    "label|title|subtitle|headline|description|placeholder|hint|heading|blurb"
    "|emptyDescription|caption|tooltip|summary|aria-label|helpText|note|legend"
    "|confirmLabel|cancelLabel|submitLabel|actionLabel|emptyLabel|unit|suffix|prefix"
    "|emptyTitle|emptyMessage|retryLabel|sampleNoun|sourceDetail|unmeasuredReason"
    "|what|detail"
)

VISIBLE_FIELDS = (
    "calculation|caveat|sampleNoun|sourceDetail|unmeasuredReason|what|detail"
    "|hint|description|note|label|title|subtitle|summary|blurb|caption"
)

# A JSX text run: >Some words< with no braces or tags inside.
#
# The `(?<![=!<>])` and `(?![=])` guards are what stop an arrow function
# followed by a comparison from reading as markup:
#     .filter((i) => RANK[i.status] <= RANK.connected)
#                 ^^ the `>` of `=>` ... and the `<` of `<=` ^^
# which is how `RANK[integration.status]` ended up in the report as a string
# somebody was supposed to translate. It was written off as a scanner artefact
# and left in the count for weeks; it is a two-character fix.
JSX_TEXT = re.compile(r"(?<![=!<>])>\s*([A-Z][^<>{}\n]{6,180}?)\s*<(?![=])")
# the same across line breaks — `re.S` plus an explicit newline requirement, so
# this shape reports only what the single-line pattern above cannot see
JSX_MULTILINE = re.compile(r"(?<![=!<>])>\s*([A-Z][^<>{}]{20,300}?)\s*<(?![=])", re.S)
PROP_STR = re.compile(r'\b(' + VISIBLE_PROPS + r')=\{?["\']([^"\']{2,180})["\']')
# an object field: `caveat: 'Some sentence'` — single or double quoted, one line
FIELD_STR = re.compile(r"\b(" + VISIBLE_FIELDS + r")\s*:\s*['\"]([^'\"\n]{2,180})['\"]")
# a string literal inside a JSX expression container: {x ? 'a' : 'b'}
BRACE_STR = re.compile(r"\{[^{}]*?['\"]([^'\"\n]{6,180})['\"][^{}]*?\}")
# a template literal carrying an interpolation
TEMPLATE = re.compile(r"`([^`]{6,300})`", re.S)

WORDS = re.compile(r"[A-Za-z]{2,}")
# a real sentence has at least one lower-case run; `SHA-256` and `MITRE` do not
LOWER = re.compile(r"[a-z]{3,}")
# text that is already Azerbaijani is not a finding
AZ = re.compile(r"[əğışçöüĞIŞÇÖÜƏ]")
# `p.some-key`, `nav.command-center`, `shell.signOut` — a dotted identifier,
# not prose. The camelCase tail matters: `shell.signOut` reached the report
# because the original pattern only allowed a lower-case-and-hyphen tail.
KEY_LIKE = re.compile(r"[a-z]{1,6}(\.[A-Za-z0-9_-]+)+")
INTERPOLATION = re.compile(r"\$\{[^}]*\}")
# `radial-gradient(...)`, `calc(...)`, `var(--x)` — a style value, not a string
# anybody reads. These arrive through the same braces as prose does.
CSS_VALUE = re.compile(
    r"\b(radial-gradient|linear-gradient|conic-gradient|calc|var|rgba?|hsla?|"
    r"translate[XYZ3d]*|cubic-bezier|clamp|minmax|url)\s*\(",
    re.I,
)

#: How far to look for a `<field>Key` sibling that proves the literal beside it
#: is only a fallback. One entry of `app/navigation.ts` is ~180 characters.
_SIBLING_WINDOW = 400

#: A literal inside braces is usually a class list, not a sentence. Matching
#: those made BRACE the loudest shape in the report and every one of them noise,
#: which is the failure mode that gets a scanner ignored. Two filters, because
#: neither alone is enough: where the string sits, and what it looks like.
_STYLING_CONTEXT = re.compile(r"(className|class)\s*=\s*$|\b(cn|cx|clsx|twMerge)\(\s*$")
#: `flex items-start gap-2 rounded-control border px-3` — every token is a
#: utility class. Prose has words in it that are not hyphenated fragments.
#: The `[...]` alternative carries Tailwind's arbitrary values, which may hold
#: parentheses and arithmetic: `h-[calc(100vh-3.5rem)]`.
_UTILITY_TOKEN = re.compile(
    r"^[a-z0-9]+([-:/.][a-z0-9%.]*(\[[^\]]*\])?[a-z0-9%.]*)+$"
    r"|^\[[^\]]*\]$"
    r"|^[a-z]{1,6}$"
)


def _looks_like_css(text: str) -> bool:
    tokens = text.split()
    if len(tokens) < 2:
        return False
    return all(_UTILITY_TOKEN.fullmatch(t) for t in tokens)


def _in_styling_context(src: str, at: int) -> bool:
    return _STYLING_CONTEXT.search(src[max(0, at - 60) : at]) is not None


def _enclosing_object(src: str, at: int) -> str:
    """The `{ … }` this position sits directly inside, or a bounded window.

    Scanning a fixed ±400 characters was the obvious version and it was wrong:
    in a compact array the window reaches into the NEXT entry, so one item
    carrying `labelKey` silently vouched for its neighbours. Caught by the
    self-test fixture, where two array entries sit on consecutive lines and only
    the first has a key.
    """
    depth, start = 0, None
    for i in range(at, max(0, at - _SIBLING_WINDOW) - 1, -1):
        if src[i] == "}":
            depth += 1
        elif src[i] == "{":
            if depth == 0:
                start = i
                break
            depth -= 1
    if start is None:
        return ""
    depth, end = 0, len(src)
    for i in range(start, min(len(src), start + _SIBLING_WINDOW * 2)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    return src[start:end]


def _has_translation_sibling(src: str, field: str, at: int) -> bool:
    """Is there a `<field>Key:` in the SAME object literal as this string?

    `{label: 'Command Center', labelKey: 'nav.command-center'}` renders the key
    and keeps the English as a fallback, so the literal is correct as written.
    """
    obj = _enclosing_object(src, at)
    return bool(obj) and re.search(rf"\b{re.escape(field)}Key\s*[:=]", obj) is not None


def _is_prose(text: str, *, min_words: int = 1) -> bool:
    text = text.strip()
    if len(WORDS.findall(text)) < min_words:
        return False
    if not LOWER.search(text):
        return False
    if AZ.search(text):
        return False
    if text.startswith(("http", "/", "#", "&", ".", "@")):
        return False
    if KEY_LIKE.fullmatch(text):
        return False
    if CSS_VALUE.search(text):
        return False
    # `translate-y-1` and friends: a Tailwind class is not a sentence
    if re.fullmatch(r"[a-z0-9:_\-\[\]./%]+", text):
        return False
    return True


def scan(root: pathlib.Path) -> list[dict]:
    rows: list[dict] = []
    for f in sorted([*root.rglob("*.tsx"), *root.rglob("*.ts")]):
        if "i18n" in f.as_posix() or f.name.endswith(".d.ts"):
            continue
        src = f.read_text(encoding="utf-8", errors="replace")
        rel = f.relative_to(root).as_posix()
        is_tsx = f.suffix == ".tsx"
        seen: set[tuple[int, str]] = set()

        shapes = [("PROP", PROP_STR, 2, 1), ("FIELD", FIELD_STR, 2, 1)]
        if is_tsx:
            # JSX shapes only mean anything in a file that renders JSX
            shapes += [
                ("JSX", JSX_TEXT, 1, None),
                ("JSXML", JSX_MULTILINE, 1, None),
                ("BRACE", BRACE_STR, 1, None),
                ("TEMPL", TEMPLATE, 1, None),
            ]

        for kind, rx, group, field_group in shapes:
            for m in rx.finditer(src):
                text = " ".join(m.group(group).split())
                if kind == "TEMPL":
                    # only the interpolated ones; a plain backtick string is
                    # already covered by the other shapes
                    if not INTERPOLATION.search(text):
                        continue
                    text = INTERPOLATION.sub("…", text)
                if kind in ("JSX", "JSXML", "BRACE", "TEMPL"):
                    if not _is_prose(text, min_words=2):
                        continue
                    if kind == "JSXML" and "\n" not in m.group(group):
                        continue  # the single-line pattern already has it
                    if kind == "BRACE":
                        if _looks_like_css(text) or _in_styling_context(src, m.start(group)):
                            continue
                        # Prose starts like prose. Without this the pattern also
                        # captured fragments of expressions it had run through,
                        # e.g. `>{technologies.join(`.
                        if not (text[:1].isupper() or re.search(r"[.?!]", text)):
                            continue
                else:
                    # a display prop or field: one word is enough to be visible
                    if not _is_prose(text):
                        continue
                    field = m.group(field_group)
                    if _has_translation_sibling(src, field, m.start()):
                        continue
                span = (m.start(group), text)
                if span in seen:
                    continue
                seen.add(span)
                rows.append(
                    {
                        "file": rel,
                        "line": src.count("\n", 0, m.start()) + 1,
                        "kind": kind,
                        "text": text,
                    }
                )
    return rows


# --- self-test ----------------------------------------------------------------
#
# ON A FIXTURE, NOT ON THE APPLICATION. The first version of this asserted that
# the scanner still found `label="Password"` in `features/auth/SignInForm.tsx`.
# It did — until that string was translated, at which point the self-test failed
# and reported the scanner as broken. A check that goes red when the codebase
# gets BETTER is a check that will be deleted. The fixture below cannot be fixed
# out from under it: each file is one shape, and the pairs record what this
# scanner is for.

_FIXTURE = {
    "shapes.tsx": """
        export function Shapes() {
          return (
            <div>
              <p>Every finding here is a shape that was missed once.</p>
              <Field label="Password" />
              <Note hint={`Up to ${max} MB. Content is identified by its bytes.`} />
              <span>{file ? file.name : 'No file chosen yet.'}</span>
              <p>
                A sentence long enough to wrap across two source lines, which the
                single-line pattern could never see.
              </p>
              <div className="flex items-center gap-2 rounded-control border px-3" />
              <Chip label={t('u.already-translated')} />
              <Bar style={{ background: 'radial-gradient(600px 400px at 50% 50%)' }} />
              <Row onPick={() => RANK[row.status] <= RANK.ok} />
            </div>
          )
        }
    """,
    "catalogue.ts": """
        export const NAV = [
          { label: 'Live operational picture', labelKey: 'nav.command-center.hint' },
          { label: 'Where the risk concentrates' },
        ]
    """,
}

#: (fixture file, fragment) the scanner MUST report.
_MUST_FIND = [
    ("shapes.tsx", "Password"),                       # PROP, one word
    ("shapes.tsx", "No file chosen yet."),            # BRACE
    ("shapes.tsx", "Content is identified by its"),   # TEMPL, interpolated
    ("shapes.tsx", "wrap across two source lines"),   # JSXML, multi-line
    ("catalogue.ts", "Where the risk concentrates"),  # FIELD in a .ts file
]
#: ... and what it MUST NOT, because each of these drowned a real report.
_MUST_NOT_FIND = [
    ("catalogue.ts", "Live operational picture"),  # has a labelKey sibling
    ("shapes.tsx", "flex items-center"),           # Tailwind classes
    ("shapes.tsx", "radial-gradient"),             # a CSS value
    ("shapes.tsx", "RANK["),                       # `=>` … `<=` read as markup
    ("shapes.tsx", "u.already-translated"),        # a key, not prose
]


def self_test() -> int:
    """A scanner nobody can trust is a scanner nobody runs."""
    import tempfile
    import textwrap

    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for name, body in _FIXTURE.items():
            (root / name).write_text(textwrap.dedent(body), encoding="utf-8")
        rows = scan(root)

    found = {(r["file"], r["text"]) for r in rows}
    failures = []
    for path, text in _MUST_FIND:
        if not any(f == path and text in t for f, t in found):
            failures.append(f"MISSED   {path}: {text!r}")
    for path, text in _MUST_NOT_FIND:
        if any(f == path and text in t for f, t in found):
            failures.append(f"FALSE +  {path}: {text!r}")
    for line in failures:
        print(line)
    total = len(_MUST_FIND) + len(_MUST_NOT_FIND)
    if failures:
        print(f"\nself-test FAILED ({len(failures)} of {total} cases)")
        return 1
    print(f"self-test passed ({total} cases: {len(_MUST_FIND)} found, "
          f"{len(_MUST_NOT_FIND)} correctly ignored)")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    if "--self-test" in args:
        raise SystemExit(self_test())

    rows = scan(ROOT)
    if args:
        pathlib.Path(args[0]).write_text(
            json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8"
        )

    by_file: dict[str, int] = {}
    by_kind: dict[str, int] = {}
    for r in rows:
        by_file[r["file"]] = by_file.get(r["file"], 0) + 1
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1

    print("untranslated user-visible strings:", len(rows), "across", len(by_file), "files")
    print()
    print("by shape:")
    for k, n in sorted(by_kind.items(), key=lambda kv: -kv[1]):
        print("%6d  %s" % (n, k))
    print()
    print("worst files:")
    for f, n in sorted(by_file.items(), key=lambda kv: -kv[1])[:25]:
        print("%6d  %s" % (n, f))
