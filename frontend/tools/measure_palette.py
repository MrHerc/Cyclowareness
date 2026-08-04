"""Measure a candidate palette before adopting it.

Contrast is WCAG 2.1 relative luminance. Hue separation is measured in OKLCH,
not HSL: two colours 40 degrees apart in HSL can read as the same signal while
40 degrees apart in OKLCH generally do not, because OKLCH is perceptually
uniform and HSL is not.
"""
import math
import re
import sys


def _srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def parse(hexstr):
    h = hexstr.strip().lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(hexstr):
    r, g, b = (_srgb(v) for v in parse(hexstr))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _lin(c):
    return _srgb(c)


def oklch(hexstr):
    r, g, b = (_lin(v) for v in parse(hexstr))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    C = math.sqrt(A * A + B * B)
    H = math.degrees(math.atan2(B, A)) % 360
    return L, C, H


def hue_gap(a, b):
    _, _, ha = oklch(a)
    _, _, hb = oklch(b)
    d = abs(ha - hb) % 360
    return min(d, 360 - d)


def report(tokens):
    surfaces = ["void", "base", "surface", "elevated", "raised"]
    body = ["fg", "fg-muted", "fg-subtle", "fg-faint"]

    print("=== body text on every surface (AA needs 4.5) ===")
    worst = 999.0
    for f in body:
        row = []
        for s in surfaces:
            r = contrast(tokens[f], tokens[s])
            worst = min(worst, r)
            row.append(f"{s}:{r:5.2f}{'' if r >= 4.5 else ' FAIL'}")
        print(f"  {f:<10} " + "  ".join(row))
    print(f"  worst body ratio: {worst:.2f}")

    print("\n=== accent + severities on the card surface (need 3.0 non-text) ===")
    for key in ["brand", "brand-fg", "ai", "critical", "high", "medium", "low", "safe"]:
        if key not in tokens:
            continue
        r = contrast(tokens[key], tokens["surface"])
        print(f"  {key:<10} on surface {r:5.2f}{'' if r >= 3.0 else '  FAIL'}")

    print("\n=== text on the filled accent card (AA needs 4.5) ===")
    if "on-brand" in tokens:
        r = contrast(tokens["on-brand"], tokens["brand"])
        print(f"  on-brand on brand {r:5.2f}{'' if r >= 4.5 else '  FAIL'}")

    print("\n=== hue separation from the accent, OKLCH degrees ===")
    print("  (a status colour must not read as the accent; aim for 60+)")
    for key in ["critical", "high", "medium", "low", "safe", "ai"]:
        if key not in tokens:
            continue
        g = hue_gap(tokens["brand"], tokens[key])
        flag = "" if g >= 60 else ("  TIGHT" if g >= 45 else "  COLLIDES")
        print(f"  brand vs {key:<9} {g:5.1f}{flag}")


if __name__ == "__main__":
    path = sys.argv[1]
    text = open(path, encoding="utf-8").read()
    found = dict(re.findall(r"--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", text))
    report(found)
