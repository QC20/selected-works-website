import React, { useEffect, useRef, useState } from 'react';

import type { DosPlayer as Instance } from 'js-dos';

import Colors from '../../constants/colors';
import Button from '../os/Button';
import { loadJsDos } from './jsDos';

interface PlayerProps {
    width: number;
    height: number;
    bundleUrl: string;
}

/**
 * 'arriving' covers both halves of the wait — fetching the emulator and
 * booting the bundle — because from the visitor's side they are one wait,
 * and js-dos paints its own loading screen over the canvas for the second
 * half.
 */
type Status = 'arriving' | 'running' | 'unavailable';

export default function DosPlayer(props: PlayerProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    /**
     * Kept in a ref as well as in state: the cleanup below has to stop
     * whatever was built, and it runs in a closure that cannot see a later
     * `setDos`.
     */
    const instanceRef = useRef<Instance | null>(null);
    const [dos, setDos] = useState<Instance | null>(null);
    const [status, setStatus] = useState<Status>('arriving');
    /** Bumped by Retry, which is the only thing that re-runs the effect. */
    const [attempt, setAttempt] = useState(0);

    /**
     * `doom.jsdos` and the rest sit at the site root, but js-dos fetches the
     * bundle over a relative XHR, which the browser resolves against the
     * *current* document URL. Open a game while the showcase's router has
     * the address bar on /projects and the request goes to
     * /projects/doom.jsdos — a 404, and a game that never starts. Anchoring
     * it here costs nothing on the desktop, where the path is / anyway.
     */
    const bundleUrl = /^([a-z]+:|\/)/i.test(props.bundleUrl)
        ? props.bundleUrl
        : `${process.env.PUBLIC_URL}/${props.bundleUrl}`;

    useEffect(() => {
        let cancelled = false;
        setStatus('arriving');

        loadJsDos()
            .then((Dos) => {
                // The window was closed while the emulator was still on its
                // way. Nothing has been built, so there is nothing to stop —
                // this guard is here so nothing gets built now either.
                if (cancelled || !rootRef.current) return;
                const root = rootRef.current;
                // js-dos builds its whole interface into this element, so a
                // retry has to hand it the same blank div the first attempt
                // got. React owns the element but was never given children,
                // so it has no opinion about what is inside it.
                root.innerHTML = '';
                const instance = Dos(root);
                instanceRef.current = instance;
                // js-dos's own toolbar sits above the screen. Removing it is
                // unchanged from before: this desktop supplies the window
                // furniture itself, and two sets of controls read as a bug.
                const chrome = root.getElementsByClassName('flex-grow-0');
                while (chrome.length > 0) {
                    chrome[0].remove();
                }
                setDos(instance);
                setStatus('running');
            })
            .catch(() => {
                if (!cancelled) setStatus('unavailable');
            });

        return () => {
            cancelled = true;
            instanceRef.current?.stop();
            instanceRef.current = null;
        };
    }, [attempt]);

    useEffect(() => {
        if (dos !== null) {
            dos.run(bundleUrl);
        }
    }, [dos, bundleUrl]);

    const overlay = Object.assign({}, styles.overlay, {
        width: props.width,
        height: props.height,
    });

    return (
        <React.Fragment>
            {/* First and always, so the element js-dos is handed is never the
                one React is adding or removing a sibling in front of. */}
            <div
                ref={rootRef}
                style={{
                    width: props.width,
                    height: props.height,
                    position: 'absolute',
                }}
            ></div>
            {status === 'arriving' && (
                <div style={overlay}>
                    <p style={styles.text}>Starting DOSBox&hellip;</p>
                </div>
            )}
            {status === 'unavailable' && (
                <div style={overlay}>
                    <p style={styles.text}>
                        DOSBox could not be loaded.
                    </p>
                    <p style={styles.subtext}>
                        Check the connection and try again.
                    </p>
                    <div style={styles.buttonRow}>
                        <Button
                            text="Retry"
                            onClick={() => setAttempt((n) => n + 1)}
                        />
                    </div>
                </div>
            )}
        </React.Fragment>
    );
}

const styles: StyleSheetCSS = {
    /**
     * Over the player rather than inside it, and black rather than grey:
     * this is the screen a DOS machine shows while it is coming up, not a
     * dialog about one. `flexDirection` is explicit because every `div` on
     * this site is a flex container (see App.css).
     */
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: Colors.black,
    },
    text: {
        fontFamily: 'Terminal, monospace',
        fontSize: 16,
        color: Colors.white,
    },
    subtext: {
        fontFamily: 'Terminal, monospace',
        fontSize: 12,
        color: Colors.darkGray,
    },
    buttonRow: {
        marginTop: 8,
        fontFamily: 'MSSerif',
        fontSize: 12,
    },
};
