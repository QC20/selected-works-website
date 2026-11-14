/**
 * The small things around the pet: particles, toys, treats, the bowl.
 * --------------------------------------------------------------------
 * These used to be text — ♥ ♪ ✦ and an emoji droplet — set in the system
 * font, which is the single most cartoonish thing on the whole layer: a
 * full-colour emoji raindrop next to a 32px pixel animal. Now they are tiny
 * bitmaps in the same palette family as the animals, drawn once into a
 * canvas and handed out as data URLs, so the CSS animations in `App.css`
 * can keep doing the floating and fading exactly as before.
 *
 * Deliberately small and few. A heart here is five pixels across. The
 * animal's body language — the squint, the lean, the tail — is meant to
 * carry the emotion; the particle is a footnote.
 */

export type SpriteName =
    | 'heart'
    | 'note'
    | 'sparkle'
    | 'star'
    | 'crumb'
    | 'sweat'
    | 'zed'
    | 'spark'
    | 'bubble'
    | 'dust'
    | 'badge'
    | 'ball'
    | 'yarn'
    | 'strayPixel'
    | 'flake'
    | 'biscuit'
    | 'byte'
    | 'bowlEmpty'
    | 'bowlFull';

interface Bitmap {
    rows: string[];
    ink: Record<string, string>;
}

const BITMAPS: Record<SpriteName, Bitmap> = {
    dust: {
        rows: ['.dd..', 'dDDd.', 'dDDDd', '.ddd.'],
        ink: { d: '#a9a59b', D: '#d6d2c6' },
    },
    heart: {
        rows: ['.r.r.', 'rRrrr', 'rrrrd', '.rrd.', '..d..'],
        ink: { r: '#c9445f', R: '#ef8ea0', d: '#8a2238' },
    },
    note: {
        rows: ['..nn', '..nN', '..n.', '..n.', 'nnn.', 'nnd.'],
        ink: { n: '#3a4a9a', N: '#6a7ad0', d: '#222c66' },
    },
    sparkle: {
        rows: ['..y..', '..Y..', 'yYWYy', '..Y..', '..y..'],
        ink: { y: '#c99a2b', Y: '#f2d36a', W: '#fffbe6' },
    },
    star: {
        rows: ['...g...', '..gGg..', 'gGGWGGg', '.gGGGg.', '.gG.Gg.', 'gg...gg'],
        ink: { g: '#a8781a', G: '#f0c240', W: '#fff6cc' },
    },
    crumb: {
        rows: ['cC', 'cc'],
        ink: { c: '#8a5a2a', C: '#c48a4a' },
    },
    sweat: {
        rows: ['.b.', 'bBb', 'bbb', '.b.'],
        ink: { b: '#4a8fd0', B: '#bfe0ff' },
    },
    zed: {
        rows: ['zzzz', '..z.', '.z..', 'zzzz'],
        ink: { z: '#40465c' },
    },
    spark: {
        rows: ['..w', '.wb', 'wb.', '.w.'],
        ink: { w: '#e4f2ff', b: '#78b4ff' },
    },
    bubble: {
        rows: ['.bb.', 'bWlb', 'bllb', '.bb.'],
        ink: { b: '#9fd6ef', l: '#d8f2fc', W: '#ffffff' },
    },
    badge: {
        rows: ['...g...', '..gGg..', 'gGGWGGg', '.gGGGg.', '.gG.Gg.', 'gg...gg'],
        ink: { g: '#a8781a', G: '#f0c240', W: '#fff6cc' },
    },
    ball: {
        rows: ['.yyy.', 'yWyYy', 'yyWyy', 'yYyWy', '.yyy.'],
        ink: { y: '#b7c83a', Y: '#d8e66a', W: '#f6f6e6' },
    },
    yarn: {
        rows: ['.rrr.', 'rRrRr', 'rrRrr', 'rRrRr', '.rrr.', '....r'],
        ink: { r: '#b7566a', R: '#e08a9a' },
    },
    strayPixel: {
        rows: ['cc', 'cC'],
        ink: { c: '#3ee8ff', C: '#e6fdff' },
    },
    flake: {
        rows: ['.oo', 'oOo', 'oo.'],
        ink: { o: '#d6a23a', O: '#f6d27a' },
    },
    biscuit: {
        rows: ['b..b', 'bBBb', 'bBBb', 'b..b'],
        ink: { b: '#9a6430', B: '#c88a4a' },
    },
    byte: {
        rows: ['.c.', 'cc.', '.c.', '.c.', 'ccc'],
        ink: { c: '#3ee8ff' },
    },
    bowlEmpty: {
        rows: [
            '.kkkkkkkkkk.',
            'kHrrrrrrrrRk',
            'kRRRRRRRRRRk',
            '.kRRRHRRRRk.',
            '..kkkkkkkk..',
        ],
        ink: { k: '#4a1f16', r: '#2a120e', R: '#a24a32', H: '#d9876a' },
    },
    bowlFull: {
        rows: [
            '...fFFf.....',
            '..fFfFfFff..',
            '.kfFfFfFfFk.',
            'kHRRRRRRRRRk',
            '.kRRRHRRRRk.',
            '..kkkkkkkk..',
        ],
        ink: { k: '#4a1f16', R: '#a24a32', H: '#d9876a', f: '#9a6430', F: '#c88a4a' },
    },
};

/**
 * What goes in the bowl, and what gets thrown, depends on who it is for.
 * The bitmap names above are generic; these pick per animal.
 */
export const TOY_SPRITE: Record<string, SpriteName> = {
    modem: 'ball',
    static: 'yarn',
    glitch: 'strayPixel',
    pixel: 'flake',
};

export const TREAT_SPRITE: Record<string, SpriteName> = {
    modem: 'biscuit',
    static: 'flake',
    glitch: 'byte',
    pixel: 'flake',
};

const cache = new Map<string, { url: string; w: number; h: number }>();

/**
 * Doubles a bitmap the way emulators learned to in the nineties (EPX, the
 * rule Scale2x rediscovered): each pixel becomes four, and a corner takes
 * its neighbours' colour when the two neighbours meeting at that corner
 * agree with each other and not with the ones opposite. Diagonals come out
 * as diagonals instead of staircases of 2x2 blocks, which matters here
 * because the animal beside these props is drawn at one art pixel per
 * screen pixel — a ball made of fat square pixels next to it looks pasted
 * in from a different game.
 */
function epx(g: string[][]): string[][] {
    const h = g.length;
    const w = h ? g[0].length : 0;
    const out: string[][] = [];
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
    for (let y = 0; y < h; y++) {
        const top: string[] = [];
        const bot: string[] = [];
        for (let x = 0; x < w; x++) {
            const p = g[y][x];
            const a = at(x, y - 1);
            const b = at(x + 1, y);
            const c = at(x - 1, y);
            const d = at(x, y + 1);
            top.push(c === a && c !== d && a !== b ? a : p, a === b && a !== c && b !== d ? b : p);
            bot.push(d === c && d !== b && c !== a ? c : p, b === d && b !== a && d !== c ? d : p);
        }
        out.push(top, bot);
    }
    return out;
}

/**
 * A data URL for a sprite at an integer pixel size. Cached.
 *
 * At 2 and 4 the bitmap is doubled with `epx` rather than with squares; any
 * other size is plain nearest-neighbour.
 */
export function sprite(name: SpriteName, px = 1): { url: string; w: number; h: number } {
    const key = `${name}@${px}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const bmp = BITMAPS[name];
    const h0 = bmp.rows.length;
    const w0 = Math.max(...bmp.rows.map((r) => r.length));
    let grid: string[][] = bmp.rows.map((r) => r.padEnd(w0, '.').split(''));
    let cell = px;
    if (px === 2 || px === 4) {
        for (let n = px; n > 1; n /= 2) grid = epx(grid);
        cell = 1;
    }
    const h = grid.length;
    const w = grid[0].length;
    let url = '';
    try {
        const canvas = document.createElement('canvas');
        canvas.width = w * cell;
        canvas.height = h * cell;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const c = bmp.ink[grid[y][x]];
                    if (!c) continue;
                    ctx.fillStyle = c;
                    ctx.fillRect(x * cell, y * cell, cell, cell);
                }
            }
            url = canvas.toDataURL('image/png');
        }
    } catch {
        /* no canvas (tests, very old browsers): the particle simply won't show */
    }
    const out = { url, w: w0 * px, h: h0 * px };
    cache.set(key, out);
    return out;
}

/** Paints a sprite straight into a 2D context, one rect per pixel. */
export function paintSprite(
    ctx: CanvasRenderingContext2D,
    name: SpriteName,
    x: number,
    y: number
): void {
    const bmp = BITMAPS[name];
    for (let r = 0; r < bmp.rows.length; r++) {
        for (let c = 0; c < bmp.rows[r].length; c++) {
            const colour = bmp.ink[bmp.rows[r][c]];
            if (!colour) continue;
            ctx.fillStyle = colour;
            ctx.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1);
        }
    }
}

/** A sprite's size in pixels at 1x. */
export function spriteSize(name: SpriteName): { w: number; h: number } {
    const bmp = BITMAPS[name];
    return { w: Math.max(...bmp.rows.map((r) => r.length)), h: bmp.rows.length };
}
