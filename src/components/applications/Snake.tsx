import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { playClick, playError } from '../os/sounds';

/**
 * Snake.
 *
 * The Nokia one, on a Windows 95 desktop — anachronistic by a year or two and
 * nobody has ever minded. Arrow keys or WASD; the four buttons under the board
 * are there so it can be played on a touch screen, where there is no keyboard
 * to press.
 *
 * The loop is a `setInterval` rather than `requestAnimationFrame` on purpose:
 * the game moves in whole cells at a fixed tempo, so a frame-accurate clock
 * would only mean doing arithmetic to arrive back at the same tick rate.
 */

const COLS = 20;
const ROWS = 16;
const CELL = 14;
const START_SPEED = 160;
/** How much faster it gets per apple, and the floor it never goes below. */
const SPEED_STEP = 4;
const MIN_SPEED = 70;
const HIGH_SCORE_KEY = 'snake.highScore.v1';

interface Point {
    x: number;
    y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const DELTAS: { [key in Direction]: Point } = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

const OPPOSITE: { [key in Direction]: Direction } = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};

const startingSnake = (): Point[] => [
    { x: 6, y: 8 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
];

/** Somewhere the snake isn't. */
const placeApple = (snake: Point[]): Point => {
    const free: Point[] = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
        }
    }
    return free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
};

const loadHighScore = (): number => {
    try {
        return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch {
        return 0;
    }
};

export interface SnakeProps extends WindowAppProps {}

const Snake: React.FC<SnakeProps> = ({ onInteract, onClose, onMinimize }) => {
    const [snake, setSnake] = useState<Point[]>(startingSnake);
    const [apple, setApple] = useState<Point>(() => placeApple(startingSnake()));
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(loadHighScore);
    const [running, setRunning] = useState(false);
    const [dead, setDead] = useState(false);

    /**
     * The direction the snake is travelling, and the one queued for the next
     * tick. Two presses inside one tick would otherwise let you turn back on
     * yourself — right then up, say, while still moving left — and die to a
     * move you never actually made.
     */
    const direction = useRef<Direction>('right');
    const queued = useRef<Direction | null>(null);

    const reset = useCallback(() => {
        const fresh = startingSnake();
        direction.current = 'right';
        queued.current = null;
        setSnake(fresh);
        setApple(placeApple(fresh));
        setScore(0);
        setDead(false);
        setRunning(true);
    }, []);

    const turn = useCallback(
        (next: Direction) => {
            // Ignore a reversal, and don't let one be queued either.
            if (next === OPPOSITE[direction.current]) return;
            queued.current = next;
            if (!running && !dead) setRunning(true);
        },
        [running, dead]
    );

    // The tick.
    useEffect(() => {
        if (!running || dead) return;
        const speed = Math.max(MIN_SPEED, START_SPEED - score * SPEED_STEP);
        const id = window.setInterval(() => {
            setSnake((previous) => {
                if (queued.current) {
                    direction.current = queued.current;
                    queued.current = null;
                }
                const delta = DELTAS[direction.current];
                const head = {
                    x: previous[0].x + delta.x,
                    y: previous[0].y + delta.y,
                };

                const hitWall =
                    head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
                // The tail tip moves out of the way this tick, so running into
                // where it *was* is not a collision.
                const hitSelf = previous
                    .slice(0, -1)
                    .some((s) => s.x === head.x && s.y === head.y);

                if (hitWall || hitSelf) {
                    setDead(true);
                    setRunning(false);
                    playError();
                    setScore((final) => {
                        setHighScore((best) => {
                            if (final <= best) return best;
                            try {
                                localStorage.setItem(
                                    HIGH_SCORE_KEY,
                                    String(final)
                                );
                            } catch {
                                /* storage disabled — score just isn't kept */
                            }
                            return final;
                        });
                        return final;
                    });
                    return previous;
                }

                const ate = head.x === apple.x && head.y === apple.y;
                const next = [head, ...previous];
                if (ate) {
                    setScore((s) => s + 1);
                    setApple(placeApple(next));
                    playClick();
                } else {
                    next.pop();
                }
                return next;
            });
        }, speed);
        return () => window.clearInterval(id);
    }, [running, dead, score, apple]);

    // Keyboard. Bound to the window because the board isn't focusable, and the
    // arrows are swallowed so they don't scroll the desktop underneath.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const map: { [key: string]: Direction } = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right',
                w: 'up',
                s: 'down',
                a: 'left',
                d: 'right',
            };
            const next = map[e.key] || map[e.key.toLowerCase()];
            if (next) {
                e.preventDefault();
                turn(next);
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                if (dead) reset();
                else setRunning((r) => !r);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [turn, dead, reset]);

    const status = dead
        ? `Game over — ${score} point${score === 1 ? '' : 's'}`
        : running
          ? `Score ${score}`
          : 'Press an arrow key to start';

    return (
        <Window
            top={100}
            left={170}
            width={COLS * CELL + 26}
            height={ROWS * CELL + 168}
            windowTitle="Snake"
            windowBarIcon="snakeIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <div style={styles.scoreBar}>
                    <span style={styles.score}>Score: {score}</span>
                    <span style={styles.score}>Best: {highScore}</span>
                </div>

                <div
                    style={Object.assign({}, styles.board, {
                        width: COLS * CELL,
                        height: ROWS * CELL,
                    })}
                >
                    {snake.map((segment, i) => (
                        <div
                            key={`${segment.x}-${segment.y}-${i}`}
                            style={Object.assign({}, styles.segment, {
                                left: segment.x * CELL,
                                top: segment.y * CELL,
                                background: i === 0 ? '#00e000' : '#00a800',
                            })}
                        />
                    ))}
                    <div
                        style={Object.assign({}, styles.apple, {
                            left: apple.x * CELL,
                            top: apple.y * CELL,
                        })}
                    />
                    {(dead || !running) && (
                        <div style={styles.overlay}>
                            <p style={styles.overlayTitle}>
                                {dead ? 'Game Over' : 'Snake'}
                            </p>
                            <p style={styles.overlayText}>
                                {dead
                                    ? `You scored ${score}.`
                                    : 'Arrow keys or WASD to move.'}
                            </p>
                            <button
                                style={styles.button}
                                onClick={() => {
                                    playClick();
                                    dead ? reset() : setRunning(true);
                                }}
                            >
                                {dead ? 'Play Again' : 'Start'}
                            </button>
                        </div>
                    )}
                </div>

                {/* A D-pad, so the game works without a keyboard. */}
                <div style={styles.pad}>
                    <button
                        style={styles.padButton}
                        onClick={() => turn('up')}
                        aria-label="Up"
                    >
                        ▲
                    </button>
                    <div style={styles.padRow}>
                        <button
                            style={styles.padButton}
                            onClick={() => turn('left')}
                            aria-label="Left"
                        >
                            ◀
                        </button>
                        <button
                            style={styles.padButton}
                            onClick={() => turn('down')}
                            aria-label="Down"
                        >
                            ▼
                        </button>
                        <button
                            style={styles.padButton}
                            onClick={() => turn('right')}
                            aria-label="Right"
                        >
                            ▶
                        </button>
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        height: '100%',
        gap: 6,
        padding: 8,
        background: Colors.lightGray,
    },
    scoreBar: {
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        padding: '2px 4px',
        flexShrink: 0,
    },
    score: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    board: {
        position: 'relative',
        background: '#0b3d0b',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        overflow: 'hidden',
        flexShrink: 0,
    },
    segment: {
        position: 'absolute',
        width: CELL - 1,
        height: CELL - 1,
        border: '1px solid #0b3d0b',
    },
    apple: {
        position: 'absolute',
        width: CELL - 3,
        height: CELL - 3,
        margin: 1,
        background: '#d80000',
        borderRadius: '50%',
        border: '1px solid #ff8080',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: 'rgba(11, 61, 11, 0.86)',
    },
    overlayTitle: {
        fontFamily: 'MSSerif',
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.white,
    },
    overlayText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.white,
        textAlign: 'center',
    },
    button: {
        padding: '4px 14px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
    },
    pad: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        flexShrink: 0,
    },
    padRow: {
        gap: 3,
    },
    padButton: {
        width: 34,
        height: 26,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
        touchAction: 'manipulation',
    },
};

export default Snake;
