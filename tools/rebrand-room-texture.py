"""
Re-brand the baked computer texture.

The room's models ship with a fictional computer maker printed on the monitor
bezel, the keyboard badge and both spec labels — the original author's own name
and joke. It is someone else's brand plate on the hardware in Jonas's portfolio,
so it gets replaced with his.

Everything is drawn back in the same place, at the same size, in the same
orientation, so the geometry and the UVs are untouched.


Run from the repo root, against a pristine copy of the shipped texture:

    python3 tools/rebrand-room-texture.py

It is idempotent only against the original file — running it twice over its own
output would letter on top of lettering, so keep a copy of the untouched texture
if you plan to change the wording.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
from inpaint import erase_ink

SRC = 'public/room/models/Computer/baked_computer.jpg'
F = '/System/Library/Fonts/Supplemental/'
BOLD_IT = F + 'Arial Bold Italic.ttf'
IT = F + 'Arial Italic.ttf'
REG = F + 'Arial.ttf'

# Two lines, one word each — the shape the original plate had, and the
# shape a 1990s hardware badge always had.
BRAND = 'Jonas'
SUB = 'Corp.'


def plate_colour(im, box, inset=3):
    """The label's own background, sampled just inside its edge."""
    x0, y0, x1, y1 = box
    edge = []
    for x in range(x0 + inset, x1 - inset):
        edge.append(im.getpixel((x, y0 + inset)))
        edge.append(im.getpixel((x, y1 - inset - 1)))
    for y in range(y0 + inset, y1 - inset):
        edge.append(im.getpixel((x0 + inset, y)))
        edge.append(im.getpixel((x1 - inset - 1, y)))
    edge.sort(key=lambda c: c[0] + c[1] + c[2])
    return edge[len(edge) // 2]



def letter(im, box, lines, turn=None):
    """
    Draw text straight onto the (already cleaned) plate, alpha-composited.

    `turn` is a PIL transpose applied to the text layer before compositing, for
    plates whose UVs do not sit the same way up as the atlas. Get it wrong and
    the plate renders back to front; the only reliable way to check is to render
    the room and read it.
    """
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    scale = 4
    layer = Image.new('RGBA', (w * scale, h * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for text, font_path, size, fill, xy in lines:
        font = ImageFont.truetype(font_path, int(size * scale))
        d.text((xy[0] * scale, xy[1] * scale), text, font=font, fill=fill + (255,))
    layer = layer.resize((w, h), Image.LANCZOS)
    if turn is not None:
        layer = layer.transpose(turn)
    region = im.crop(box).convert('RGBA')
    region.alpha_composite(layer)
    im.paste(region.convert('RGB'), (x0, y0))


def render_lines(lines, width, height, bg, scale=4):
    """Draw the replacement text into its own upright tile, then hand it back."""
    tile = Image.new('RGB', (width * scale, height * scale), bg)
    d = ImageDraw.Draw(tile)
    for text, font_path, size, fill, xy in lines:
        font = ImageFont.truetype(font_path, int(size * scale))
        d.text((xy[0] * scale, xy[1] * scale), text, font=font, fill=fill)
    return tile.resize((width, height), Image.LANCZOS)


def stamp(im, box, tile, transform=None):
    if transform:
        tile = transform(tile)
    im.paste(tile, (box[0], box[1]))


def main():
    im = Image.open(SRC).convert('RGB')

    # ---- 1. Monitor bezel ------------------------------------------------
    # The bezel's island sits *upside down* in the atlas — a 180-degree turn,
    # not a mirror, which is easy to mistake at this size and was worth two
    # wrong guesses. So the plate is lettered the right way up and turned over
    # on the way in. The globe beside it is generic and stays.
    box = (1330, 2640, 1585, 2745)
    erase_ink(im, box, thresh=12, pad=3)
    letter(im, box, [
        (BRAND, BOLD_IT, 44, (74, 74, 74), (6, 8)),
        (SUB, BOLD_IT, 23, (74, 74, 74), (8, 62)),
    ], turn=Image.ROTATE_180)

    # ---- 2. Keyboard badge -----------------------------------------------
    box = (2304, 1932, 2410, 1980)
    erase_ink(im, box, thresh=10, pad=2)
    letter(im, box, [
        (BRAND, BOLD_IT, 20, (105, 105, 105), (1, 2)),
        (SUB, IT, 11, (118, 118, 118), (3, 26)),
    ])

    # ---- 3. Tower spec label ---------------------------------------------
    # The whole plate is replaced: the original carried a paragraph of the other
    # author's copy, not just his name.
    box = (2782, 3300, 2990, 3406)
    w, h = box[2] - box[0], box[3] - box[1]
    bg = plate_colour(im, box, inset=1)
    ink = (176, 176, 176)
    dim = (150, 150, 150)
    tile = render_lines(
        [
            (f'{BRAND} {SUB} 2026 Showcase', BOLD_IT, 13, ink, (8, 8)),
            (SUB, BOLD_IT, 9, ink, (8, 23)),
            ('Making strangely specific computers', IT, 7, dim, (8, 40)),
            ('since 2026. This one was built to show', IT, 7, dim, (8, 49)),
            ('you what one interaction designer', IT, 7, dim, (8, 58)),
            ('can actually do.', IT, 7, dim, (8, 67)),
            ('Model No.   JK-1995-CPH', REG, 7, dim, (8, 82)),
            ('AC Input     230Vac 50Hz', REG, 7, dim, (8, 91)),
            (BRAND, BOLD_IT, 15, ink, (128, 72)),
            (SUB, IT, 8, dim, (130, 90)),
        ],
        w, h, bg,
    )
    stamp(im, box, tile)

    # ---- 4. Monitor spec label (rotated a quarter turn) ------------------
    box = (1700, 540, 1836, 716)
    w, h = box[2] - box[0], box[3] - box[1]
    bg = plate_colour(im, box, inset=1)
    ink = (176, 176, 176)
    dim = (150, 150, 150)
    # Drawn landscape, then turned to sit upright in the atlas.
    tile = render_lines(
        [
            (f'{BRAND} {SUB} 2026 Showcase', BOLD_IT, 13, ink, (8, 8)),
            (SUB, BOLD_IT, 9, ink, (8, 23)),
            ('Making strangely specific computers', IT, 7, dim, (8, 40)),
            ('since 2026. This one was built to show', IT, 7, dim, (8, 49)),
            ('you what one interaction designer can do.', IT, 7, dim, (8, 58)),
            ('Model No.   JK-1995-CPH', REG, 7, dim, (8, 74)),
            ('AC Input     230Vac 50Hz', REG, 7, dim, (8, 83)),
            ('Assembled in Copenhagen', REG, 7, dim, (8, 92)),
            (BRAND, BOLD_IT, 13, ink, (96, 56)),
            (SUB, IT, 7, dim, (98, 72)),
        ],
        h, w, bg,  # landscape: swap, then rotate
    )
    stamp(im, box, tile, lambda t: t.transpose(Image.ROTATE_90))

    # 88 with no chroma subsampling lands within ~15% of the shipped
    # file's size while keeping the small label text crisp — subsampling,
    # not quality, is what smears 7px type.
    im.save(SRC, quality=88, subsampling=0)
    print('rebranded', SRC)


if __name__ == '__main__':
    sys.exit(main())
