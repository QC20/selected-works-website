import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Win98Program } from './win98Programs';
import { FileKind, invalidateSync, publishFile } from '../os/communityFiles';
import {
    registerSaveable,
    setSaveableDirty,
    unregisterSaveable,
} from '../os/saveablePrograms';

/**
 * The two programs whose files go into the shared gallery, and the folder each
 * writes to. Anything not listed here (Solitaire, the Calculator) has nothing
 * to save, so it is never registered and Clippy never offers.
 */
const SAVEABLE: { [key: string]: FileKind } = {
    paint: 'painting',
    notepad: 'note',
};

/**
 * Hosts one of the vendored Windows 98 programs (see `win98Programs.ts`) in a
 * normal desktop window: taskbar entry, minimize, drag, resize, all the same
 * as any other app here.
 *
 * The program itself is a static page under `public/98/`, loaded in an iframe.
 * That's how 98.js runs them too — each one is a self-contained document that
 * brings its own menu bar — so the window deliberately has no chrome of its
 * own beyond the frame. (Contrast WebFrame, which wraps *external* sites and
 * adds Internet Explorer's menu and address bar around them.)
 */

/**
 * The slice of 98.js's window object that the framed programs actually reach
 * for, as `frameElement.$window`.
 *
 * Notepad and Sound Recorder use it to keep the title bar in step with the
 * document they have open, and to intervene when you close the window with
 * unsaved changes. Notepad calls it without checking it exists, so the shim
 * has to be in place before the frame's scripts run — see `useLayoutEffect`
 * below, which is why the iframe gets its `src` a beat after it is created.
 */
interface FramedWindowEvent {
    preventDefault: () => void;
}
interface FramedWindowShim {
    title: (text: string) => void;
    on: (event: string, handler: (e: FramedWindowEvent) => void) => void;
    close: (force?: boolean) => void;
}

export interface ProgramFrameProps extends WindowAppProps {
    program: Win98Program;
}

const ProgramFrame: React.FC<ProgramFrameProps> = ({
    program,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    // Notepad and Sound Recorder retitle the window as you open and save files.
    const [title, setTitle] = useState(program.name);

    /**
     * Close handlers the framed program registered. Notepad calls
     * `e.preventDefault()` here when there are unsaved changes, puts up its own
     * "Do you want to save?" box, and closes for real afterwards.
     */
    const closeHandlers = useRef<((e: FramedWindowEvent) => void)[]>([]);
    const requestClose = useCallback(() => {
        let prevented = false;
        const event = {
            preventDefault: () => {
                prevented = true;
            },
        };
        closeHandlers.current.forEach((handler) => {
            try {
                handler(event);
            } catch {
                // A misbehaving program must not be able to trap its window open.
            }
        });
        if (!prevented) onClose();
    }, [onClose]);

    // Kept in a ref so the shim handed to the frame never goes stale.
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    /**
     * Attach the shim, *then* start the navigation. Doing it in this order is
     * what guarantees `frameElement.$window` is there by the time the framed
     * document's scripts run.
     */
    const [src, setSrc] = useState<string | undefined>(undefined);
    useLayoutEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const shim: FramedWindowShim = {
            title: (text) => setTitle(text || program.name),
            on: (event, handler) => {
                if (event === 'close') closeHandlers.current.push(handler);
            },
            // Called with `true` once the program has finished asking about
            // unsaved work, so this bypasses the handlers and just closes.
            close: () => closeRef.current(),
        };
        (frame as any).$window = shim;
        setSrc(program.src);
    }, [program.src, program.name]);

    /**
     * While a pointer is held down anywhere *outside* this iframe, the iframe
     * stops taking pointer events.
     *
     * Without this, dragging a window by its title bar or resizing it by its
     * corner stops dead the moment the cursor crosses an iframe: the events go
     * to the framed document instead of to the drag handlers this desktop
     * registered on `window`. A press inside the iframe never reaches us, so
     * the program's own interactions are unaffected.
     */
    const [shielded, setShielded] = useState(false);
    useEffect(() => {
        const down = () => setShielded(true);
        const release = () => setShielded(false);
        // Belt and braces: if a pointerup is ever missed (it can be swallowed
        // by another frame), the next move with no buttons held clears it, so
        // the program can't get stuck unclickable.
        const move = (e: PointerEvent) => {
            if (e.buttons === 0) setShielded(false);
        };
        window.addEventListener('pointerdown', down);
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('pointermove', move);
        return () => {
            window.removeEventListener('pointerdown', down);
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            window.removeEventListener('pointermove', move);
        };
    }, []);

    /**
     * Winamp draws its own title bar with its own close and minimize buttons
     * (it's Webamp, not a plain document), so the page posts up to us when
     * either is used — otherwise closing Winamp would leave an empty window
     * and a taskbar entry behind.
     */
    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.source !== frameRef.current?.contentWindow) return;
            if (e.data?.type === 'win98:close') onClose();
            if (e.data?.type === 'win98:minimize') onMinimize();

            // Paint and Notepad announce a save (see gallery-bridge.js). The
            // file is already on the fake C: drive by now; this puts a copy in
            // the shared gallery so every other visitor gets it too. The
            // credentials live in this bundle, not in the framed page, which
            // is why the upload happens on this side of the boundary.
            if (e.data?.type === 'win98:file-saved') {
                const { kind, name, content } = e.data;
                if (typeof name === 'string' && typeof content === 'string') {
                    publishFile(kind as FileKind, name, content).then(
                        (published) => {
                            // A published file should show up in the folder
                            // listing next time it is opened.
                            if (published) invalidateSync();
                        }
                    );
                }
                setSaveableDirty(program.key, false);
            }

            if (e.data?.type === 'win98:dirty') {
                setSaveableDirty(program.key, !!e.data.dirty);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [onClose, onMinimize, program.key]);

    /**
     * While Paint or Notepad is open, tell the desktop so Clippy can offer to
     * save what is in it. `requestSave` posts down into the frame, where the
     * program opens its own Save As box — the visitor still names the file.
     */
    useEffect(() => {
        const kind = SAVEABLE[program.key];
        if (!kind) return;
        registerSaveable({
            id: program.key,
            kind,
            programName: program.name,
            // Assumed worth saving from the moment it opens: the programs
            // report their own state, but neither reliably says "still empty",
            // and an offer to save an empty canvas is a smaller failure than
            // never offering at all.
            dirty: true,
            requestSave: () =>
                frameRef.current?.contentWindow?.postMessage(
                    { type: 'win98:request-save' },
                    window.location.origin
                ),
        });
        return () => unregisterSaveable(program.key);
    }, [program.key, program.name]);

    /**
     * Pinball's and MS-DOS Prompt's documents are ready long before the
     * emulator behind them is, and each says so by dispatching an event on its
     * own frame. Hold the overlay until then rather than showing several
     * seconds of black canvas.
     */
    useEffect(() => {
        const frame = frameRef.current;
        if (!frame || !program.waitsForGameLoaded) return;
        const ready = () => setLoading(false);
        frame.addEventListener('game-loaded', ready);
        frame.addEventListener('game-load-failed', ready);
        // If the signal never comes — MS-DOS Prompt pulls DOSBox from js-dos's
        // CDN, so it can simply fail — show the program anyway rather than
        // leaving "Starting…" up forever.
        const giveUp = setTimeout(ready, 45000);
        return () => {
            clearTimeout(giveUp);
            frame.removeEventListener('game-loaded', ready);
            frame.removeEventListener('game-load-failed', ready);
        };
    }, [program.waitsForGameLoaded]);

    return (
        <Window
            top={54}
            left={96}
            width={program.width}
            height={program.height}
            windowTitle={title}
            windowBarIcon={program.icon}
            closeWindow={requestClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={loading ? `Starting ${program.name}…` : title}
        >
            <div style={styles.container}>
                <iframe
                    ref={frameRef}
                    src={src}
                    title={program.name}
                    style={Object.assign(
                        {},
                        styles.frame,
                        shielded && styles.shielded
                    )}
                    onLoad={() => {
                        if (!program.waitsForGameLoaded) setLoading(false);
                    }}
                    allow={
                        program.allowMicrophone
                            ? 'microphone; fullscreen'
                            : 'fullscreen'
                    }
                />
                {loading && (
                    <div style={styles.loadingOverlay}>
                        <p style={styles.loadingText}>
                            Starting {program.name}…
                        </p>
                    </div>
                )}
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
        overflow: 'hidden',
    },
    frame: {
        flex: 1,
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: Colors.lightGray,
    },
    shielded: {
        pointerEvents: 'none',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.lightGray,
        pointerEvents: 'none',
    },
    loadingText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
};

export default ProgramFrame;
