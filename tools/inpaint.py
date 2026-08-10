"""Scanline inpainting: erase the dark ink and let the plate's shading survive."""
from PIL import Image


def erase_ink(im, box, thresh=28, pad=1):
    """
    Replace every pixel darker than its row's own paper tone with a linear
    interpolation between the nearest paper pixels either side of it.

    Filling the box with one flat colour leaves a visible rectangle wherever the
    surface is shaded — which on a moulded plastic bezel is everywhere. Working
    a row at a time and bridging across each run of ink keeps both the vertical
    and the horizontal gradient exactly as the bake left them.
    """
    x0, y0, x1, y1 = box
    px = im.load()
    for y in range(y0, y1):
        row = [px[x, y] for x in range(x0, x1)]
        lum = sorted(sum(c) / 3 for c in row)
        paper = lum[int(len(lum) * 0.75)]
        ink = [sum(c) / 3 < paper - thresh for c in row]
        # Grow the mask a little: JPEG leaves a halo around every glyph.
        grown = list(ink)
        for i, v in enumerate(ink):
            if not v:
                continue
            for j in range(max(0, i - pad), min(len(ink), i + pad + 1)):
                grown[j] = True

        i = 0
        while i < len(grown):
            if not grown[i]:
                i += 1
                continue
            j = i
            while j < len(grown) and grown[j]:
                j += 1
            left = row[i - 1] if i > 0 else row[j] if j < len(row) else (128,) * 3
            right = row[j] if j < len(row) else left
            span = j - i + 1
            for k in range(i, j):
                t = (k - i + 1) / span
                px[x0 + k, y] = tuple(
                    int(left[c] + (right[c] - left[c]) * t) for c in range(3)
                )
            i = j
