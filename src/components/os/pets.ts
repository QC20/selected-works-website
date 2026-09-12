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
import { notePetMoment } from './petAchievements';

export type PetSpecies = 'modem' | 'glitch' | 'static' | 'pixel';

export type PetMood = 'excited' | 'content' | 'hungry' | 'starving';

/**
 * The seven things it does when you poke it and it is not hungry.
 * ---------------------------------------------------------------
 * Straight out of VS Code's pet, and the single best idea in it. A creature
 * with one response to being clicked is a button; a creature with seven,
 * shuffled so the same one never lands twice running, is a character. The
 * cost is seven short animations and seven lines per animal, and the payoff
 * is that the fiftieth click still has something in it.
 *
 * `press` is ours rather than theirs — VS Code's pet presses a little button,
 * and on a Windows 95 desktop the only button worth pressing is Start.
 */
export type PetReaction =
    | 'press'
    | 'heart'
    | 'cool'
    | 'yap'
    | 'sing'
    | 'speechless'
    | 'worry';

export const REACTIONS: PetReaction[] = [
    'press',
    'heart',
    'cool',
    'yap',
    'sing',
    'speechless',
    'worry',
];

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
    /** Landed hard enough to stagger. */
    dizzyLines: string[];
    /** Reached the top of a screen edge. */
    climbLines: string[];
    /** Asleep up there, hanging off the wall. */
    wallNapLines: string[];
    /** Sent off to hide, and called back again. */
    runAwayLines: string[];
    comeBackLines: string[];
    /** Thrown clean off the bottom of the screen and dropped back in. */
    respawnLines: string[];
    /** One per reaction, so a poke says something specific to the animal. */
    reactionLines: Record<PetReaction, string[]>;
    /** The thing it chases when you play fetch, and what colour that is. */
    toyName: string;
    toyColor: string;
    /** What a tossed treat is, for this animal. */
    treatName: string;
    /**
     * Where this species' features sit on its own 32px sprite, as fractions
     * of the sprite box. The wardrobe in `PetAccessory.tsx` is drawn out of
     * CSS rather than painted into the art, so a hat has to be told where the
     * top of *this* head is — Pixel's bowl rim is a third of the way down the
     * frame and Glitch's blob does not start until halfway, so a hat pinned
     * to one fixed offset floats in mid-air on one animal and sits through
     * the skull of another.
     *
     * These are measured rather than guessed: each icon was rendered at 8x
     * with a decile grid over it and the crown, eye line, chin and skull
     * width read straight off. The first draft of this table was estimated
     * from the alpha bounding box, which is wrong for three of the four —
     * Glitch's box includes two loose pixels floating above the slime, and
     * Static's includes the ear tips rather than the head between them.
     */
    anatomy: {
        /** Top of the head, 0 = top of the sprite box. */
        hat: number;
        /** Centre of the eye line. */
        eyes: number;
        /** Under the chin. */
        neck: number;
        /** Half the width of the head at the eye line, as a fraction. */
        headWidth: number;
    };
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
            'Modem has found a warm patch near the clock and will not be moved.',
            'Modem is watching the Start button. Something might happen.',
            'Modem heard a noise. There was no noise.',
        ],
        hungryLines: [
            'Modem is scratching at an empty bowl.',
            'Modem has pushed his bowl across the taskbar to make a point.',
            'Modem is doing the stare. You know the one.',
        ],
        starvingLines: [
            "Modem has started chewing on a cable again. He's actually hungry this time.",
            'Modem has given up on subtlety and is now sitting on the tray.',
        ],
        welcomeBackLines: [
            'Modem practically knocked over the tower when you came back. He is very hungry.',
            'Modem heard the fan spin up and was at the taskbar before it finished.',
        ],
        feedLines: [
            'Modem wolfs it down and looks enormously pleased with himself.',
            'Modem eats it in one and checks whether there is a second one.',
            'Modem finishes, then licks the same square of taskbar for a while.',
        ],
        petLines: [
            'Modem leans into it. Good boy.',
            'Modem tips over slightly so you can reach a better bit.',
            'Modem thumps his tail against the bar. Twice. Three times.',
        ],
        trickName: 'rolls over',
        trickLines: [
            'Modem rolls over, gets halfway back up, and gives up. Still counts.',
            'Modem does a full spin and looks around for applause.',
            'Modem rolls the wrong way, corrects, and finishes with real conviction.',
        ],
        playLines: [
            'Modem is after it. Modem is entirely after it.',
            'Modem brings it back and refuses to let go of it.',
            'Modem skids past it, turns, and gets it on the second attempt.',
        ],
        heldLines: [
            'Modem is pedalling his legs in mid-air. He does not appear worried.',
            'Modem has gone completely limp. This is apparently fine.',
            'Modem is looking down at the taskbar as if it has moved.',
        ],
        droppedLines: [
            'Modem shakes himself off and pretends that was the plan.',
            'Modem lands, wags once, and forgives you immediately.',
            'Modem sticks the landing and immediately wants to go again.',
        ],
        wakeLines: [
            'Modem is awake. Modem was always awake. Obviously.',
            'Modem sits up so fast he falls over.',
        ],
        dizzyLines: [
            'Modem is walking like the taskbar is on a boat.',
            'Modem sits down heavily and waits for the room to stop.',
        ],
        climbLines: [
            'Modem has got up the side of the screen somehow. Nobody taught him that.',
            'Modem is at the top of the wall, extremely proud, entirely stuck.',
        ],
        wallNapLines: [
            'Modem has fallen asleep halfway up a wall. He does this.',
        ],
        runAwayLines: [
            'Modem has gone to hide. Badly. You can see most of him.',
        ],
        comeBackLines: [
            'Modem comes back at a dead sprint and overshoots.',
        ],
        respawnLines: [
            'Modem falls out of the top of the screen and lands on the bar, unharmed and delighted.',
        ],
        reactionLines: {
            press: ['Modem presses the Start button with his nose. Nothing opens.'],
            heart: ['Modem loves you. Modem has always loved you.'],
            cool: ['Modem has found sunglasses. He is not going to explain where.'],
            yap: [
                'Modem lies on his side and barks at nothing in particular.',
                'Modem is yapping at the corner of the screen. It started it.',
            ],
            sing: ['Modem howls one long note. It is a handshake tone, roughly.'],
            speechless: ['Modem has no notes.'],
            worry: ['Modem has heard the hard drive make a sound and is concerned.'],
        },
        toyName: 'a tennis ball',
        toyColor: '#c8d94a',
        treatName: 'a biscuit',
        anatomy: { hat: 0.33, eyes: 0.585, neck: 0.86, headWidth: 0.3 },
    },
    glitch: {
        id: 'glitch',
        name: 'Glitch',
        icon: 'petGlitchIcon',
        tagline: 'Formed out of a corrupted save file. Mostly harmless.',
        idleLines: [
            'Glitch is idly reforming itself in the corner of the tray.',
            'Glitch flickered. Probably nothing.',
            'Glitch is briefly two slimes and then, correctly, one again.',
            'Glitch is reading the taskbar clock and disagreeing with it.',
        ],
        hungryLines: [
            'Glitch is flickering — feed it before it starts on the icons.',
            'Glitch has begun rendering at a slightly wrong resolution. Not a good sign.',
            'Glitch keeps dropping a frame. It is hungry, not broken.',
        ],
        starvingLines: [
            'Glitch has started nibbling the edge of the taskbar.',
            'Glitch has eaten one pixel of the tray. It will grow back. Probably.',
        ],
        welcomeBackLines: [
            "Glitch missed you. It's been running on fumes and old cache.",
            'Glitch reassembled the moment the page loaded. It had been waiting in a buffer.',
        ],
        feedLines: [
            'Glitch absorbs it instantly and glows for a second.',
            'Glitch eats it, checksums it, and approves.',
            'Glitch swallows it whole and goes briefly transparent.',
        ],
        petLines: [
            'Glitch wobbles happily.',
            'Glitch ripples outward from where you touched it.',
            'Glitch leans on your pointer and leaves a faint smear.',
        ],
        trickName: 'reboots itself',
        trickLines: [
            'Glitch turns itself inside out and back again. Do not think about it.',
            'Glitch briefly renders at the wrong resolution, on purpose, for you.',
            'Glitch performs a clean reboot in under a second. Show-off.',
        ],
        playLines: [
            'Glitch is chasing a stray pixel that should not exist.',
            'Glitch absorbs the pixel, thinks better of it, and puts it back.',
            'Glitch corners the pixel against the tray. The pixel had a good run.',
        ],
        heldLines: [
            'Glitch is dripping upward. That is not how anything works.',
            'Glitch has stopped rendering its own edges. It seems relaxed.',
            'Glitch is briefly a wireframe. It would rather you did not mention it.',
        ],
        droppedLines: [
            'Glitch reassembles itself out of order and then fixes it.',
            'Glitch splatters, reforms, and looks pleased about the whole thing.',
            'Glitch lands as a completely different shape and slowly corrects.',
        ],
        wakeLines: [
            'Glitch reboots. Two seconds of nothing, then a slime again.',
            'Glitch comes back up in safe mode, then normally.',
        ],
        dizzyLines: [
            'Glitch is oscillating between three positions it has been in before.',
            'Glitch has lost track of which way is down and is treating it as optional.',
        ],
        climbLines: [
            'Glitch has flowed up the side of the screen. Gravity was more of a suggestion.',
            'Glitch is at the top of the wall, dripping upward, entirely content.',
        ],
        wallNapLines: [
            'Glitch has gone dormant against the wall. It is still very slightly moving.',
        ],
        runAwayLines: [
            'Glitch has hidden itself in an unused region of memory.',
        ],
        comeBackLines: [
            'Glitch rematerialises about four pixels from where it left.',
        ],
        respawnLines: [
            'Glitch fell out of the bottom of the screen and came back in through the top. It does not consider this remarkable.',
        ],
        reactionLines: {
            press: ['Glitch presses the Start button by growing through it.'],
            heart: ['Glitch renders a heart, badly, on purpose.'],
            cool: ['Glitch has generated sunglasses out of two corrupted sprites.'],
            yap: [
                'Glitch lies on its side and emits a sound no format supports.',
                'Glitch is arguing with the taskbar in a protocol nobody uses any more.',
            ],
            sing: ['Glitch sings one pure tone and one that is definitely not.'],
            speechless: ['Glitch has stopped. Glitch has simply stopped.'],
            worry: ['Glitch has found an unclosed tag somewhere and is worried about it.'],
        },
        toyName: 'a stray pixel',
        toyColor: '#7ae0ff',
        treatName: 'a spare byte',
        anatomy: { hat: 0.5, eyes: 0.62, neck: 0.9, headWidth: 0.28 },
    },
    static: {
        id: 'static',
        name: 'Static',
        icon: 'petStaticIcon',
        tagline: 'Found asleep on top of the television. Never left.',
        idleLines: [
            'Static is watching the cursor, unimpressed.',
            'Static is sitting very close to the Television window. No comment.',
            'Static has arranged herself across the taskbar so as to be maximally in the way.',
            'Static is looking at a point slightly to the left of you.',
        ],
        hungryLines: [
            'Static is sitting by an empty bowl, unimpressed.',
            'Static has knocked something small off the tray. On purpose. She is hungry.',
            'Static is doing a very slow blink at the empty bowl and then at you.',
        ],
        starvingLines: [
            'Static has started judging you audibly. Feed her.',
            'Static has stopped judging you, which is considerably worse.',
        ],
        welcomeBackLines: [
            "Static waited by the door the whole time you were gone. She'd never admit it.",
            'Static was already sitting on the taskbar when the page loaded. She always is.',
        ],
        feedLines: [
            'Static eats without acknowledging you. High praise, actually.',
            'Static sniffs it, considers refusing, and then eats all of it.',
            'Static finishes and washes a paw for considerably longer than necessary.',
        ],
        petLines: [
            'Static allows exactly three pets before walking off.',
            'Static permits this. Static is not enjoying this. Static is enjoying this.',
            'Static headbutts your pointer once and pretends it was an accident.',
        ],
        trickName: 'does a slow blink',
        trickLines: [
            'Static does a slow blink. In cat, this is an enormous compliment.',
            'Static performs a trick so subtle you may have missed it. That is the trick.',
            'Static considers the request, does it perfectly, and never mentions it again.',
        ],
        playLines: [
            'Static pretends not to care about the yarn, then destroys the yarn.',
            'Static returns the yarn and acts as though it came back on its own.',
            'Static bats the yarn under the tray and looks at you expectantly.',
        ],
        heldLines: [
            'Static has gone rigid with dignity. Put her down.',
            'Static is looking directly at you. This will be remembered.',
            'Static has gone entirely liquid and is attempting to pour out of your hand.',
        ],
        droppedLines: [
            'Static lands on her feet, obviously, and does not mention it.',
            'Static walks off three steps and sits down facing away from you.',
            'Static lands, immediately sits, and begins washing as if nothing occurred.',
        ],
        wakeLines: [
            'Static opens one eye. Only one. You have not earned two.',
            'Static was not asleep. Static was resting her eyes. There is a difference.',
        ],
        dizzyLines: [
            'Static is walking in a way she would very much like you not to see.',
            'Static sits down abruptly and stares at the middle distance.',
        ],
        climbLines: [
            'Static is at the top of the screen and has no plan for getting down.',
            'Static went up the wall in one movement, as if the wall were the floor.',
        ],
        wallNapLines: [
            'Static is asleep on the wall. This is now a place cats sleep.',
        ],
        runAwayLines: [
            'Static has gone. There is no evidence Static was ever here.',
        ],
        comeBackLines: [
            'Static strolls back in as though she had been there the entire time.',
        ],
        respawnLines: [
            'Static reappears at the top of the screen, lands perfectly, and dares you to comment.',
        ],
        reactionLines: {
            press: ['Static puts one paw on the Start button and holds it there.'],
            heart: ['Static loves you and would deny it under oath.'],
            cool: ['Static is wearing sunglasses. It suits her, and she knows.'],
            yap: [
                'Static lies on her side and makes a sound that is not quite a meow.',
                'Static is having a long conversation with the corner of the screen.',
            ],
            sing: ['Static sings. It is technically singing.'],
            speechless: ['Static has nothing to add.'],
            worry: ['Static has noticed something behind you. There is nothing behind you.'],
        },
        toyName: 'a ball of yarn',
        toyColor: '#e08a8a',
        treatName: 'a fish flake',
        anatomy: { hat: 0.28, eyes: 0.63, neck: 0.86, headWidth: 0.3 },
    },
    pixel: {
        id: 'pixel',
        name: 'Pixel',
        icon: 'petPixelIcon',
        tagline: 'Low-maintenance. Mostly just swims.',
        idleLines: [
            'Pixel does a slow lap of the bowl.',
            'Pixel is doing the thing where it stares at the glass.',
            'Pixel has found the one interesting corner of the bowl again.',
            'Pixel is swimming through the taskbar. Nobody has told it it cannot.',
        ],
        hungryLines: [
            'Pixel is circling the top of the bowl, hoping.',
            'Pixel is doing the mouth thing at the surface.',
            'Pixel has swum to the front of the bowl and stopped.',
        ],
        starvingLines: [
            'Pixel really needs feeding by now.',
            'Pixel has stopped circling, which for a fish is quite the statement.',
        ],
        welcomeBackLines: [
            "Pixel's bowl is looking a little empty. Welcome back.",
            'Pixel has done several thousand laps since you were last here. It kept count of none of them.',
        ],
        feedLines: [
            'Pixel snaps up the flakes immediately.',
            'Pixel takes one flake, spits it out, and takes it again.',
            'Pixel eats and then swims a small victory lap.',
        ],
        petLines: [
            'Pixel presses against the glass. About as close to affection as a fish gets.',
            'Pixel follows your pointer along the bowl the whole way.',
            'Pixel bumps the glass where your hand is. Twice.',
        ],
        trickName: 'does a barrel roll',
        trickLines: [
            'Pixel does a barrel roll. It was over quickly but it definitely happened.',
            'Pixel loops the loop twice and returns to staring at nothing.',
            'Pixel executes a flawless barrel roll and immediately forgets it could.',
        ],
        playLines: [
            'Pixel is chasing the flake with genuine, uncomplicated joy.',
            'Pixel nudges the flake back over to you. Nobody taught it that.',
            'Pixel pushes the flake all the way home with its nose.',
        ],
        heldLines: [
            'Pixel is out of the water and taking it remarkably well.',
            'Pixel is flapping gently. Pixel would like to go back in the bowl.',
            'Pixel has brought the bowl with it, which raises questions.',
        ],
        droppedLines: [
            'Pixel plops back down and resumes swimming through solid taskbar.',
            'Pixel bounces once, forgets the entire incident, and swims on.',
            'Pixel lands with a small splash that leaves no water anywhere.',
        ],
        wakeLines: [
            'Pixel was asleep with its eyes open. Fish do that.',
            'Pixel resumes swimming from exactly where it stopped.',
        ],
        dizzyLines: [
            'Pixel is swimming in a corkscrew and appears to be enjoying it.',
            'Pixel has come to rest at an angle. It will sort itself out.',
        ],
        climbLines: [
            'Pixel has swum up the side of the screen. There is no water there.',
            'Pixel is at the top of the wall. The bowl came too.',
        ],
        wallNapLines: [
            'Pixel is asleep against the wall, drifting very slightly.',
        ],
        runAwayLines: [
            'Pixel has hidden behind the taskbar. The bowl is still visible.',
        ],
        comeBackLines: [
            'Pixel swims back into view at the same unhurried speed as always.',
        ],
        respawnLines: [
            'Pixel drops back in from the top of the screen, bowl and all, entirely unbothered.',
        ],
        reactionLines: {
            press: ['Pixel bumps the Start button with the rim of its bowl.'],
            heart: ['Pixel does the affection thing. It is subtle. It counts.'],
            cool: ['Pixel is wearing sunglasses over a bowl. Do not overthink it.'],
            yap: [
                'Pixel tips onto its side and opens and closes its mouth at you.',
                'Pixel is saying something. Pixel is a fish.',
            ],
            sing: ['Pixel blows a stream of bubbles in what is very nearly a tune.'],
            speechless: ['Pixel stares. Pixel has been staring for some time.'],
            worry: ['Pixel has noticed the water level and is thinking about it.'],
        },
        toyName: 'a flake',
        toyColor: '#e8c86a',
        treatName: 'a pinch of flakes',
        anatomy: { hat: 0.2, eyes: 0.58, neck: 0.92, headWidth: 0.3 },
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
    /* --- the machine, rather than the visitor -------------------------
     * VS Code's pet watches the agent: it types at a tiny terminal while
     * you type, thinks in a speech bubble while the model is working, and
     * claps when it needs you. That is the part worth stealing — a
     * creature that only responds to being poked is a toy, and one that
     * responds to what the computer is doing is a colleague.
     *
     * The desktop equivalent of "the agent is thinking" is the desktop
     * itself: windows opening and closing, a crash, music starting. */
    | 'appOpened'
    | 'appClosed'
    | 'error'
    | 'music';

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
    notePetMoment('adopted', { id: species });
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
    notePetMoment('fed', { total: current.totalFeedings });
    triggerCheckInIfDue();
}

export function pettPet(): void {
    current = { ...current, totalPets: current.totalPets + 1 };
    bumpExcited();
    persist();
    emit('patted');
    notePetMoment('patted', { total: current.totalPets });
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
    notePetMoment('trick', { total: current.totalTricks });
    triggerCheckInIfDue();
}

/** Throw the toy. The chase, the catch and the return all live in the view. */
export function playFetch(): void {
    current = { ...current, totalGames: current.totalGames + 1 };
    bumpExcited();
    persist();
    emit('fetch');
    notePetMoment('fetch', { total: current.totalGames });
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
    notePetMoment('treat', { total: current.totalTreats });
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
 * Everything else the machine does that the creature ought to notice.
 *
 * Deliberately *not* routed through `bumpExcited`: closing a window is not a
 * treat, and a crash is certainly not. These change what the animal is doing
 * for a second or two without touching its mood, which is what keeps the
 * hunger model honest — a visitor cannot keep a pet fed by opening windows.
 */
export function noticePetDesktopEvent(
    kind: 'appClosed' | 'error' | 'music'
): void {
    if (!current.species) return;
    emit(kind);
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
