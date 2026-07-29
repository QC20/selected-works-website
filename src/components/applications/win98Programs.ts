import { IconName } from '../../assets/icons';

/**
 * The Windows 98 programs from 98.js (https://98.js.org, by Isaiah Odhner),
 * vendored under `public/98/`.
 *
 * Upstream each of these is a standalone page that 98.js drops into an iframe
 * window; the pages reach back out for shared code with `../../lib/…`,
 * `../../src/…` and `../../images/…`, so the whole tree was copied over with
 * that layout intact. Nothing here is bundled by webpack — it's all served
 * statically — which is why the paths below are absolute URLs rather than
 * imports.
 *
 * The sizes are the ones 98.js opens each program at, converted from its
 * inner-content measurements to this desktop's outer window box (see
 * `CHROME` below). Programs that upstream declares a minimum size for are the
 * ones where the layout genuinely breaks when squeezed, so those are the sizes
 * to leave alone.
 */

export interface Win98Program {
    /** APPLICATIONS key in Desktop.tsx, and the name you can type into Run. */
    key: string;
    /** Shown on the window title bar, in the folder, and in the Start menu. */
    name: string;
    icon: IconName;
    /** Served from `public/`, so it must start at the site root. */
    src: string;
    /** Outer window size, including this desktop's title and status bars. */
    width: number;
    height: number;
    /** Rough on-disk size, for the folder's status bar. Cosmetic only. */
    size: number;
    /** Needs a microphone (Sound Recorder). */
    allowMicrophone?: boolean;
    /**
     * The page finishes loading long before the program is usable, and says so
     * itself by dispatching `game-loaded` on its own frame. Pinball does this:
     * its document is ready in a moment, but the WebAssembly build behind it
     * takes several seconds, and 98.js keeps a splash screen up until then.
     */
    waitsForGameLoaded?: boolean;
}

/**
 * How much bigger this desktop's window is than the page inside it: 2px
 * borders plus padding on each side, a 20px title bar, and a 20px status bar
 * with 8px of margin above and below the content.
 */
const CHROME = { width: 12, height: 66 };

const frame = (
    p: Omit<Win98Program, 'width' | 'height'> & {
        innerWidth: number;
        innerHeight: number;
    }
): Win98Program => ({
    key: p.key,
    name: p.name,
    icon: p.icon,
    src: p.src,
    size: p.size,
    allowMicrophone: p.allowMicrophone,
    waitsForGameLoaded: p.waitsForGameLoaded,
    width: p.innerWidth + CHROME.width,
    height: p.innerHeight + CHROME.height,
});

export const WIN98_PROGRAMS: Win98Program[] = [
    frame({
        key: 'flowerBox',
        name: '3D Flower Box',
        // 98.js has no dedicated Flower Box icon either, and reuses this one.
        icon: 'pipesIcon',
        src: '/98/programs/3D-FlowerBox/index.html',
        innerWidth: 480,
        innerHeight: 360,
        size: 220,
    }),
    frame({
        key: 'pipes',
        name: '3D Pipes',
        icon: 'pipesIcon',
        // `hideUI` is the same option 98.js passes when it runs this as a
        // screensaver: no overlaid controls, just the pipes.
        src: `/98/programs/pipes/index.html#${encodeURIComponent(
            JSON.stringify({ hideUI: true })
        )}`,
        innerWidth: 480,
        innerHeight: 360,
        size: 1100,
    }),
    frame({
        key: 'calculator',
        name: 'Calculator',
        icon: 'calculatorIcon',
        src: '/98/programs/calculator/index.html',
        innerWidth: 256,
        innerHeight: 229,
        size: 1500,
    }),
    frame({
        key: 'msDos',
        name: 'MS-DOS Prompt',
        icon: 'msDosIcon',
        src: '/98/programs/command/index.html',
        innerWidth: 640,
        innerHeight: 400,
        size: 12,
        // DOSBox is fetched from js-dos's CDN and takes a good few seconds to
        // download and boot, during which the canvas is just black.
        waitsForGameLoaded: true,
    }),
    frame({
        key: 'notepad',
        name: 'Notepad',
        icon: 'notepadIcon',
        src: '/98/programs/notepad/index.html',
        // Upstream opens at 480x321 outer. A little taller here so the Open and
        // Save As file boxes (a portfolio addition — see the notepad folder)
        // have room to sit inside the window rather than being squeezed.
        innerWidth: 520,
        innerHeight: 390,
        size: 160,
    }),
    frame({
        key: 'paint',
        name: 'Paint',
        icon: 'paintIcon',
        src: '/98/programs/jspaint/index.html',
        // Upstream opens Paint at a 275x400 *outer* box, which is its minimum
        // rather than a comfortable size. Given a whole desktop to work with,
        // open it wide enough for the tool box, the palette and a canvas at
        // jspaint's default width without a scrollbar from the start.
        innerWidth: 780,
        innerHeight: 520,
        size: 29000,
    }),
    frame({
        key: 'pinball',
        name: 'Pinball',
        icon: 'pinballIcon',
        src: '/98/programs/pinball/space-cadet.html',
        // The game canvas is a fixed 600x440 and does not scale, so anything
        // smaller crops the table. Upstream gets away with 20px less because
        // it lifts the menu bar out of the frame; here it stays inside.
        innerWidth: 600,
        innerHeight: 460,
        size: 6700,
        waitsForGameLoaded: true,
    }),
    frame({
        key: 'solitaire',
        name: 'Solitaire',
        icon: 'solitaireIcon',
        src: '/98/programs/js-solitaire/index.html',
        innerWidth: 585,
        innerHeight: 405,
        size: 612,
    }),
    frame({
        key: 'soundRecorder',
        name: 'Sound Recorder',
        icon: 'soundRecorderIcon',
        src: '/98/programs/sound-recorder/index.html',
        // 270 is upstream's minimum; the transport buttons actually run to 300.
        innerWidth: 300,
        innerHeight: 129,
        size: 628,
        allowMicrophone: true,
    }),
    frame({
        key: 'winamp',
        name: 'Winamp',
        icon: 'winampIcon',
        src: '/98/programs/winamp/index.html',
        // Winamp 2.9's stacked main + equalizer + playlist windows.
        innerWidth: 290,
        innerHeight: 400,
        size: 1800,
    }),
];

export const win98ProgramByKey = (key: string): Win98Program | undefined =>
    WIN98_PROGRAMS.find((p) => p.key === key);
