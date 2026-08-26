/**
 * Find: Files or Folders.
 * ------------------------
 * Windows 95 put a magnifying glass in the Start menu, and it was the fastest
 * thing on the machine. This is that item, doing the job it would do on a
 * desktop this dense: one box that searches *everything* — programs, games,
 * the pages of My Showcase, the television's channels, and all 72 of Jonas'
 * live GitHub project pages — and opens whatever you pick.
 *
 * The problem it exists to solve is real and specific. There is far more here
 * than anyone finds by clicking: three folder levels, a Store full of things
 * with no desktop icon, twenty TV channels, and a showcase behind a window
 * that most visitors minimise once and never reopen. Depth-first browsing is
 * a bad way to reach any of it. Typing three letters is a good way.
 *
 * It is also the one addition here that a keyboard-first visitor will notice
 * immediately and never mention: Ctrl+F (or just `/`) from anywhere on the
 * desktop, type, Enter. That is the whole interaction.
 *
 * Why a registry rather than a static list: the authoritative set of
 * applications lives in `APPLICATIONS` inside `Desktop.tsx`, which imports
 * half this folder. Importing it back would be a cycle, so Desktop registers
 * its own entries on mount — the same approach as `appBridge.ts`.
 */

import { IconName } from '../../assets/icons';
import { CHANNELS } from './channels';
import { GITHUB_PROJECTS } from './githubProjects';

export type ResultKind =
    | 'program'
    | 'showcase'
    | 'channel'
    | 'project'
    | 'place';

export interface SearchResult {
    id: string;
    label: string;
    /** Shown in grey after the label — what kind of thing this is. */
    detail: string;
    kind: ResultKind;
    icon: IconName;
    /** Extra words that should match but aren't in the label. */
    keywords?: string;
    run: () => void;
}

/**
 * Extra vocabulary for programs whose *name* isn't what someone would type.
 *
 * "Hidden Dimension" is a stereogram; "Perception Lab" contains the Stroop
 * task; "Jonordle" is a Wordle clone. Nobody searching for those concepts
 * types the product name, and the Store blurb doesn't always carry the word
 * either. Everything else gets its keywords from its Store blurb
 * automatically — this map is only for the genuine mismatches.
 */
export const PROGRAM_ALIASES: Record<string, string> = {
    stereogram: 'stereogram magic eye sirds autostereogram 3d optical illusion depth',
    perceptionLab: 'stroop reaction time psychology experiment cognition test hci donders',
    jonordle: 'wordle word game puzzle guess',
    television: 'tv telly channels archive video watch',
    statistics: 'analytics visitors counter numbers traffic',
    systemMonitor: 'resource meter performance memory heap fps cpu',
    pet: 'tamagotchi animal dog cat fish creature adopt',
    guestbook: 'msn messenger chat message board sign',
    stocks: 'market watch shares ticker finance',
    trail: 'oregon dysentery wagon',
    doom: 'shooter fps id software 1993',
    myComputer: 'files folders drive explorer c: d:',
    internet: 'browser web ie explorer surf',
    resumeFile: 'cv curriculum vitae career',
    howItsBuilt: 'technical architecture how it works source',
    credits: 'attribution thanks licences licenses',
};

/* ---- the registry Desktop fills in ---------------------------------- */

let programEntries: SearchResult[] = [];

export function registerProgramEntries(entries: SearchResult[]): void {
    programEntries = entries;
}

/* ---- entries this module can build on its own ------------------------ */

/**
 * These need `openApp` to do anything, so they're built lazily by
 * `buildIndex` from whatever Desktop handed over, rather than at module load.
 */
const SHOWCASE_PAGES: { route: string; label: string; detail: string }[] = [
    { route: '/', label: 'My Showcase — Home', detail: 'Showcase' },
    { route: '/about', label: 'About Me', detail: 'Showcase page' },
    { route: '/experience', label: 'Experience & Research', detail: 'Showcase page' },
    { route: '/projects', label: 'Projects', detail: 'Showcase page' },
    { route: '/projects/software', label: 'Software Projects', detail: 'Showcase page' },
    { route: '/projects/art', label: 'Art & Physical Computing', detail: 'Showcase page' },
    { route: '/projects/music', label: 'Music, DJing & Paintings', detail: 'Showcase page' },
    { route: '/contact', label: 'Contact', detail: 'Showcase page' },
];

export interface IndexDeps {
    openApp: (key: string, options?: LaunchOptions) => void;
    goToShowcase: (route: string) => void;
}

export function buildIndex(deps: IndexDeps): SearchResult[] {
    const showcase: SearchResult[] = SHOWCASE_PAGES.map((p) => ({
        id: `showcase:${p.route}`,
        label: p.label,
        detail: p.detail,
        kind: 'showcase',
        icon: 'showcaseIcon',
        keywords: 'portfolio cv resume work jonas',
        run: () => deps.goToShowcase(p.route),
    }));

    const channels: SearchResult[] = CHANNELS.map((c) => ({
        id: `channel:${c.number}`,
        label: `${c.name}`,
        detail: `TV channel ${c.number}`,
        kind: 'channel',
        icon: 'televisionIcon',
        keywords: `television tv ${c.tagline}`,
        run: () => deps.openApp('television'),
    }));

    const projects: SearchResult[] = GITHUB_PROJECTS.map((p) => ({
        id: `project:${p.name}`,
        label: p.name,
        detail: `GitHub — ${p.language}`,
        kind: 'project',
        icon: 'githubIcon',
        keywords: `github repo code ${p.description}`,
        run: () => deps.openApp('internet', { url: p.url, label: p.name }),
    }));

    return [...programEntries, ...showcase, ...channels, ...projects];
}

/* ---- matching -------------------------------------------------------- */

/**
 * Subsequence matching with a bias toward prefixes, which is what makes
 * three letters enough: "prc" finds Perception Lab, but an exact prefix like
 * "per" still outranks it. Deliberately not fuzzy beyond that — a Find box
 * that returns surprising things is worse than one that returns nothing.
 */
function score(query: string, entry: SearchResult): number {
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    const label = entry.label.toLowerCase();
    const haystack = `${label} ${entry.detail} ${entry.keywords ?? ''}`.toLowerCase();

    if (label === q) return 1000;
    if (label.startsWith(q)) return 900 - label.length;
    // Word-start match: "hidden dim" -> "Hidden Dimension"
    if (label.includes(` ${q}`)) return 800 - label.length;
    if (label.includes(q)) return 700 - label.length;
    if (haystack.includes(q)) return 500 - label.length;

    // Subsequence over the label only — keywords are too broad for this.
    let i = 0;
    for (const ch of label) {
        if (ch === q[i]) i += 1;
        if (i === q.length) return 300 - label.length;
    }
    return -1;
}

/** Ranked matches, best first. Programs win ties so that typing "pa" reaches
 *  Paint before it reaches a repository that merely mentions painting. */
const KIND_WEIGHT: Record<ResultKind, number> = {
    program: 4,
    place: 3,
    showcase: 2,
    channel: 1,
    project: 0,
};

export function search(
    query: string,
    index: SearchResult[],
    limit = 12
): SearchResult[] {
    if (!query.trim()) return [];
    return (
        index
            .map((e) => ({ e, raw: score(query, e) }))
            // The kind bonus must be applied *after* this filter, never
            // before: adding it first let a non-matching program (raw -1,
            // bonus +4) survive as a positive score, which is why typing
            // "percep" used to return Doom.
            .filter((r) => r.raw > 0)
            .sort((a, b) => b.raw + KIND_WEIGHT[b.e.kind] - (a.raw + KIND_WEIGHT[a.e.kind]))
            .slice(0, limit)
            .map((r) => r.e)
    );
}
