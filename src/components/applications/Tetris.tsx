import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { playClick, playError } from '../os/sounds';

/**
 * Tetris.
 *
 * The seven tetrominoes, in the colours the DOS and Game Boy generations
 * settled on. Left/right to move, up to rotate, down to drop a row faster,
 * space to slam it home; the buttons underneath do the same for touch.
 *
 * Two rules worth naming because they are what make it feel right rather than
 * merely correct:
 *
 *  - Rotation is *kicked*: if turning a piece would put it through a wall or
 *    another block, it is nudged one or two cells sideways and tried again.
 *    Without that, a bar against the left wall simply refuses to turn, which
 *    feels broken even though it is the honest result.
 *  - A piece that lands gets no grace period, but the next one spawns at the
 *    top immediately, and if *that* collides the game is over — which is the
 *    only losing condition.
 */

const COLS = 10;
const ROWS = 18;
const CELL = 16;
const HIGH_SCORE_KEY = 'tetris.highScore.v1';

/** Points for clearing 1, 2, 3 and 4 rows at once — a Tetris is worth eight singles. */
const LINE_SCORES = [0, 100, 300, 500, 800];

type Cell = string | null;
type Shape = number[][];

interface Piece {
    shape: Shape;
    colour: string;
    x: number;
    y: number;
}

const SHAPES: { shape: Shape; colour: string }[] = [
    // I
    { shape: [[1, 1, 1, 1]], colour: '#00c8c8' },
    // O
    {
        shape: [
            [1, 1],
            [1, 1],
        ],
        colour: '#e8e800',
    },
    // T
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
        ],
        colour: '#a800a8',
    },
    // S
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
        ],
        colour: '#00a800',
    },
    // Z
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
        ],
        colour: '#d80000',
    },
    // J
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
        ],
        colour: '#0000d8',
    },
    // L
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
        ],
        colour: '#e88000',
    },
];

const emptyBoard = (): Cell[][] =>
    Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

const randomPiece = (): Piece => {
    const { shape, colour } = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
        shape,
        colour,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0,
    };
};

/** Clockwise. Transpose, then reverse each row. */
const rotate = (shape: Shape): Shape =>
    shape[0].map((_, i) => shape.map((row) => row[i]).reverse());

const collides = (board: Cell[][], piece: Piece, dx = 0, dy = 0, shape?: Shape) => {
    const test = shape || piece.shape;
    for (let y = 0; y < test.length; y++) {
        for (let x = 0; x < test[y].length; x++) {
            if (!test[y][x]) continue;
            const nx = piece.x + x + dx;
            const ny = piece.y + y + dy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            // Above the ceiling is allowed — a spawning piece may overhang.
            if (ny >= 0 && board[ny][nx]) return true;
        }
    }
    return false;
};

const loadHighScore = (): number => {
    try {
        return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch {
        return 0;
    }
};

export interface TetrisProps extends WindowAppProps {}

const Tetris: React.FC<TetrisProps> = ({ onInteract, onClose, onMinimize }) => {
    const [board, setBoard] = useState<Cell[][]>(emptyBoard);
    const [piece, setPiece] = useState<Piece>(randomPiece);
    const [next, setNext] = useState<Piece>(randomPiece);
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [highScore, setHighScore] = useState(loadHighScore);
    const [running, setRunning] = useState(false);
    const [over, setOver] = useState(false);

    // The falling loop reads these, and reading them from state inside the
    // interval would capture whatever they were when the interval was made.
    const boardRef = useRef(board);
    const pieceRef = useRef(piece);
    boardRef.current = board;
    pieceRef.current = piece;

    const level = Math.floor(lines / 10) + 1;

    const reset = useCallback(() => {
        setBoard(emptyBoard());
        setPiece(randomPiece());
        setNext(randomPiece());
        setScore(0);
        setLines(0);
        setOver(false);
        setRunning(true);
    }, []);

    /** Settles the piece into the board, clears full rows, spawns the next. */
    const land = useCallback(() => {
        const current = pieceRef.current;
        const merged = boardRef.current.map((row) => [...row]);
        current.shape.forEach((row, y) =>
            row.forEach((filled, x) => {
                if (!filled) return;
                const by = current.y + y;
                const bx = current.x + x;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                    merged[by][bx] = current.colour;
                }
            })
        );

        const kept = merged.filter((row) => row.some((cell) => !cell));
        const cleared = ROWS - kept.length;
        while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));

        if (cleared) {
            playClick();
            setScore((s) => s + LINE_SCORES[cleared] * level);
            setLines((l) => l + cleared);
        }
        setBoard(kept);

        const spawned = next;
        if (collides(kept, spawned)) {
            setOver(true);
            setRunning(false);
            playError();
            setScore((final) => {
                setHighScore((best) => {
                    if (final <= best) return best;
                    try {
                        localStorage.setItem(HIGH_SCORE_KEY, String(final));
                    } catch {
                        /* storage disabled — score just isn't kept */
                    }
                    return final;
                });
                return final;
            });
            return;
        }
        setPiece(spawned);
        setNext(randomPiece());
    }, [next, level]);

    const move = useCallback(
        (dx: number) => {
            setPiece((current) =>
                collides(boardRef.current, current, dx, 0)
                    ? current
                    : { ...current, x: current.x + dx }
            );
        },
        []
    );

    const drop = useCallback(() => {
        if (collides(boardRef.current, pieceRef.current, 0, 1)) {
            land();
            return;
        }
        setPiece((current) => ({ ...current, y: current.y + 1 }));
    }, [land]);

    const slam = useCallback(() => {
        let distance = 0;
        while (!collides(boardRef.current, pieceRef.current, 0, distance + 1)) {
            distance++;
        }
        if (distance) {
            pieceRef.current = {
                ...pieceRef.current,
                y: pieceRef.current.y + distance,
            };
            setPiece(pieceRef.current);
        }
        land();
    }, [land]);

    const spin = useCallback(() => {
        setPiece((current) => {
            const turned = rotate(current.shape);
            // Wall kicks: straight, then one and two cells either way.
            for (const dx of [0, -1, 1, -2, 2]) {
                if (!collides(boardRef.current, current, dx, 0, turned)) {
                    return { ...current, shape: turned, x: current.x + dx };
                }
            }
            return current;
        });
    }, []);

    // Gravity. Speeds up a little every ten lines, to a floor.
    useEffect(() => {
        if (!running || over) return;
        const speed = Math.max(120, 600 - (level - 1) * 55);
        const id = window.setInterval(drop, speed);
        return () => window.clearInterval(id);
    }, [running, over, level, drop]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (over) {
                if (e.key === ' ') {
                    e.preventDefault();
                    reset();
                }
                return;
            }
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                    e.preventDefault();
                    move(-1);
                    break;
                case 'ArrowRight':
                case 'd':
                    e.preventDefault();
                    move(1);
                    break;
                case 'ArrowDown':
                case 's':
                    e.preventDefault();
                    drop();
                    break;
                case 'ArrowUp':
                case 'w':
                    e.preventDefault();
                    spin();
                    break;
                case ' ':
                    e.preventDefault();
                    running ? slam() : setRunning(true);
                    break;
                case 'p':
                    setRunning((r) => !r);
                    break;
                default:
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [move, drop, spin, slam, running, over, reset]);

    // What to draw: the settled board with the falling piece painted over it.
    const view = board.map((row) => [...row]);
    if (!over) {
        piece.shape.forEach((row, y) =>
            row.forEach((filled, x) => {
                if (!filled) return;
                const by = piece.y + y;
                const bx = piece.x + x;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                    view[by][bx] = piece.colour;
                }
            })
        );
    }

    return (
        <Window
            top={80}
            left={200}
            width={COLS * CELL + 116}
            height={ROWS * CELL + 102}
            windowTitle="Tetris"
            windowBarIcon="tetrisIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={
                over ? `Game over — ${score}` : `Score ${score} · Level ${level}`
            }
        >
            <div style={styles.container}>
                <div style={styles.playArea}>
                    <div
                        style={Object.assign({}, styles.board, {
                            width: COLS * CELL,
                            height: ROWS * CELL,
                        })}
                    >
                        {view.map((row, y) =>
                            row.map((colour, x) =>
                                colour ? (
                                    <div
                                        key={`${x}-${y}`}
                                        style={Object.assign({}, styles.block, {
                                            left: x * CELL,
                                            top: y * CELL,
                                            background: colour,
                                        })}
                                    />
                                ) : null
                            )
                        )}
                        {(over || !running) && (
                            <div style={styles.overlay}>
                                <p style={styles.overlayTitle}>
                                    {over ? 'Game Over' : 'Tetris'}
                                </p>
                                <p style={styles.overlayText}>
                                    {over
                                        ? `You scored ${score}.`
                                        : 'Arrows to move, up to rotate, space to drop.'}
                                </p>
                                <button
                                    style={styles.button}
                                    onClick={() => {
                                        playClick();
                                        over ? reset() : setRunning(true);
                                    }}
                                >
                                    {over ? 'Play Again' : 'Start'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={styles.side}>
                        <p style={styles.sideLabel}>Next</p>
                        <div style={styles.preview}>
                            {next.shape.map((row, y) => (
                                <div key={y} style={styles.previewRow}>
                                    {row.map((filled, x) => (
                                        <div
                                            key={x}
                                            style={Object.assign(
                                                {},
                                                styles.previewCell,
                                                {
                                                    background: filled
                                                        ? next.colour
                                                        : 'transparent',
                                                }
                                            )}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <p style={styles.sideLabel}>Score</p>
                        <p style={styles.sideValue}>{score}</p>
                        <p style={styles.sideLabel}>Lines</p>
                        <p style={styles.sideValue}>{lines}</p>
                        <p style={styles.sideLabel}>Best</p>
                        <p style={styles.sideValue}>{highScore}</p>
                    </div>
                </div>

                <div style={styles.pad}>
                    <button style={styles.padButton} onClick={() => move(-1)}>
                        ◀
                    </button>
                    <button style={styles.padButton} onClick={spin}>
                        ↻
                    </button>
                    <button style={styles.padButton} onClick={drop}>
                        ▼
                    </button>
                    <button style={styles.padButton} onClick={() => move(1)}>
                        ▶
                    </button>
                    <button
                        style={Object.assign({}, styles.padButton, { width: 60 })}
                        onClick={slam}
                    >
                        Drop
                    </button>
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
    playArea: {
        gap: 8,
        flexShrink: 0,
    },
    board: {
        position: 'relative',
        background: '#101010',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        overflow: 'hidden',
        flexShrink: 0,
    },
    block: {
        position: 'absolute',
        width: CELL,
        height: CELL,
        boxSizing: 'border-box',
        border: '1px solid rgba(0,0,0,0.55)',
        // The lit top-left edge every block of this era had.
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.45)',
    },
    side: {
        flexDirection: 'column',
        gap: 2,
        width: 84,
        flexShrink: 0,
    },
    sideLabel: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        marginTop: 4,
    },
    sideValue: {
        fontFamily: 'MSSerif',
        fontSize: 13,
        color: Colors.black,
    },
    preview: {
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0,
        height: 46,
        padding: 4,
        background: '#101010',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    previewRow: {
        flexShrink: 0,
    },
    previewCell: {
        width: 11,
        height: 11,
        boxSizing: 'border-box',
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
        padding: 10,
        background: 'rgba(16, 16, 16, 0.88)',
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
        lineHeight: 1.4,
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
        gap: 3,
        flexShrink: 0,
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

export default Tetris;
