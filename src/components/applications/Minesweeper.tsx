import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

import smiley from '../../assets/icons/ms-smiley-face.png';
import deadFace from '../../assets/icons/ms-dead-face.png';
import mineImg from '../../assets/icons/ms-minesweeper.png';
import flagImg from '../../assets/icons/ms-flag.png';

/**
 * Minesweeper, ported from Yute (Yuteoctober)'s Windows95 Portfolio into this
 * project's Window/inline-style idiom.
 *
 * Rules kept from the original: a 10x10 board, left-click (or tap) to reveal
 * with flood-fill on empty squares, right-click to flag, the face button
 * restarts, and clearing a board bumps a stored "level" so the next game has
 * more mines — up to a cap.
 */

const ROWS = 10;
const COLS = 10;
const LEVEL_KEY = 'minesweeperLevel';
const MAX_LEVEL = 16;
const MAX_MINES = 40;
/**
 * Level 1 starts at the classic Beginner density (10 mines) and climbs by two.
 * The original scaled `level * 2`, which meant a brand-new player's first board
 * had 2 mines on 100 squares — one click flood-filled almost all of it and won
 * the game immediately.
 */
const BASE_MINES = 10;

interface Square {
    isRevealed: boolean;
    isFlagged: boolean;
    hasBomb: boolean;
    neighborBombs: number;
}

/** Classic Minesweeper digit colours. */
const NUMBER_COLORS: { [n: number]: string } = {
    1: '#0000ff',
    2: '#027b00',
    3: '#ff0000',
    4: '#00007b',
    5: '#00007b',
    6: '#00007b',
    7: '#000000',
    8: '#7b7b7b',
};

const minesForLevel = (level: number): number =>
    Math.min(MAX_MINES, BASE_MINES + (Math.max(1, level) - 1) * 2);

const readLevel = (): number => {
    const stored = Number(localStorage.getItem(LEVEL_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
};

const createBoard = (): Square[][] =>
    Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
            isRevealed: false,
            isFlagged: false,
            hasBomb: false,
            neighborBombs: 0,
        }))
    );

const placeMines = (board: Square[][], mines: number): Square[][] => {
    const picked = new Set<number>();
    const total = ROWS * COLS;
    while (picked.size < Math.min(mines, total - 1)) {
        picked.add(Math.floor(Math.random() * total));
    }
    picked.forEach((n) => {
        board[Math.floor(n / COLS)][n % COLS].hasBomb = true;
    });
    return board;
};

const countNeighbours = (board: Square[][]): Square[][] => {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].hasBomb) continue;
            let bombs = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (
                        nr >= 0 &&
                        nr < ROWS &&
                        nc >= 0 &&
                        nc < COLS &&
                        board[nr][nc].hasBomb
                    ) {
                        bombs++;
                    }
                }
            }
            board[r][c].neighborBombs = bombs;
        }
    }
    return board;
};

const newBoard = (mines: number): Square[][] =>
    countNeighbours(placeMines(createBoard(), mines));

/** Three-digit LED readout, like the real counters. */
const pad = (n: number): string => {
    if (n < 0) return `-${Math.min(99, Math.abs(n)).toString().padStart(2, '0')}`;
    return Math.min(999, n).toString().padStart(3, '0');
};

export interface MinesweeperProps extends WindowAppProps {}

const Minesweeper: React.FC<MinesweeperProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [level, setLevel] = useState(readLevel);
    const [mines, setMines] = useState(() => minesForLevel(readLevel()));
    const [board, setBoard] = useState<Square[][]>(() =>
        newBoard(minesForLevel(readLevel()))
    );
    const [flagsLeft, setFlagsLeft] = useState(mines);
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Never leave an interval running behind a closed window.
    useEffect(() => stopTimer, [stopTimer]);

    const startGame = useCallback(
        (mineCount: number) => {
            stopTimer();
            setMines(mineCount);
            setBoard(newBoard(mineCount));
            setFlagsLeft(mineCount);
            setSeconds(0);
            setRunning(false);
            setGameOver(false);
            setWon(false);
        },
        [stopTimer]
    );

    const beginTimer = useCallback(() => {
        if (timerRef.current) return;
        setRunning(true);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }, []);

    const finish = useCallback(
        (didWin: boolean) => {
            stopTimer();
            setGameOver(true);
            setWon(didWin);
            if (!didWin) return;

            // Clearing a board raises the difficulty for the next one.
            const next = Math.min(level + 1, MAX_LEVEL);
            setLevel(next);
            try {
                localStorage.setItem(LEVEL_KEY, String(next));
            } catch {
                /* storage disabled — difficulty just won't persist */
            }
        },
        [level, stopTimer]
    );

    const reveal = (row: number, col: number) => {
        if (gameOver) return;
        const cell = board[row][col];
        if (cell.isRevealed || cell.isFlagged) return;

        if (!running) beginTimer();

        const next = board.map((r) => r.map((s) => ({ ...s })));

        if (next[row][col].hasBomb) {
            next[row][col].isRevealed = true;
            setBoard(next);
            finish(false);
            return;
        }

        // Flood-fill outward from any square with no neighbouring mines.
        const stack = [{ row, col }];
        while (stack.length) {
            const { row: r, col: c } = stack.pop()!;
            const square = next[r][c];
            if (square.isRevealed) continue;
            square.isRevealed = true;
            if (square.neighborBombs !== 0) continue;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (
                        nr >= 0 &&
                        nr < ROWS &&
                        nc >= 0 &&
                        nc < COLS &&
                        !next[nr][nc].hasBomb &&
                        !next[nr][nc].isRevealed
                    ) {
                        stack.push({ row: nr, col: nc });
                    }
                }
            }
        }

        setBoard(next);

        const revealed = next.reduce(
            (sum, r) => sum + r.filter((s) => s.isRevealed).length,
            0
        );
        if (revealed === ROWS * COLS - mines) finish(true);
    };

    const toggleFlag = (e: React.MouseEvent, row: number, col: number) => {
        e.preventDefault();
        if (gameOver || board[row][col].isRevealed) return;
        const next = board.map((r) => r.map((s) => ({ ...s })));
        next[row][col].isFlagged = !next[row][col].isFlagged;
        setFlagsLeft((f) => f + (next[row][col].isFlagged ? -1 : 1));
        setBoard(next);
    };

    const cellContent = (square: Square) => {
        if (gameOver && square.hasBomb) {
            return (
                <img
                    src={won ? flagImg : mineImg}
                    alt={won ? 'flag' : 'mine'}
                    style={styles.cellImage}
                />
            );
        }
        if (square.isFlagged && !square.isRevealed) {
            return <img src={flagImg} alt="flag" style={styles.cellImage} />;
        }
        if (square.isRevealed && square.neighborBombs > 0) {
            return (
                <span
                    style={Object.assign({}, styles.number, {
                        color: NUMBER_COLORS[square.neighborBombs],
                    })}
                >
                    {square.neighborBombs}
                </span>
            );
        }
        return null;
    };

    return (
        <Window
            top={90}
            left={150}
            width={296}
            height={392}
            windowTitle="Minesweeper"
            windowBarIcon="minesweeperIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={`Level ${level} — ${mines} mines`}
        >
            <div style={styles.container}>
                <div style={styles.menuBar}>
                    <span
                        style={styles.menuItem}
                        onClick={() => startGame(minesForLevel(level))}
                    >
                        Game<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Help<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                </div>

                <div style={styles.board}>
                    <div style={styles.statusBar}>
                        <div style={styles.led}>{pad(flagsLeft)}</div>
                        <div
                            style={styles.faceButton}
                            onClick={() => startGame(minesForLevel(level))}
                            title="New game"
                        >
                            <img
                                src={gameOver && !won ? deadFace : smiley}
                                alt="New game"
                                style={styles.face}
                            />
                        </div>
                        <div style={styles.led}>{pad(seconds)}</div>
                    </div>

                    <div style={styles.grid}>
                        {board.map((row, r) => (
                            <div key={r} style={styles.row}>
                                {row.map((square, c) => (
                                    <div
                                        key={c}
                                        style={Object.assign(
                                            {},
                                            styles.cell,
                                            square.isRevealed
                                                ? styles.cellRevealed
                                                : styles.cellHidden,
                                            gameOver &&
                                                square.hasBomb &&
                                                square.isRevealed &&
                                                !won &&
                                                styles.cellExploded
                                        )}
                                        onClick={() => reveal(r, c)}
                                        onContextMenu={(e) =>
                                            toggleFlag(e, r, c)
                                        }
                                    >
                                        {cellContent(square)}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {gameOver && (
                        <p style={styles.result}>
                            {won
                                ? `Cleared in ${seconds}s — next level: ${minesForLevel(
                                      level
                                  )} mines.`
                                : 'Boom. Click the face to try again.'}
                        </p>
                    )}
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    menuBar: {
        display: 'flex',
        gap: 16,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'pointer',
        userSelect: 'none',
    },
    board: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        flex: 1,
        minHeight: 0,
    },
    statusBar: {
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 244,
        padding: 4,
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    led: {
        background: '#000000',
        color: '#ff0000',
        fontFamily: 'monospace',
        fontSize: 16,
        letterSpacing: 1,
        padding: '1px 4px',
        border: `1px solid ${Colors.darkGray}`,
        minWidth: 42,
        textAlign: 'center',
        justifyContent: 'center',
    },
    faceButton: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    face: {
        width: 18,
        height: 18,
        pointerEvents: 'none',
    },
    grid: {
        flexDirection: 'column',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        userSelect: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
    },
    cellHidden: {
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    cellRevealed: {
        background: '#bdbdbd',
        border: `1px solid ${Colors.darkGray}`,
    },
    cellExploded: {
        background: '#ff0000',
    },
    number: {
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: '14px',
    },
    cellImage: {
        width: 16,
        height: 16,
        objectFit: 'contain',
        pointerEvents: 'none',
    },
    result: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textAlign: 'center',
        flexShrink: 0,
    },
};

export default Minesweeper;
