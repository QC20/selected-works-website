/**
 * Redraw the four pet icons from the pets themselves.
 *
 * The animals are not pictures any more: `src/components/os/pet/` draws them
 * from a skeleton every frame. The 32x32 icons the Start menu, the Programs
 * folder and the taskbar use are the one place a still image is still needed,
 * and they have to agree with the creature on the bar — so they are rendered
 * by the same code rather than drawn separately, and need regenerating
 * whenever the rig, a coat or a face changes.
 *
 * Each animal is posed the way it reads best small — the collie and the cat
 * sitting and turned a little toward the viewer, the ermine sitting up on its
 * haunches, the betta side-on — measured at 100%, then redrawn at whatever
 * scale fills the 32px box with a pixel to spare. Drawing at the target size
 * matters: shrinking a bigger render with nearest neighbour drops every other
 * pixel and the animal falls apart.
 *
 * Run it from the repo root:
 *
 *     node tools/pet-icons.js            writes src/assets/icons/pet*Icon.png
 *     node tools/pet-icons.js --preview  also writes an 8x contact sheet to
 *                                        the system temp folder
 *
 * It compiles the TypeScript with the project's own `typescript` package into
 * a temporary folder, so it needs nothing that is not already installed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const ICONS = path.join(ROOT, 'src/assets/icons');
const SIZE = 32;

const POSES = {
    modem: { clip: 'sit', yaw: 0.6, file: 'petModemIcon.png' },
    static: { clip: 'sit', yaw: 0.8, file: 'petStaticIcon.png' },
    glitch: { clip: 'perk', yaw: 0.35, file: 'petGlitchIcon.png' },
    pixel: { clip: 'stand', yaw: 0, file: 'petPixelIcon.png' },
};

/* --- compile the renderer ------------------------------------------------ */

function compile() {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-icons-'));
    const sources = [
        ...fs
            .readdirSync(path.join(ROOT, 'src/components/os/pet'))
            .filter((f) => /\.tsx?$/.test(f))
            .map((f) => path.join('pet', f)),
        'petMotion.ts',
    ];
    for (const rel of sources) {
        const src = fs.readFileSync(path.join(ROOT, 'src/components/os', rel), 'utf8');
        const js = ts.transpileModule(src, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2019,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
            },
        }).outputText;
        const dest = path.join(out, rel.replace(/\.tsx?$/, '.js'));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, js);
    }
    return out;
}

/* --- a minimal PNG writer ------------------------------------------------ */

const CRC = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function png(w, h, rgba) {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    }
    const head = Buffer.alloc(13);
    head.writeUInt32BE(w, 0);
    head.writeUInt32BE(h, 4);
    head[8] = 8; // bit depth
    head[9] = 6; // RGBA
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', head),
        chunk('IDAT', zlib.deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/* --- drawing -------------------------------------------------------------- */

function icon(D, A, kind) {
    const spec = POSES[kind];
    const pose = A.poseAt(kind, spec.clip, 0, 0);
    if (kind !== 'pixel') {
        pose.yaw = spec.yaw;
        pose.breath = 0;
        pose.eye = 1;
    } else {
        pose.phase = 0.6;
        pose.wave = 1.2;
    }
    const opts = { kind, pose, facing: 1, time: 4000, glitch: 0.15 };

    const probe = D.frameFor(1);
    D.draw(probe, { ...opts, scale: 1 });
    const pw = probe.bbox.x1 - probe.bbox.x0 + 1;
    const ph = probe.bbox.y1 - probe.bbox.y0 + 1;
    const scale = Math.min((SIZE - 2) / pw, (SIZE - 2) / ph) * 0.999;
    const f = D.frameFor(scale);
    D.draw(f, { ...opts, scale });

    const { x0, y0, x1, y1 } = f.bbox;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const out = new Uint32Array(SIZE * SIZE);
    const left = Math.floor((SIZE - bw) / 2);
    // Feet on the bottom row; the fish, which has none, in the middle.
    const top = kind === 'pixel' ? Math.floor((SIZE - bh) / 2) : SIZE - bh - 1;
    for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
            const tx = left + x;
            const ty = top + y;
            if (tx < 0 || ty < 0 || tx >= SIZE || ty >= SIZE) continue;
            out[ty * SIZE + tx] = f.px[(y0 + y) * f.w + x0 + x];
        }
    }
    return out;
}

function main() {
    const lib = compile();
    const D = require(path.join(lib, 'pet/render.js'));
    const A = require(path.join(lib, 'pet/animate.js'));
    const drawn = {};
    for (const kind of Object.keys(POSES)) {
        drawn[kind] = icon(D, A, kind);
        const file = path.join(ICONS, POSES[kind].file);
        fs.writeFileSync(file, png(SIZE, SIZE, new Uint8Array(drawn[kind].buffer)));
        console.log('wrote', path.relative(ROOT, file));
    }

    if (process.argv.includes('--preview')) {
        // Four icons side by side at 8x on the taskbar grey.
        const Z = 8;
        const W = SIZE * Z * 4;
        const H = SIZE * Z;
        const sheet = new Uint32Array(W * H).fill(0xffc0c0c0);
        Object.values(drawn).forEach((px, i) => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < SIZE * Z; x++) {
                    const c = px[Math.floor(y / Z) * SIZE + Math.floor(x / Z)];
                    if (c >>> 24 > 127) sheet[y * W + i * SIZE * Z + x] = c;
                }
            }
        });
        const file = path.join(os.tmpdir(), 'pet-icons-preview.png');
        fs.writeFileSync(file, png(W, H, new Uint8Array(sheet.buffer)));
        console.log('preview', file);
    }
    fs.rmSync(lib, { recursive: true, force: true });
}

main();
