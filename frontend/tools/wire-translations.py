"""Wire a batch of user-visible strings onto the catalogue.

The mechanical half of translating this frontend, so the only thing authored by
hand is the Azerbaijani itself. Given `{english: azerbaijani}` it will:

  1. mint a key per unique English string (identical English shares one key),
  2. append both locales to `messages.ts`,
  3. rewrite every render site the scanner found, and
  4. put `const t = useT()` in whatever component the site turned out to be in.

Step 4 is the one that has to be structural rather than clever. An earlier
attempt inferred the insertion point from compiler-error line numbers and walked
back to "the nearest brace", which lands inside a destructured parameter list
and produced 44 syntax errors. This walks the file for a component header at
column 0 and inserts after its opening brace, and it verifies with `tsc` after
EVERY file — a file that fails is restored, not left half-applied.

Usage:  python tools/wire-translations.py <batch.json>
where batch.json is {"english string": "azərbaycanca", ...}.
"""
import json
import pathlib
import re
import subprocess
import sys

FRONTEND = pathlib.Path(__file__).resolve().parent.parent
SRC = FRONTEND / "src"
MESSAGES = SRC / "lib/i18n/messages.ts"
FOUND = FRONTEND.parent / "docs/untranslated-remaining.json"

VISIBLE_PROPS = (
    "label|title|subtitle|headline|description|placeholder|hint|heading|blurb"
    "|emptyDescription|caption|tooltip|summary|aria-label|helpText|note|legend"
    "|confirmLabel|cancelLabel|submitLabel|actionLabel|emptyLabel|unit|suffix|prefix"
    "|emptyTitle|emptyMessage|retryLabel|sampleNoun|sourceDetail|unmeasuredReason"
    "|what|detail"
)

# KEEP THIS IN STEP WITH `find-untranslated.py`. The scanner found `label:` and
# `title:` inside object literals and this list did not carry them, so the tool
# minted a key for every one of those strings and then rewrote none of their
# render sites — 43 files reported "skipped" and 177 keys landed in the
# catalogue rendered by nothing, which is exactly what `check:i18n` exists to
# reject. A scanner and a writer that disagree about what a display field is
# will always produce orphans.
VISIBLE_FIELDS = (
    "calculation|caveat|sampleNoun|sourceDetail|unmeasuredReason|what|detail"
    "|hint|description|note|label|title|subtitle|summary|blurb|caption"
)

# a component whose body can hold a hook: `function X(`, `export function X(`,
# `const X = (` / `= function` / `= forwardRef(` — all at column 0.
COMPONENT = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*[:=])", re.M)


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return "-".join(s.split("-")[:7])[:56].strip("-")


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


def tsc():
    # NOT `shell=True`. With a list argv that is a Windows-only spelling: POSIX
    # hands the list to the shell as `$0 $1 ...`, so it ran a bare `npx`, got a
    # usage message and exit 0, and every file "passed" the check that exists to
    # restore a broken one. The guard has to be able to fail on the machine it
    # runs on.
    r = subprocess.run(["npx", "tsc", "--noEmit", "-p", "tsconfig.app.json"],
                       cwd=FRONTEND, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        return False, (r.stdout or "") + (r.stderr or "")
    # tsc is not the whole gate. Step 4 puts `const t = useT()` wherever a
    # rewritten line lives, and it can land in a plain exported function that
    # merely LOOKS like a component — `signInFailure(error)` took one and
    # compiled clean, because calling a hook outside a component is a React
    # rule, not a type error. oxlint's rules-of-hooks is what catches it, so a
    # file is only accepted once both agree.
    r = subprocess.run(["npx", "oxlint", "src"], cwd=FRONTEND, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    return r.returncode == 0, (r.stdout or "") + (r.stderr or "")


def add_keys(pairs):
    """pairs: {key: (en, az)} — append to both locale blocks, skipping any that exist."""
    src = MESSAGES.read_text(encoding="utf-8")
    fresh = {k: v for k, v in pairs.items() if ("'%s'" % k) not in src}
    if not fresh:
        return 0

    def block(i):
        return "".join("  '%s':\n    '%s',\n" % (k, esc(v[i]))
                       for k, v in sorted(fresh.items()))

    at = src.index("} as const")
    src = src[:at] + block(0) + src[at:]
    at = src.rindex("\n}\n\nexport const MESSAGES")
    src = src[:at] + "\n" + block(1).rstrip("\n") + src[at:]
    MESSAGES.write_text(src, encoding="utf-8")
    return len(fresh)


def ensure_translator(text, path):
    """Import `useT` and call it in every component that now needs one.

    Runs AFTER the replacements, driven by `tsc`'s own "Cannot find name 't'"
    — so a component that already had a translator is left alone.
    """
    if "lib/i18n" not in text:
        depth = len(path.relative_to(SRC).parts) - 1
        up = "../" * depth if depth else "./"
        anchor = re.search(r"^import .*\n", text, re.M)
        at = anchor.end() if anchor else 0  # a file with no imports at all
        text = text[:at] + "import { useT } from '%slib/i18n'\n" % up + text[at:]
    elif not re.search(r"\buseT\b", text):
        m = re.search(r"import \{([^}]*)\} from '([^']*lib/i18n)'", text)
        if m:
            text = text[:m.start(1)] + " useT," + m.group(1) + text[m.end(1):]
    return text


def inject_t(path, lines_needing_t):
    """Put `const t = useT()` at the top of each component that owns a bad line."""
    text = path.read_text(encoding="utf-8")
    text = ensure_translator(text, path)
    lines = text.split("\n")

    starts = sorted({m.start() for m in COMPONENT.finditer(text)})
    offsets, run = [], 0
    for ln in lines:
        offsets.append(run)
        run += len(ln) + 1

    targets = set()
    for lineno in lines_needing_t:
        pos = offsets[min(lineno - 1, len(offsets) - 1)]
        owner = max((s for s in starts if s <= pos), default=None)
        if owner is None:
            continue
        # the component's body starts at the first `{` that closes its signature
        depth, i = 0, owner
        while i < len(text):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
            elif text[i] == "{" and depth == 0:
                break
            i += 1
        targets.add(text.count("\n", 0, i) + 1)

    for lineno in sorted(targets, reverse=True):
        indent = re.match(r"\s*", lines[lineno - 1]).group(0)
        lines.insert(lineno, indent + "  const t = useT()")
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    batch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    found = json.loads(FOUND.read_text(encoding="utf-8"))

    # Only mint keys for strings the scanner actually located. A batch entry
    # with no render site would become a defined-but-unrendered key, which
    # `check:i18n` rightly rejects.
    onscreen = {row["text"] for row in found}
    dropped = [en for en in batch if en not in onscreen]
    batch = {en: az for en, az in batch.items() if en in onscreen}
    if dropped:
        print("no render site, skipped:", len(dropped))
        for en in dropped[:10]:
            print("   -", en[:60])

    keys, taken = {}, set(re.findall(r"'(u\.[a-z0-9-]+)'", MESSAGES.read_text(encoding="utf-8")))
    for en in batch:
        base = "u." + slug(en)
        key, n = base, 2
        while key in taken:
            key, n = "%s-%d" % (base, n), n + 1
        taken.add(key)
        keys[en] = key

    print("keys:", add_keys({keys[en]: (en, az) for en, az in batch.items()}))

    by_file = {}
    for row in found:
        if row["text"] in batch:
            by_file.setdefault(row["file"], []).append(row)

    done = skipped = 0
    for rel, rows in sorted(by_file.items()):
        path = SRC / rel
        if not path.exists():
            continue
        before = path.read_text(encoding="utf-8")
        text, hits = before, 0
        for row in rows:
            key, lit = keys[row["text"]], re.escape(row["text"])
            if row["kind"] == "JSX":
                new, n = re.subn(r">(\s*)%s(\s*)<" % lit, r">\1{t('%s')}\2<" % key, text)
            elif row["kind"] == "FIELD":
                # `caveat: 'Some sentence'` -> `caveat: t('key')` — only valid
                # inside a component; a module-scope constant fails tsc and the
                # file is restored, same as every other case.
                new, n = re.subn(r"\b(%s)(\s*):(\s*)[\"']%s[\"']" % (VISIBLE_FIELDS, lit),
                                 r"\1\2:\3t('%s')" % key, text)
            else:
                new, n = re.subn(r"\b(%s)=\{?[\"']%s[\"']\}?" % (VISIBLE_PROPS, lit),
                                 r"\1={t('%s')}" % key, text)
            if n:
                text, hits = new, hits + n
        if not hits:
            skipped += 1
            continue
        path.write_text(text, encoding="utf-8")

        ok, out = tsc()
        if not ok:
            bad = [int(m) for m in re.findall(
                re.escape(("src/" + rel)) + r"\((\d+),\d+\): error TS2304: Cannot find name 't'", out)]
            if bad:
                try:
                    inject_t(path, bad)
                except Exception as exc:  # noqa: BLE001 — restore, never abort the batch
                    out = "inject_t: %s" % exc
                else:
                    ok, out = tsc()
        if ok:
            done += 1
            print("  ok  %-52s %d" % (rel, hits))
        else:
            path.write_text(before, encoding="utf-8")
            skipped += 1
            print("  RESTORED %-47s %s" % (rel, out.strip().split("\n")[0][:80]))

    print("\nfiles wired: %d   skipped: %d" % (done, skipped))


if __name__ == "__main__":
    main()
