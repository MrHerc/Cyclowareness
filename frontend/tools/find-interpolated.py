"""Template-literal prose: the sentences that splice a value into words.

Only the ones that are really PROSE — a template with at least four words of
literal text around the interpolation. `${a} / ${b}` and `Run #${id}` are
identifiers, not sentences, and translating them would be noise.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path("src")
rows, seen = [], set()

# a JSX-embedded template literal: {`...${x}...`}
TPL = re.compile(r"\{`([^`]{25,300})`\}")

for f in sorted(list(ROOT.glob("features/**/*.tsx")) + list(ROOT.glob("pages/*.tsx"))
                + list(ROOT.glob("components/**/*.tsx"))):
    src = f.read_text(encoding="utf-8", errors="replace")
    for m in TPL.finditer(src):
        body = m.group(1)
        if "${" not in body:
            continue
        words = re.sub(r"\$\{[^}]*\}", " ", body).split()
        if len(words) < 5:
            continue          # an identifier or a fragment, not a sentence
        if body.strip().startswith("/"):
            continue          # a URL path
        key = (f.as_posix(), body)
        if key in seen:
            continue
        seen.add(key)
        rows.append({"file": f.as_posix(), "template": body})

out = pathlib.Path(sys.argv[1])
out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
print("interpolated sentences:", len(rows))
for r in rows[:14]:
    print("  %-42s %s" % (r["file"].replace("src/", "")[:42], " ".join(r["template"].split())[:64]))
