/**
 * Which of the framed programs currently has work in it.
 *
 * Clippy offers to save your drawing or your note, which means he has to know
 * that Paint is open and that something has been drawn in it. Paint lives in an
 * iframe and Clippy lives in the desktop's React tree, so this is the bit in
 * the middle: `ProgramFrame` registers a program while it is open, the frame
 * updates the `dirty` flag from what the program reports, and Clippy reads the
 * list.
 *
 * A module-level store rather than context, for the same reason as
 * `desktopFiles.ts` and `installedApps.ts`: the two sides render in different
 * places and both have to see the same thing.
 */

import { useEffect, useState } from 'react';
import { FileKind } from './communityFiles';

export interface SaveableProgram {
    /** The window key, so a second Paint window replaces its own entry. */
    id: string;
    /** Which folder its files belong in, and which noun Clippy uses. */
    kind: FileKind;
    /** "Paint" / "Notepad" — what the balloon calls it. */
    programName: string;
    /** Has anything been done that would be worth keeping? */
    dirty: boolean;
    /** Opens the program's own Save As box. */
    requestSave: () => void;
}

const programs = new Map<string, SaveableProgram>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

export function registerSaveable(program: SaveableProgram): void {
    programs.set(program.id, program);
    notify();
}

export function unregisterSaveable(id: string): void {
    if (programs.delete(id)) notify();
}

export function setSaveableDirty(id: string, dirty: boolean): void {
    const program = programs.get(id);
    if (!program || program.dirty === dirty) return;
    programs.set(id, { ...program, dirty });
    notify();
}

/**
 * The most recently opened program with unsaved work, if any. Newest wins
 * because it is the one you were just looking at.
 */
export function currentSaveable(): SaveableProgram | null {
    let latest: SaveableProgram | null = null;
    programs.forEach((program) => {
        if (program.dirty) latest = program;
    });
    return latest;
}

/** Subscribes a component to the registry. */
export function useSaveablePrograms(): SaveableProgram | null {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return currentSaveable();
}
