"""Delete `u.*` keys that no component renders.

The wire tool minted keys for a batch before checking every entry had a render
site (fixed since), and a site the regex could not rewrite also leaves its key
orphaned. `check:i18n` refuses both, correctly: a translated string nobody
reads is a comment. This removes exactly those keys, from both locale blocks,
and only ever touches the `u.` namespace this pipeline owns.
"""
import pathlib
import re

FRONTEND = pathlib.Path(__file__).resolve().parent.parent
SRC = FRONTEND / "src"
MESSAGES = SRC / "lib/i18n/messages.ts"

used = set()
for p in SRC.rglob("*.ts*"):
    if p == MESSAGES:
        continue
    used.update(re.findall(r"'(u\.[a-z0-9-]+)'", p.read_text(encoding="utf-8", errors="replace")))

src = MESSAGES.read_text(encoding="utf-8")
defined = set(re.findall(r"^  '(u\.[a-z0-9-]+)':", src, re.M))
dead = defined - used
print("defined u.*:", len(defined), " rendered:", len(defined & used), " dead:", len(dead))

for key in sorted(dead):
    # the entry is exactly two lines: `  'key':\n    'value',\n` — in BOTH blocks
    pattern = re.compile(r"^  '%s':\n    '(?:[^'\\]|\\.)*',\n" % re.escape(key), re.M)
    src, n = pattern.subn("", src)
    print("  removed %-52s x%d" % (key, n))

MESSAGES.write_text(src, encoding="utf-8")
print("done")
