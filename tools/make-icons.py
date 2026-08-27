#!/usr/bin/env python3
"""Generate the PNG icon set from a single vector description.

No dependencies: shapes are signed-distance fields, sampled once per pixel
with analytic antialiasing, and written out as PNG by hand.

    python3 tools/make-icons.py
"""
import struct
import zlib
from math import hypot

OUT = "icons"

GROUND = (13, 107, 82)      # --go
MARK = (247, 248, 246)      # --ground (light)
RULE = (247, 248, 246)      # tick marks, drawn at low alpha


def rounded_rect(x, y, cx, cy, half_w, half_h, radius):
    dx = abs(x - cx) - (half_w - radius)
    dy = abs(y - cy) - (half_h - radius)
    outside = hypot(max(dx, 0.0), max(dy, 0.0))
    inside = min(max(dx, dy), 0.0)
    return outside + inside - radius


def segment(x, y, ax, ay, bx, by, thickness):
    px, py = x - ax, y - ay
    bax, bay = bx - ax, by - ay
    denom = bax * bax + bay * bay
    t = 0.0 if denom == 0 else max(0.0, min(1.0, (px * bax + py * bay) / denom))
    return hypot(px - bax * t, py - bay * t) - thickness


def coverage(d, aa):
    """Distance -> alpha, smoothly across one pixel."""
    if d <= -aa:
        return 1.0
    if d >= aa:
        return 0.0
    t = (aa - d) / (2 * aa)
    return t * t * (3 - 2 * t)


def blend(dst, src, alpha):
    return tuple(round(d + (s - d) * alpha) for d, s in zip(dst, src))


def render(size, bleed=False, glyph_scale=0.52, background=None):
    """bleed=True fills the whole canvas (maskable / Apple); otherwise a rounded tile."""
    aa = 1.0 / size
    px = 1.0 / size
    rows = []
    for j in range(size):
        y = (j + 0.5) * px
        row = bytearray()
        for i in range(size):
            x = (i + 0.5) * px

            if bleed:
                ground_a = 1.0
            else:
                ground_a = coverage(rounded_rect(x, y, .5, .5, .5 - .045, .5 - .045, .215), aa)

            if ground_a <= 0.0:
                row += bytes((0, 0, 0, 0))
                continue

            colour = background or GROUND

            # Three checklist rules behind the mark, fading upward.
            for n, ty in enumerate((0.335, 0.5, 0.665)):
                d = segment(x, y, .5 - glyph_scale * .62, ty, .5 + glyph_scale * .62, ty,
                            glyph_scale * .035)
                a = coverage(d, aa) * (0.16 + 0.05 * n)
                if a > 0:
                    colour = blend(colour, RULE, a)

            # The tick: a short stroke into a long one.
            s = glyph_scale
            d1 = segment(x, y, .5 - s * .60, .5 + s * .06, .5 - s * .20, .5 + s * .46, s * .125)
            d2 = segment(x, y, .5 - s * .20, .5 + s * .46, .5 + s * .62, .5 - s * .50, s * .125)
            mark_a = max(coverage(d1, aa), coverage(d2, aa))
            if mark_a > 0:
                colour = blend(colour, MARK, mark_a)

            alpha = round(ground_a * 255)
            row += bytes((colour[0], colour[1], colour[2], alpha))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"{path}  {size}x{size}  {len(png) / 1024:.1f}kB")


if __name__ == "__main__":
    for size in (192, 512):
        write_png(f"{OUT}/icon-{size}.png", size, render(size))
    # Maskable: full bleed, glyph inside the 80% safe circle.
    for size in (192, 512):
        write_png(f"{OUT}/icon-maskable-{size}.png", size, render(size, bleed=True, glyph_scale=0.36))
    # iOS masks the corners itself and dislikes transparency.
    write_png(f"{OUT}/apple-touch-icon.png", 180, render(180, bleed=True, glyph_scale=0.44))
