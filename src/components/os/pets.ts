/**
 * The pet.
 * --------
 * Four characters native to this machine rather than anything borrowed:
 *
 *   Modem   a dog who remembers the sound of dial-up.
 *   Glitch  a slime that formed out of a corrupted save file.
 *   Static  a cat found asleep on top of the television.
 *   Pixel   a fish, mostly for people who want the low-maintenance option.
 *
 * One store, following the same shape as `theme.ts` and `crt.ts`: a
 * module-level object, persisted to `localStorage`, read by a `useState` hook
 * that subscribes to a listener set. The tray icon, the Statistics-style
 * dashboard in `Pet.tsx`, and Clippy's check-in all need to agree on the same
 * animal without sharing a React tree, which rules out context the same way
 * it does for `desktopFiles.ts`.
 *
 * The hunger model is deliberately gentle. There is no death, no visible
 * penalty, and nothing that decays past "would like to be fed" — this sits on
 * a professional portfolio, and a recruiter coming back after a fortnight to
 * find a neglected, sickly animal is a worse outcome than a slightly forward
 * one asking for dinner. Time away is a chance for a line of character, not a
 * punishment.
 */

import { useEffect, useState } from 'react';
import { IconName } from '../../assets/icons';
import { Line, clippySay, randomClippy } from './Clippy';
import { openAppGlobal } from './appBridge';

export type PetSpecies = 'modem' | 'glitch' | 'static' | 'pixel';

export type PetMood = 'excited' | 'content' | 'hungry' | 'starving';

export interface PetDef {
    id: PetSpecies;
    name: string;
    icon: IconName;
    tagline: string;
    /** Said (via Clippy) when idle chatter about the pet happens to fire. */
    idleLines: string[];
    hungryLines: string[];
    starvingLines: string[];
    /** The greeting when the site hasn't been opened in a long while. */
    welcomeBackLines: string[];
    feedLines: string[];
    petLines: string[];
    /* --- the screen-mate's own vocabulary ------------------------------
     * Everything below is used by `DesktopPet.tsx` rather than by the tray
     * or the window: it only means anything to a creature that is actually
     * walking around and can be picked up, thrown, or asked to perform. */
    /** What this animal's trick *is*, as a verb phrase: "rolls over". */
    trickName: string;
    trickLines: string[];
    /** Chasing the toy, and bringing it back. */
    playLines: string[];
    /** Held off the taskbar between finger and thumb. */
    heldLines: string[];
    /** Put down again — or, if it was thrown, landed. */
    droppedLines: string[];
    /** Woken up on purpose. */
    wakeLines: string[];
    /** The thing it chases when you play fetch, and what colour that is. */
    toyName: string;
    toyColor: string;
    /** What a tossed treat is, for this animal. */
    treatName: string;
}

export const PETS: Record<PetSpecies, PetDef> = {
    modem: {
        id: 'modem',
        name: 'Modem',
        icon: 'petModemIcon',
        tagline: 'A good boy who still remembers the sound of dial-up.',
        idleLines: [
            'Modem is pacing by the tray, bored.',
            'Modem is chewing thoughtfully on a cable that is not his.',
        ],
        hungryLines: ['Modem is scratching at an empty bowl.'],
        starvingLines: [
            "Modem has started chewing on a cable again. He's actually hungry this time.",
        ],
        welcomeBackLines: [
            'Modem practically knocked over the tower when you came back. He is very hungry.',
        ],
        feedLines: [
            'Modem wolfs it down and looks enormously pleased with himself.',
        ],
        petLines: ['Modem leans into it. Good boy.'],
        trickName: 'rolls over',
        trickLines: [
            'Modem rolls over, gets halfway back up, and gives up. Still counts.',
            'Modem does a full spin and looks around for applause.',
        ],
        playLines: [
            'Modem is after it. Modem is entirely after it.',
            'Modem brings it back and refuses to let go of it.',
        ],
        heldLines: [
            'Modem is pedalling his legs in mid-air. He does not appear worried.',
            'Modem has gone completely limp. This is apparently fine.',
        ],
        droppedLines: [
            'Modem shakes himself off and pretends that was the plan.',
            'Modem lands, wags once, and forgives you immediately.',
        ],
        wakeLines: ['Modem is awake. Modem was always awake. Obviously.'],
        toyName: 'a tennis ball',
        toyColor: '#c8d94a',
        treatName: 'a biscuit',
    },
    glitch: {
        id: 'glitch',
        name: 'Glitch',
        icon: 'petGlitchIcon',
        tagline: 'Formed out of a corrupted save file. Mostly harmless.',
        idleLines: [
            'Glitch is idly reforming itself in the corner of the tray.',
            'Glitch flickered. Probably nothing.',
        ],
        hungryLines: ['Glitch is flickering — feed it before it starts on the icons.'],
        starvingLines: ['Glitch has started nibbling the edge of the taskbar.'],
        welcomeBackLines: [
            "Glitch missed you. It's been running on fumes and old cache.",
        ],
        feedLines: ['Glitch absorbs it instantly and glows for a second.'],
        petLines: ['Glitch wobbles happily.'],
        trickName: 'reboots itself',
        trickLines: [
            'Glitch turns itself inside out and back again. Do not think about it.',
            'Glitch briefly renders at the wrong resolution, on purpose, for you.',
        ],
        playLines: [
            'Glitch is chasing a stray pixel that should not exist.',
            'Glitch absorbs the pixel, thinks better of it, and puts it back.',
        ],
        heldLines: [
            'Glitch is dripping upward. That is not how anything works.',
            'Glitch has stopped rendering its own edges. It seems relaxed.',
        ],
        droppedLines: [
            'Glitch reassembles itself out of order and then fixes it.',
            'Glitch splatters, reforms, and looks pleased about the whole thing.',
        ],
        wakeLines: ['Glitch reboots. Two seconds of nothing, then a slime again.'],
        toyName: 'a stray pixel',
        toyColor: '#7ae0ff',
        treatName: 'a spare byte',
    },
    static: {
        id: 'static',
        name: 'Static',
        icon: 'petStaticIcon',
        tagline: 'Found asleep on top of the television. Never left.',
        idleLines: [
            'Static is watching the cursor, unimpressed.',
            'Static is sitting very close to the Television window. No comment.',
        ],
        hungryLines: ['Static is sitting by an empty bowl, unimpressed.'],
        starvingLines: ['Static has started judging you audibly. Feed her.'],
        welcomeBackLines: [
            "Static waited by the door the whole time you were gone. She'd never admit it.",
        ],
        feedLines: ['Static eats without acknowledging you. High praise, actually.'],
        petLines: ['Static allows exactly three pets before walking off.'],
        trickName: 'does a slow blink',
        trickLines: [
            'Static does a slow blink. In cat, this is an enormous compliment.',
            'Static performs a trick so subtle you may have missed it. That is the trick.',
        ],
        playLines: [
            'Static pretends not to care about the yarn, then destroys the yarn.',
            'Static returns the yarn and acts as though it came back on its own.',
        ],
        heldLines: [
            'Static has gone rigid with dignity. Put her down.',
            'Static is looking directly at you. This will be remembered.',
        ],
        droppedLines: [
            'Static lands on her feet, obviously, and does not mention it.',
            'Static walks off three steps and sits down facing away from you.',
        ],
        wakeLines: ['Static opens one eye. Only one. You have not earned two.'],
        toyName: 'a ball of yarn',
        toyColor: '#e08a8a',
        treatName: 'a fish flake',
    },
    pixel: {
        id: 'pixel',
        name: 'Pixel',
        icon: 'petPixelIcon',
        tagline: 'Low-maintenance. Mostly just swims.',
        idleLines: [
            'Pixel does a slow lap of the bowl.',
            'Pixel is doing the thing where it stares at the glass.',
        ],
        hungryLines: ['Pixel is circling the top of the bowl, hoping.'],
        starvingLines: ['Pixel really needs feeding by now.'],
        welcomeBackLines: [
            "Pixel's bowl is looking a little empty. Welcome back.",
        ],
        feedLines: ['Pixel snaps up the flakes immediately.'],
        petLines: [
            'Pixel presses against the glass. About as close to affection as a fish gets.',
        ],
        trickName: 'does a barrel roll',
        trickLines: [
            'Pixel does a barrel roll. It was over quickly but it definitely happened.',
            'Pixel loops the loop twice and returns to staring at nothing.',
        ],
        playLines: [
            'Pixel is chasing the flake with genuine, uncomplicated joy.',
            'Pixel nudges the flake back over to you. Nobody taught it that.',
        ],
        heldLines: [
            'Pixel is out of the water and taking it remarkably well.',
            'Pixel is flapping gently. Pixel would like to go back in the bowl.',
        ],
        droppedLines: [
            'Pixel plops back down and resumes swimming through solid taskbar.',
            'Pixel bounces once, forgets the entire incident, and swims on.',
        ],
        wakeLines: ['Pixel was asleep with its eyes open. Fish do that.'],
        toyName: 'a flake',
        toyColor: '#e8c86a',
        treatName: 'a pinch of flakes',
    },
};

export const PET_LIST: PetDef[] = Object.values(PETS);

/* -------------------------------------------------------------------------
 * Timing
 * ---------------------------------------------------------------------- */

const HUNGRY_AFTER_MS = 8 * 60 * 60 * 1000; // 8 hours since last fed
const STARVING_AFTER_MS = 48 * 60 * 60 * 1000; // 48 hours since last fed
const EXCITED_FOR_MS = 8_000;
/** How long away before a return gets its own greeting instead of silence. */
export const LONG_ABSENCE_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------
 * Persisted state
 * ---------------------------------------------------------------------- */

interface PetState {
    species: PetSpecies | null;
    adoptedAt: number;
    lastFed: number;
    lastSeen: number;
    totalFeedings: number;
    totalPets: number;
    totalAdoptions: number;
    totalTricks: number;
    totalGames: number;
    totalTreats: number;
    /** Hidden for the rest of this tab — see `hidePetForNow`. */
    hidden: boolean;
    /** Whether Clippy's "do you like them" check-in has fired for this pet. */
    checkedIn: boolean;
    /** "No pets, thanks" was chosen — suppress the unprompted nudges. */
    optedOut: boolean;
}

const KEY = 'pet.v1';

const DEFAULT_STATE: PetState = {
    species: null,
    adoptedAt: 0,
    lastFed: Date.now(),
    lastSeen: Date.now(),
    totalFeedings: 0,
    totalPets: 0,
    totalAdoptions: 0,
    totalTricks: 0,
    totalGames: 0,
    totalTreats: 0,
    hidden: false,
    checkedIn: false,
    optedOut: false,
};

const load = (): PetState => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw) as Partial<PetState>;
        return { ...DEFAULT_STATE, ...parsed };
    } catch {
        return { ...DEFAULT_STATE };
    }
};

let current: PetState = { ...load(), hidden: false };
let excitedUntil = 0;
let excitedTimer: number | undefined;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

const persist = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* private mode — the pet just won't remember past this tab */
    }
    notify();
};

const bumpExcited = () => {
    excitedUntil = Date.now() + EXCITED_FOR_MS;
    window.clearTimeout(excitedTimer);
    excitedTimer = window.setTimeout(notify, EXCITED_FOR_MS + 50);
    notify();
};

/* -------------------------------------------------------------------------
 * The event bus
 * ---------------------------------------------------------------------- */

/**
 * A *moment*, as opposed to a state change.
 *
 * `listeners` above already tells everyone that the numbers moved; it cannot
 * tell them the difference between "was fed a second ago" and "is being fed
 * right now", and a screen-mate needs exactly that difference — it has to
 * chew, not to have chewed. So actions emit a one-shot event alongside the
 * usual `persist()`.
 *
 * The point of routing it through the store rather than calling into
 * `DesktopPet` directly is that the same feed happens from four places — the
 * Pet window, the tray flyout, the creature's own body, and Clippy — and all
 * four should produce the same animation on the taskbar without any of them
 * knowing that a creature on the taskbar exists.
 */
export type PetEvent =
    | 'fed'
    | 'patted'
    | 'trick'
    | 'fetch'
    | 'treat'
    | 'appOpened';

const eventListeners = new Set<(event: PetEvent) => void>();

export function onPetEvent(fn: (event: PetEvent) => void): () => void {
    eventListeners.add(fn);
    return () => {
        eventListeners.delete(fn);
    };
}

const emit = (event: PetEvent) => eventListeners.forEach((fn) => fn(event));

/** One of a list, at random. Every flavour array in `PETS` is read this way. */
export const randomLine = (lines: string[]): string =>
    lines[Math.floor(Math.random() * lines.length)] ?? '';

/* -------------------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------------------- */

export function adoptPet(species: PetSpecies): void {
    current = {
        ...current,
        species,
        adoptedAt: Date.now(),
        lastFed: Date.now(),
        checkedIn: false,
        optedOut: false,
        totalAdoptions: current.totalAdoptions + 1,
    };
    persist();
}

/** "Try another pet" from Clippy's check-in, and the app's own button. */
export function resetPetChoice(): void {
    current = { ...current, species: null, checkedIn: false };
    persist();
}

/** "No pets, thanks" — clears the pet and quiets the unprompted nudges. */
export function optOutOfPet(): void {
    current = { ...current, species: null, optedOut: true };
    persist();
}

export function feedPet(): void {
    current = {
        ...current,
        lastFed: Date.now(),
        totalFeedings: current.totalFeedings + 1,
    };
    bumpExcited();
    persist();
    emit('fed');
    triggerCheckInIfDue();
}

export function pettPet(): void {
    current = { ...current, totalPets: current.totalPets + 1 };
    bumpExcited();
    persist();
    emit('patted');
    triggerCheckInIfDue();
}

/**
 * Ask for the trick. Counts, cheers the animal up the way a pat does, and
 * lets the screen-mate know to actually perform it.
 */
export function trickPet(): void {
    current = { ...current, totalTricks: current.totalTricks + 1 };
    bumpExcited();
    persist();
    emit('trick');
    triggerCheckInIfDue();
}

/** Throw the toy. The chase, the catch and the return all live in the view. */
export function playFetch(): void {
    current = { ...current, totalGames: current.totalGames + 1 };
    bumpExcited();
    persist();
    emit('fetch');
    triggerCheckInIfDue();
}

/**
 * Drop something edible on the taskbar.
 *
 * Deliberately *not* a feed: `lastFed` only moves once the animal has walked
 * over and eaten it, which `DesktopPet` does by calling `feedPet` when the
 * two meet. Tossing a treat at a pet that then ignores it should not count.
 */
export function tossTreat(): void {
    current = { ...current, totalTreats: current.totalTreats + 1 };
    persist();
    emit('treat');
}

/** "Go away for a bit" from the creature's own right-click menu. */
export function hidePetForNow(): void {
    current = { ...current, hidden: true };
    persist();
}

export function unhidePet(): void {
    if (!current.hidden) return;
    current = { ...current, hidden: false };
    persist();
}

/* -------------------------------------------------------------------------
 * The Clippy check-in
 * ---------------------------------------------------------------------- */

/**
 * "Do you like them?" — three seconds after the *first* time a visitor
 * actually does something with their new pet (feeds or pats it), not the
 * moment they adopt one. Reacting to the adoption itself would interrupt a
 * decision that was just made; reacting to the first bit of use is closer to
 * a friend noticing you've been enjoying something.
 *
 * `checkedIn` is set the moment the timer is scheduled, not when it fires —
 * so a second feed inside those three seconds can't queue a duplicate.
 */
function triggerCheckInIfDue(): void {
    const species = current.species;
    if (!species || current.checkedIn) return;
    current = { ...current, checkedIn: true };
    persist();
    const pet = PETS[species];
    window.setTimeout(() => clippySay(buildCheckInLine(pet)), 3000);
}

/** A couple of things worth knowing, offered only if the visitor keeps them. */
function buildIntroTips(pet: PetDef): Line[] {
    return [
        {
            text: `${pet.name} lives in the tray from now on — click any time to feed or pat, no need to reopen this window.`,
            animation: randomClippy(),
        },
        {
            text: `Leave ${pet.name} alone for a while and they'll let you know about it. They also perk up whenever you open something new.`,
            animation: randomClippy(),
        },
    ];
}

function buildCheckInLine(pet: PetDef): Line {
    return {
        text: `So — do you like ${pet.name}?`,
        animation: randomClippy(),
        buttons: [
            {
                label: 'Keep them',
                primary: true,
                onClick: () => {
                    const tips = buildIntroTips(pet);
                    window.setTimeout(() => clippySay(tips[0]), 2500);
                    window.setTimeout(() => clippySay(tips[1]), 9000);
                },
            },
            {
                label: 'Try another pet',
                onClick: () => {
                    resetPetChoice();
                    openAppGlobal('pet');
                },
            },
            {
                label: 'No pets, thanks',
                onClick: () => {
                    optOutOfPet();
                },
            },
        ],
    };
}

/** Called from `Desktop.tsx` whenever any app is opened — a small perk-up. */
export function noticeAppOpenedForPet(): void {
    if (!current.species) return;
    bumpExcited();
    emit('appOpened');
}

/**
 * Called once per session, on desktop mount. Returns whether this is a
 * return after a long enough gap to be worth a greeting, and updates
 * `lastSeen` for next time — in that order, so the comparison is against the
 * *previous* visit, not this one.
 */
export function noteSessionForPet(): { returned: boolean; pet: PetDef | null } {
    const away = Date.now() - current.lastSeen;
    const returned =
        !!current.species && !current.optedOut && away > LONG_ABSENCE_MS;
    const pet = current.species ? PETS[current.species] : null;
    current = { ...current, lastSeen: Date.now() };
    persist();
    return { returned, pet };
}

/* -------------------------------------------------------------------------
 * Reading
 * ---------------------------------------------------------------------- */

export const getPetState = (): PetState => current;

export function computeMood(state: PetState = current): PetMood {
    if (Date.now() < excitedUntil) return 'excited';
    const sinceFed = Date.now() - state.lastFed;
    if (sinceFed > STARVING_AFTER_MS) return 'starving';
    if (sinceFed > HUNGRY_AFTER_MS) return 'hungry';
    return 'content';
}

/** 100 at just-fed, floor of 0 by the time it would be starving. */
export function contentment(state: PetState = current): number {
    const sinceFed = Date.now() - state.lastFed;
    const pct = 1 - sinceFed / STARVING_AFTER_MS;
    return Math.round(Math.max(0, Math.min(1, pct)) * 100);
}

export function usePetState(): PetState {
    const [state, setState] = useState<PetState>(current);
    useEffect(() => {
        const listener = () => setState({ ...current });
        listeners.add(listener);
        setState({ ...current });
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return state;
}
