import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { playChime, playClick, playError } from '../os/sounds';

/**
 * Perception Lab — two real, small experiments rather than two fake ones.
 * ------------------------------------------------------------------------
 * Simple reaction time and the Stroop task are two of the oldest, most
 * replicated paradigms in experimental psychology — reaction time dates to
 * Donders in the 1860s, Stroop's colour-word interference effect to 1935.
 * Public domain, method rather than expression, the same category as a
 * shuffle algorithm: implementing the *procedure* here is not different from
 * implementing quicksort.
 *
 * Both are timed with `performance.now()`, not `Date.now()` — sub-millisecond,
 * monotonic, unaffected by the system clock changing mid-trial. The published
 * baselines quoted in the results (~250ms simple RT, a Stroop cost around
 * 50-150ms) are widely reported figures from the literature, offered for
 * calibration, not a claim about this specific setup's precision — a browser
 * on unknown hardware over an unknown display's refresh rate is not a lab.
 */

type Mode = 'menu' | 'rt' | 'stroop';

/* -------------------------------------------------------------------------
 * Simple reaction time
 * ---------------------------------------------------------------------- */

const RT_TRIALS = 6;

const ReactionTime: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [phase, setPhase] = useState<'ready' | 'waiting' | 'go' | 'early' | 'done'>(
        'ready'
    );
    const [times, setTimes] = useState<number[]>([]);
    const goAt = useRef(0);
    const timer = useRef<number | undefined>(undefined);

    const armTrial = useCallback(() => {
        setPhase('waiting');
        const delay = 1200 + Math.random() * 2200;
        timer.current = window.setTimeout(() => {
            goAt.current = performance.now();
            setPhase('go');
        }, delay);
    }, []);

    useEffect(() => {
        if (phase === 'ready') armTrial();
        return () => window.clearTimeout(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFieldPress = () => {
        if (phase === 'waiting') {
            window.clearTimeout(timer.current);
            playError();
            setPhase('early');
            return;
        }
        if (phase === 'go') {
            const rt = performance.now() - goAt.current;
            const next = [...times, rt];
            setTimes(next);
            playClick();
            if (next.length >= RT_TRIALS) {
                setPhase('done');
            } else {
                setPhase('waiting');
                const delay = 1200 + Math.random() * 2200;
                timer.current = window.setTimeout(() => {
                    goAt.current = performance.now();
                    setPhase('go');
                }, delay);
            }
        }
        if (phase === 'early' || phase === 'done') {
            // Restart.
            setTimes([]);
            armTrial();
        }
    };

    const mean = times.length
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;
    const best = times.length ? Math.round(Math.min(...times)) : 0;

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <button type="button" style={styles.backButton} onClick={onExit}>
                    ← Back
                </button>
                <span style={styles.title}>Simple Reaction Time</span>
            </div>

            <p style={styles.blurb}>
                Click the field below. Wait for it to turn green, then click
                again as fast as you can. Click too soon and the trial resets
                — that is the point of the wait being random.
            </p>

            <div
                role="button"
                tabIndex={0}
                onClick={onFieldPress}
                onKeyDown={(e) => e.key === ' ' && onFieldPress()}
                style={{
                    ...styles.rtField,
                    background:
                        phase === 'go'
                            ? '#1a8a34'
                            : phase === 'early'
                            ? '#a52a2a'
                            : phase === 'done'
                            ? '#2b2f77'
                            : '#333',
                }}
            >
                <span style={styles.rtFieldText}>
                    {phase === 'ready' && 'Getting ready…'}
                    {phase === 'waiting' && 'Wait for green…'}
                    {phase === 'go' && 'Click!'}
                    {phase === 'early' && 'Too soon — click to try again'}
                    {phase === 'done' &&
                        `Mean ${mean} ms · best ${best} ms — click to run again`}
                </span>
            </div>

            {times.length > 0 && (
                <div style={styles.trialRow}>
                    {times.map((t, i) => (
                        <span key={i} style={styles.trialChip}>
                            {Math.round(t)}ms
                        </span>
                    ))}
                </div>
            )}

            <p style={styles.footnote}>
                Published simple visual reaction time averages around 250ms
                for adults (Donders, 1868; Woodworth &amp; Schlosberg, 1954) —
                a rough yardstick, not a diagnosis. Screen refresh rate and
                trackpad latency both move this number more than reflexes do.
            </p>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Stroop task
 * ---------------------------------------------------------------------- */

const STROOP_COLORS = [
    { name: 'RED', hex: '#c0392b' },
    { name: 'GREEN', hex: '#1a8a34' },
    { name: 'BLUE', hex: '#1a56c4' },
    { name: 'YELLOW', hex: '#b8860b' },
];

const STROOP_TRIALS = 16;

interface StroopTrial {
    word: string;
    ink: string;
    congruent: boolean;
}

const buildStroopTrial = (): StroopTrial => {
    const word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    // Roughly half congruent, half not — a real Stroop deck is majority
    // incongruent, but 50/50 makes the within-subject comparison cleaner
    // over a short 16-trial run.
    const congruent = Math.random() < 0.5;
    let ink = word;
    if (!congruent) {
        const others = STROOP_COLORS.filter((c) => c.name !== word.name);
        ink = others[Math.floor(Math.random() * others.length)];
    }
    return { word: word.name, ink: ink.hex, congruent };
};

const Stroop: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [trial, setTrial] = useState<StroopTrial | null>(null);
    const [index, setIndex] = useState(0);
    const [congruentTimes, setCongruentTimes] = useState<number[]>([]);
    const [incongruentTimes, setIncongruentTimes] = useState<number[]>([]);
    const [flash, setFlash] = useState<'right' | 'wrong' | null>(null);
    const shownAt = useRef(0);

    const next = useCallback(() => {
        setTrial(buildStroopTrial());
        shownAt.current = performance.now();
        setFlash(null);
    }, []);

    useEffect(() => next(), [next]);

    const answer = (chosen: string) => {
        if (!trial || flash) return;
        const rt = performance.now() - shownAt.current;
        const correctColor = STROOP_COLORS.find((c) => c.hex === trial.ink)!;
        const correct = chosen === correctColor.name;

        if (correct) {
            playClick();
            setFlash('right');
            if (trial.congruent) setCongruentTimes((t) => [...t, rt]);
            else setIncongruentTimes((t) => [...t, rt]);
        } else {
            playError();
            setFlash('wrong');
            // A wrong answer doesn't count toward either mean — it isn't a
            // reaction time if it's answering the wrong question.
        }

        window.setTimeout(() => {
            if (index + 1 >= STROOP_TRIALS) {
                setIndex(index + 1);
                setTrial(null);
            } else {
                setIndex((i) => i + 1);
                next();
            }
        }, 260);
    };

    const restart = () => {
        setIndex(0);
        setCongruentTimes([]);
        setIncongruentTimes([]);
        next();
    };

    const done = index >= STROOP_TRIALS && !trial;
    const meanOf = (arr: number[]) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const congruentMean = meanOf(congruentTimes);
    const incongruentMean = meanOf(incongruentTimes);
    const cost = incongruentMean && congruentMean ? incongruentMean - congruentMean : null;

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <button type="button" style={styles.backButton} onClick={onExit}>
                    ← Back
                </button>
                <span style={styles.title}>Stroop Task</span>
            </div>

            {!done ? (
                <>
                    <p style={styles.blurb}>
                        Click the button matching the <em>ink colour</em> the
                        word is printed in — not the word itself. Trial{' '}
                        {Math.min(index + 1, STROOP_TRIALS)} of {STROOP_TRIALS}.
                    </p>

                    <div style={styles.stroopStage}>
                        {trial && (
                            <span
                                style={{
                                    ...styles.stroopWord,
                                    color: trial.ink,
                                    ...(flash === 'wrong'
                                        ? { textDecoration: 'line-through' }
                                        : null),
                                }}
                            >
                                {trial.word}
                            </span>
                        )}
                    </div>

                    <div style={styles.stroopButtons}>
                        {STROOP_COLORS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                style={{ ...styles.stroopButton, background: c.hex }}
                                onClick={() => answer(c.name)}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <div style={styles.results}>
                    <p style={styles.line}>
                        <b>Congruent</b> (word and ink agree): {congruentMean || '—'} ms
                        {' '}({congruentTimes.length} correct)
                    </p>
                    <p style={styles.line}>
                        <b>Incongruent</b> (word and ink disagree):{' '}
                        {incongruentMean || '—'} ms ({incongruentTimes.length} correct)
                    </p>
                    {cost !== null && (
                        <p style={styles.line}>
                            <b>Stroop interference cost:</b> {cost > 0 ? '+' : ''}
                            {cost} ms
                        </p>
                    )}
                    <button
                        type="button"
                        style={styles.restartButton}
                        onClick={restart}
                    >
                        Run again
                    </button>
                </div>
            )}

            <p style={styles.footnote}>
                The gap between those two numbers is the Stroop effect
                (Stroop, 1935) — the cost of suppressing an automatic reading
                response to report a different, less automatic one. Published
                costs typically run 50-150ms; naming the words aloud usually
                shows a larger effect than clicking a button does.
            </p>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Shell
 * ---------------------------------------------------------------------- */

export interface PerceptionLabProps extends WindowAppProps {}

const PerceptionLab: React.FC<PerceptionLabProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [mode, setMode] = useState<Mode>('menu');

    return (
        <Window
            top={90}
            left={200}
            width={460}
            height={460}
            windowTitle="Perception Lab"
            windowBarIcon="perceptionLabIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="Two real, small experiments"
        >
            {mode === 'menu' && (
                <div style={styles.root}>
                    <p style={styles.blurb}>
                        Two of the oldest paradigms in experimental psychology,
                        both actually timed rather than dressed up —
                        <code style={styles.code}>performance.now()</code>,
                        not a stopwatch GIF.
                    </p>
                    <button
                        type="button"
                        style={styles.menuButton}
                        onClick={() => {
                            playChime();
                            setMode('rt');
                        }}
                    >
                        Simple Reaction Time
                    </button>
                    <button
                        type="button"
                        style={styles.menuButton}
                        onClick={() => {
                            playChime();
                            setMode('stroop');
                        }}
                    >
                        Stroop Task
                    </button>
                    <p style={styles.footnote}>
                        Nothing here is sent anywhere or stored — every run
                        starts fresh, the same as walking up to a real testing
                        booth.
                    </p>
                </div>
            )}
            {mode === 'rt' && <ReactionTime onExit={() => setMode('menu')} />}
            {mode === 'stroop' && <Stroop onExit={() => setMode('menu')} />}
        </Window>
    );
};

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        padding: 12,
        gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backButton: {
        padding: '3px 8px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    title: { fontFamily: 'MSSerif', fontWeight: 'bold', fontSize: 13 },
    blurb: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
        margin: 0,
    },
    code: {
        fontFamily: 'monospace',
        fontSize: 10,
        background: '#00000014',
        padding: '1px 4px',
    },
    menuButton: {
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    footnote: {
        marginTop: 'auto',
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#444',
    },

    // RT
    rtField: {
        flex: 1,
        minHeight: 140,
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        border: `2px solid ${Colors.darkGray}`,
    },
    rtFieldText: {
        fontFamily: 'MSSerif',
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        padding: '0 16px',
    },
    trialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    trialChip: {
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '2px 6px',
        background: '#00000014',
        color: Colors.black,
    },

    // Stroop
    stroopStage: {
        flex: 1,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        background: '#111',
        border: `2px solid ${Colors.darkGray}`,
    },
    stroopWord: {
        fontFamily: 'Millennium, sans-serif',
        fontWeight: 'bold',
        fontSize: 34,
        letterSpacing: 2,
    },
    stroopButtons: { flexDirection: 'row', gap: 8 },
    stroopButton: {
        flex: 1,
        padding: '8px 4px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
        border: '2px solid rgba(255,255,255,0.5)',
    },
    results: { flexDirection: 'column', gap: 6 },
    line: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.black,
        margin: 0,
    },
    restartButton: {
        alignSelf: 'flex-start',
        marginTop: 4,
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
};

export default PerceptionLab;
