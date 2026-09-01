"""
Turn a big picture of pixel art into a 32x32 desktop icon.

Every icon in `src/assets/icons` is a 32x32 RGBA PNG, and pixel art found on
the internet almost never is: it arrives as a 999x1091 export with each art
pixel blown up to a ~54px block, soft edges from whatever resampled it on the
way, and a flat white background instead of transparency. Handing that to a
plain resize gives you a blurry grey-fringed smudge, because averaging across
block boundaries is exactly what you do not want here.

So this does the three things a naive resize cannot:

  1. Finds the real pixel grid, by looking for the columns and rows where the
     image actually changes colour. The spacing between those edges is the
     block size, and the art's true dimensions fall out of it.
  2. Reads one colour per block — the commonest colour in the middle 30% of it,
     so the soft edges get no vote — then snaps every block to a small palette
     built from the colours that actually recur. That is what removes the
     resampling fringe rather than blurring it.
  3. Scales the recovered art to fill 32px of height with nearest-neighbour and
     drops it on a transparent canvas, so the result is crisp and sits at the
     same visual weight as the icons already on the desktop.

Used for `obsidianIcon.png`. Run it from the repo root:

    python3 tools/pixel-icon.py ~/Desktop/some-art.png src/assets/icons/fooIcon.png

Then register the name in `src/assets/icons/index.ts` — an import at the top
and a line in the `icons` map — and it becomes a usable `IconName`.

Add --preview to also write an 8x blow-up beside the output, which is the only
practical way to check a 32x32 file before it is on the desktop.
"""

import sys
from collections import Counter

from PIL import Image

# Below this, a pixel is background rather than art.
WHITE = 235
# Two colours closer together than this in RGB are the same colour with
# resampling noise on top.
PALETTE_MERGE = 30
# Fraction of the strongest edge that still counts as a grid line.
EDGE_THRESHOLD = 0.30
SIZE = 32


def content_box(im):
    """The bounding box of everything that is not background white."""
    px = im.convert("RGBA").load()
    w, h = im.size
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 8 and not (r > WHITE and g > WHITE and b > WHITE):
                xs.append(x)
                ys.append(y)
    if not xs:
        raise SystemExit("That image is blank — nothing but background.")
    return min(xs), min(ys), max(xs), max(ys)


def grid_pitch(im, box):
    """
    The block size, from the spacing of the image's own colour changes.

    Summing the absolute colour difference between neighbouring columns gives a
    signal that spikes wherever a grid line is, because that is the only place
    a lot of rows change at once. The median gap between spikes is the pitch.
    Sampling every third line keeps this quick on a megapixel source without
    changing the answer.
    """
    px = im.convert("RGB").load()
    x0, y0, x1, y1 = box

    def edges(along_x):
        lo, hi = (x0, x1) if along_x else (y0, y1)
        other = range(y0, y1 + 1, 3) if along_x else range(x0, x1 + 1, 3)
        signal = []
        for i in range(lo, hi):
            total = 0
            for j in other:
                p = px[i, j] if along_x else px[j, i]
                q = px[i + 1, j] if along_x else px[j, i + 1]
                total += abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])
            signal.append((i, total))

        peak = max(v for _, v in signal) * EDGE_THRESHOLD
        found, run = [], []
        for pos, v in signal:
            if v > peak:
                run.append(pos)
            elif run:
                found.append(sum(run) // len(run))
                run = []
        if run:
            found.append(sum(run) // len(run))
        return found

    gaps = []
    for along_x in (True, False):
        found = edges(along_x)
        gaps += [b - a for a, b in zip(found, found[1:])]
    if not gaps:
        raise SystemExit("Could not find a pixel grid — is this actually pixel art?")

    gaps.sort()
    # The median gap, not the mean: a run of blocks sharing a colour shows up
    # as one wide gap, and a handful of those would drag an average badly.
    return max(1.0, float(gaps[len(gaps) // 2]))


def recover(im, box, pitch):
    """One colour per block, snapped to the palette the art actually uses."""
    px = im.convert("RGB").load()
    x0, y0, x1, y1 = box
    cols = max(1, round((x1 - x0 + 1) / pitch))
    rows = max(1, round((y1 - y0 + 1) / pitch))
    bw = (x1 - x0 + 1) / cols
    bh = (y1 - y0 + 1) / rows

    raw = {}
    for r in range(rows):
        for c in range(cols):
            cx0, cx1 = int(x0 + c * bw + bw * 0.35), int(x0 + c * bw + bw * 0.65)
            cy0, cy1 = int(y0 + r * bh + bh * 0.35), int(y0 + r * bh + bh * 0.65)
            counts = Counter()
            for y in range(cy0, max(cy0 + 1, cy1 + 1)):
                for x in range(cx0, max(cx0 + 1, cx1 + 1)):
                    counts[px[x, y]] += 1
            raw[(c, r)] = counts.most_common(1)[0][0]

    def distance(a, b):
        return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5

    # Commonest colours first, so the representative kept for each cluster is
    # the real one and the discarded neighbours are its resampling artefacts.
    palette = []
    for colour, _ in Counter(raw.values()).most_common():
        if all(distance(colour, p) > PALETTE_MERGE for p in palette):
            palette.append(colour)

    art = Image.new("RGBA", (cols, rows), (0, 0, 0, 0))
    out = art.load()
    for (c, r), colour in raw.items():
        snapped = min(palette, key=lambda p: distance(colour, p))
        if snapped[0] > WHITE and snapped[1] > WHITE and snapped[2] > WHITE:
            out[c, r] = (0, 0, 0, 0)
        else:
            out[c, r] = snapped + (255,)
    return art


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if len(args) != 2:
        raise SystemExit(
            "usage: python3 tools/pixel-icon.py <source.png> <dest.png> [--preview]"
        )
    source, dest = args

    im = Image.open(source)
    box = content_box(im)
    pitch = grid_pitch(im, box)
    art = recover(im, box, pitch)

    # Fill the height and centre horizontally. Height rather than width because
    # every icon on this desktop is read in a column, where a consistent height
    # is what makes them look like a set.
    w = max(1, round(art.width * SIZE / art.height))
    scaled = art.resize((min(w, SIZE), SIZE), Image.NEAREST)
    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    icon.paste(scaled, ((SIZE - scaled.width) // 2, 0))
    icon.save(dest)

    print(f"{source}: {art.width}x{art.height} art at ~{pitch:.0f}px blocks")
    print(f"wrote {dest} ({scaled.width}x{SIZE} on a {SIZE}x{SIZE} canvas)")

    if "--preview" in sys.argv:
        preview = dest.replace(".png", "-preview.png")
        icon.resize((SIZE * 8, SIZE * 8), Image.NEAREST).save(preview)
        print(f"wrote {preview}")


if __name__ == "__main__":
    main()
