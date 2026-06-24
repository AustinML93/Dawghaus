#!/usr/bin/env python3
"""Generate DawgHaus PWA icons (purple square + gold 'W') with zero deps.
Writes a minimal PNG by hand using only the stdlib (zlib + struct)."""
import math, struct, zlib, os

PURPLE = (75, 46, 131)
GOLD = (232, 217, 168)
HERE = os.path.dirname(os.path.abspath(__file__))

# "W" stroke vertices in a 0..1 box; we draw thick segments through them.
W_PTS = [(0.20, 0.28), (0.36, 0.74), (0.50, 0.46), (0.64, 0.74), (0.80, 0.28)]
W_SEGS = list(zip(W_PTS, W_PTS[1:]))
STROKE = 0.085  # half-thickness in normalized units


def dist_to_seg(px, py, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def sample(nx, ny, maskable):
    """Return RGBA for a normalized point with 3x3 supersampling done by caller."""
    # Rounded-rect corners -> transparent (skip for maskable: full bleed).
    r = 0.0 if maskable else 0.22
    inside_bg = True
    if not maskable:
        # rounded rect test
        cx = min(max(nx, r), 1 - r)
        cy = min(max(ny, r), 1 - r)
        if math.hypot(nx - cx, ny - cy) > r:
            inside_bg = False
    if not inside_bg:
        return (0, 0, 0, 0)
    # Is this point on the W?
    dmin = min(dist_to_seg(nx, ny, a, b) for a, b in W_SEGS)
    if dmin <= STROKE:
        return (*GOLD, 255)
    return (*PURPLE, 255)


def render(size, maskable=False, ss=3):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # PNG filter type 0 per scanline
        for x in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    nx = (x + (sx + 0.5) / ss) / size
                    ny = (y + (sy + 0.5) / ss) / size
                    pr, pg, pb, pa = sample(nx, ny, maskable)
                    r += pr * pa; g += pg * pa; b += pb * pa; a += pa
            n = ss * ss
            if a == 0:
                raw += bytes((0, 0, 0, 0))
            else:
                raw += bytes((round(r / a), round(g / a), round(b / a), round(a / n)))
    return raw


def write_png(path, size, **kw):
    raw = render(size, **kw)

    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
           chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "x", size)


if __name__ == "__main__":
    write_png(os.path.join(HERE, "icon-192.png"), 192)
    write_png(os.path.join(HERE, "icon-512.png"), 512)
    write_png(os.path.join(HERE, "apple-touch-icon.png"), 180)
    write_png(os.path.join(HERE, "maskable-512.png"), 512, maskable=True)
