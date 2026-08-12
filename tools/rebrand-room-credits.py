"""
Re-typeset the credits sheet on the desk.

The room's decor texture ships with a printed credits page — the original
author's, naming himself as the developer of the site it was made for. It is a
prop lying on the desk in the 3D room, and in this portfolio it needed to be
Jonas's page.

Everyone whose work is actually in the room is still on it, and credited for the
thing they made. The point was never to remove the attribution; it was that the
page has an owner, and the owner is whoever's portfolio the room is standing in.

Run from the repo root, against a pristine copy of the shipped texture:

    python3 tools/rebrand-room-credits.py

Not idempotent — it letters onto a cleared page, so re-running over its own
output is fine, but changing the wording means starting from the original file.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

SRC = 'public/room/models/Decor/baked_decor_modified.jpg'

F = '/System/Library/Fonts/Supplemental/'
MONO = F + 'Courier New Bold.ttf'
MONO_REG = F + 'Courier New.ttf'

# The printed area of the sheet, inside its rounded corners. Everything here is
# cleared and re-set; the page's own paper tone is sampled, not assumed.
PAGE = (60, 150, 2020, 2820)

# Two columns, as the original had: a name on the left, what they did on the
# right. Centre-set headings sit across both.
LEFT = 150
RIGHT = 1090

INK = (86, 86, 88)


def sample_paper(im, box):
    """The paper's own tone, taken from four corners well clear of the text."""
    x0, y0, x1, y1 = box
    pts = [
        (x0 + 30, y0 + 30),
        (x1 - 30, y0 + 30),
        (x0 + 30, y1 - 30),
        (x1 - 30, y1 - 30),
    ]
    cols = [im.getpixel(p) for p in pts]
    return tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))


def main():
    im = Image.open(SRC).convert('RGB')
    paper = sample_paper(im, PAGE)

    # Draw at 2x and downsample: 1990s laser type on a 4096px atlas needs the
    # extra sampling or the thin strokes alias into mush.
    scale = 2
    w = (PAGE[2] - PAGE[0]) * scale
    h = (PAGE[3] - PAGE[1]) * scale
    page = Image.new('RGB', (w, h), paper)
    d = ImageDraw.Draw(page)

    title = ImageFont.truetype(MONO, 46 * scale)
    heading = ImageFont.truetype(MONO, 40 * scale)
    body = ImageFont.truetype(MONO_REG, 38 * scale)

    def centre(text, font, y):
        tw = d.textlength(text, font=font)
        d.text(((w - tw) / 2, y * scale), text, font=font, fill=INK)

    def row(left, right, y, font=body):
        d.text((LEFT * scale, y * scale), left, font=font, fill=INK)
        d.text((RIGHT * scale, y * scale), right, font=font, fill=INK)

    y = 60
    centre('"Jonas Kjeldmand Jensen', title, y)
    centre('Selected Works 2026"', title, y + 62)
    centre('CREDITS', heading, y + 150)

    y = 400
    centre('DEVELOPMENT', heading, y)
    row('Jonas Kjeldmand Jensen', 'All', y + 70)

    y = 640
    centre('SOUND DESIGN & MUSIC', heading, y)
    row('Jonas Kjeldmand Jensen', 'Sound & Music', y + 70)

    y = 880
    centre('MODELING & TEXTURING', heading, y)
    row('Henry Heffernan', 'Room + UV', y + 70)
    row('Mickael Boitte', 'Computer Model', y + 128)
    row('Sean Nicolas', 'Enviornment Models', y + 186)

    y = 1240
    centre('SPECIAL THANKS', heading, y)
    row('Henry Heffernan', 'Room & Models', y + 70)
    row('Yuteoctober', 'Windows 95 UI', y + 128)
    row('Isaiah Odhner', '98.js Programs', y + 186)

    y = 1600
    centre('INSPIRATIONS', heading, y)
    row('Bruno Simon', 'Jesse Zhou', y + 70)
    row('Pink Yellow', 'Vivek Patel', y + 128)

    y = 1900
    centre('Thank you so much for checking out', body, y)
    centre('my portfolio website <3', body, y + 58)

    im.paste(page.resize((w // scale, h // scale), Image.LANCZOS), (PAGE[0], PAGE[1]))

    # 88 with no chroma subsampling: subsampling, not quality, is what smears
    # small type, and this page is nothing but small type.
    im.save(SRC, quality=88, subsampling=0)
    print('re-typeset', SRC, os.path.getsize(SRC), 'bytes')


if __name__ == '__main__':
    sys.exit(main())
