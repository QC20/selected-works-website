import React, { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import WORDS from './Words';
import { Easing } from '../general/Animation';
import Window from '../os/Window';

/**
 * Wordle's actual scoring rule.
 * -----------------------------
 * Green for a letter in the right place, yellow for one that is in the word
 * somewhere else, grey otherwise — with the crucial detail that yellows are
 * drawn from a *pool*. A guess with two of a letter where the answer has one
 * gets one mark, not two, and the exact match always takes priority.
 *
 * What used to be here compared `word.indexOf(letter)` with
 * `guess.indexOf(letter)`, which asks a different question entirely: "does
 * the first occurrence of this letter fall in the same place in both?" Every
 * copy of a letter in a row was then coloured identically, from the position
 * of the first one. Against JONAS, guessing BOOKS painted the O at index 2
 * green — JONAS has an N there — and guessing CLASS painted the genuinely
 * correct S at index 4 yellow. The game was giving actively wrong feedback
 * on 583 of the letter/position pairs in the shipped word list.
 */
export type LetterStatus = 'empty' | 'absent' | 'present' | 'correct';

export function scoreGuess(guess: string, word: string): LetterStatus[] {
    const g = guess.toUpperCase();
    const w = word.toUpperCase();
    const out: LetterStatus[] = g.split('').map(() => 'absent');

    // Pass one: the exact matches, and a tally of what is left over. It has
    // to be a separate pass — a letter later in the guess can only claim a
    // yellow from a position that no green has already spoken for.
    const pool: Record<string, number> = {};
    for (let i = 0; i < g.length; i++) {
        if (i < w.length && g[i] === w[i]) out[i] = 'correct';
        else if (i < w.length) pool[w[i]] = (pool[w[i]] ?? 0) + 1;
    }

    // Pass two: yellows, first come first served out of what the greens left.
    for (let i = 0; i < g.length; i++) {
        if (out[i] === 'correct') continue;
        const c = g[i];
        if ((pool[c] ?? 0) > 0) {
            out[i] = 'present';
            pool[c] -= 1;
        }
    }
    return out;
}

/** Green beats yellow beats grey, for the keyboard's running tint. */
const STATUS_RANK: Record<LetterStatus, number> = {
    empty: 0,
    absent: 1,
    present: 2,
    correct: 3,
};

export interface KeyboardLetterProps {
    letter: string;
    word: string;
    guesses: string[];
    currentGuess: string;
    setGuesses: React.Dispatch<React.SetStateAction<string[]>>;
    setCurrentGuess: React.Dispatch<React.SetStateAction<string>>;
}

const KeyboardLetter: React.FC<KeyboardLetterProps> = ({
    letter,
    guesses,
    word,
    currentGuess,
    setGuesses,
    setCurrentGuess,
}) => {
    /**
     * The best this key has ever scored, across every guess so far — so a
     * letter that came up yellow and later green stays green. Derived rather
     * than accumulated in three booleans: the old version could only ever go
     * one way, which meant "New game" left the keyboard coloured in.
     */
    const status = useMemo<LetterStatus>(() => {
        let best: LetterStatus = 'empty';
        guesses.forEach((guess) => {
            const marks = scoreGuess(guess, word);
            guess.toUpperCase()
                .split('')
                .forEach((ch, i) => {
                    if (ch !== letter.toUpperCase()) return;
                    if (STATUS_RANK[marks[i]] > STATUS_RANK[best]) {
                        best = marks[i];
                    }
                });
        });
        return best;
    }, [guesses, letter, word]);

    const isInWord = status === 'present';
    const isInPlace = status === 'correct';
    const notInWord = status === 'absent';

    const handleClick = () => {
        if (letter === 'RET') {
            if (currentGuess.length === word.length) {
                if (WORDS.includes(currentGuess.toLowerCase())) {
                    setGuesses([...guesses, currentGuess]);
                    setCurrentGuess('');
                }
            }
        } else if (letter === 'DEL') {
            setCurrentGuess(currentGuess.slice(0, -1));
        } else if (currentGuess.length < word.length) {
            setCurrentGuess(currentGuess + letter.toUpperCase());
        }
    };

    return (
        <div
            onMouseDown={handleClick}
            className="site-button"
            style={Object.assign(
                {},
                styles.letterBox,
                isInWord && { backgroundColor: 'yellow' },
                isInPlace && { backgroundColor: 'lightgreen' },
                notInWord && { backgroundColor: 'gray' }
            )}
        >
            <p>{letter}</p>
        </div>
    );
};

export interface GuessLetterProps {
    letter: string;
    /** Worked out once per row by `scoreGuess`, not per tile. */
    status: LetterStatus;
    guessed: boolean;
}

/**
 * One tile. Deliberately has no idea what the answer is — the whole row is
 * scored in one pass by its parent, because Wordle's yellow rule is about
 * the row as a whole and cannot be decided a letter at a time.
 */
const GuessLetter: React.FC<GuessLetterProps> = ({
    guessed,
    letter,
    status,
}) => {
    const isInWord = guessed && status === 'present';
    const isInPlace = guessed && status === 'correct';

    return (
        <div
            className="button-border"
            style={Object.assign(
                {},
                styles.guessLetterBox,
                isInWord && { backgroundColor: 'yellow' },
                isInPlace && { backgroundColor: 'lightgreen' },
                !guessed && { backgroundColor: 'white' },
                letter === ' ' && styles.emptyBox
            )}
        >
            <h3>
                <b>{letter.toUpperCase()}</b>
            </h3>
        </div>
    );
};

export interface GuessWordProps {
    guess: string;
    guesses: string[];
    word: string;
    active: boolean;
    noClear?: boolean;
}

const GuessWord: React.FC<GuessWordProps> = ({
    guess,
    guesses,
    word,
    active,
    noClear,
}) => {
    const [savedGuess, setSavedGuess] = useState(guess);
    const controls = useAnimation();

    useEffect(() => {
        if (active) {
            setSavedGuess(guess);
            if (
                guess.length === word.length &&
                !WORDS.includes(guess.toLowerCase())
            ) {
                controls
                    .start({
                        backgroundColor: '#f00',
                        x: 2,
                        transition: {
                            duration: 0.1,
                        },
                    })
                    .then(() => {
                        controls
                            .start({
                                x: -4,
                                backgroundColor: '#fff',
                                transition: {
                                    duration: 0.1,
                                },
                            })
                            .then(() => {
                                controls.start({
                                    x: 0,
                                    backgroundColor: '#fff',
                                    transition: {
                                        duration: 0.09,
                                    },
                                });
                            });
                    });
            }
        }
    }, [guess, active, word, controls]);

    useEffect(() => {
        if (guesses.length === 0 && !noClear) setSavedGuess('');
    }, [guesses, noClear]);

    // Scored once for the whole row — see `scoreGuess`. An unsubmitted row
    // has no marks at all, which is what `guessed` gates on below.
    const marks = useMemo(
        () => (active ? [] : scoreGuess(savedGuess, word)),
        [active, savedGuess, word]
    );

    return (
        <motion.div animate={controls} style={styles.guessWordRow}>
            {savedGuess.split('').map((letter, index) => (
                <GuessLetter
                    guessed={!active}
                    key={index}
                    letter={letter}
                    status={marks[index] ?? 'empty'}
                />
            ))}
            {[...Array(Math.max(0, word.length - savedGuess.length))].map(
                (e, i) => (
                    <GuessLetter
                        guessed={!active}
                        key={`pad-${i}`}
                        letter={' '}
                        status="empty"
                    />
                )
            )}
        </motion.div>
    );
};

export interface JonordleProps extends WindowAppProps {}

const TOP_ROW = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const MIDDLE_ROW = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const BOTTOM_ROW = ['RET', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'];
const ROWS = [TOP_ROW, MIDDLE_ROW, BOTTOM_ROW];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const Jonordle: React.FC<JonordleProps> = ({ onInteract, onClose, onMinimize }) => {
    const word = 'JONAS';
    const [guesses, setGuesses] = useState<string[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [currentGuess, setCurrentGuess] = useState('');

    const restart = () => {
        setGuesses([]);
        setGameOver(false);
        setTimeout(() => {
            setWon(false);
        }, 500);
        setCurrentGuess('');
    };

    // listen to keyboard events
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Backspace') {
                setCurrentGuess(currentGuess.slice(0, -1));
            } else if (event.key === 'Enter') {
                if (currentGuess.length === word.length) {
                    if (WORDS.includes(currentGuess.toLowerCase())) {
                        setGuesses([...guesses, currentGuess]);
                        setCurrentGuess('');
                    }
                }
            } else if (
                event.key.length === 1 &&
                ALPHABET.includes(event.key.toUpperCase())
            ) {
                if (currentGuess.length < word.length) {
                    setCurrentGuess(currentGuess + event.key.toUpperCase());
                }
            }
        };
        // add listener
        window.addEventListener('keydown', handleKeyDown);
        // cleanup listener
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [guesses, currentGuess]);

    useEffect(() => {
        if (guesses.length === 6) {
            setGameOver(true);
        }
        guesses.forEach((guess) => {
            if (guess === word) {
                setGameOver(true);
                setWon(true);
            }
        });
    }, [guesses]);

    return (
        <Window
            top={48}
            left={140}
            width={420}
            height={620}
            windowTitle="Jonordle"
            windowBarIcon="scrabbleIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="One word. Six tries. It is the same word every day."
        >
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>Jonordle</h2>
                <p>Wordle, but the answer never changes.</p>
            </div>
            <motion.div
                variants={gameOverAnimations}
                animate={gameOver ? 'show' : 'hidden'}
                initial={false}
                style={Object.assign(
                    {},
                    styles.gameOverContainer,
                    gameOver && { zIndex: 1000 }
                )}
            >
                <h2>{won ? 'You win!' : 'Game Over'}</h2>
                <p>Thanks for playing! Remember: the word is always "JONAS".</p>
                <br />
                <GuessWord
                    key={'winning-guess'}
                    guess={word}
                    word={word}
                    guesses={guesses}
                    active={false}
                    noClear={true}
                />
                <br />
                <div className="site-button" onMouseDown={restart}>
                    Restart Game
                </div>
            </motion.div>
            <motion.div
                variants={gameAnimations}
                animate={!gameOver ? 'show' : 'hidden'}
                initial={false}
                style={styles.gameContainer}
            >
                <div style={styles.playArea}>
                    {[...Array(6)].map((e, i) => (
                        <GuessWord
                            key={i}
                            guess={currentGuess}
                            word={word}
                            guesses={guesses}
                            active={i === guesses.length}
                        />
                    ))}
                </div>
                <div style={styles.keyboardContainer}>
                    {ROWS.map((row) => (
                        <div style={styles.keyboardRow} key={`row-${row[0]}`}>
                            {row.map((letter) => (
                                <KeyboardLetter
                                    key={letter}
                                    word={word}
                                    setGuesses={setGuesses}
                                    guesses={guesses}
                                    letter={letter}
                                    currentGuess={currentGuess}
                                    setCurrentGuess={setCurrentGuess}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
        </Window>
    );
};

const gameAnimations = {
    hidden: {
        opacity: 0,
        y: -12,
        transition: {
            duration: 0.5,
        },
    },
    show: {
        y: 0,
        opacity: 1,
        transition: {
            delay: 0.5,
            duration: 0.5,
        },
    },
};

const gameOverAnimations = {
    hidden: {
        opacity: 0,
        y: 32,
        transition: {
            duration: 0.5,
        },
    },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            delay: 0.4,
            duration: 0.5,
            ease: Easing.expOut,
        },
    },
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        overflowY: 'auto',
        position: 'relative',
        background: '#fff',
    },
    gameContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    gameOverContainer: {
        zIndex: -1000,
        textAlign: 'center',
        width: '100%',
        height: '100%',
        position: 'absolute',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    header: {
        flexShrink: 1,
        paddingTop: 32,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardContainer: {
        flexShrink: 1,

        paddingBottom: 24,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playArea: {
        flex: 1,
        flexDirection: 'column',

        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    letterBox: {
        padding: 12,
        paddingTop: 16,
        minWidth: 42,

        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 16,
        margin: 4,
    },
    keyboardRow: {},
    guessLetterBox: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',

        margin: 4,
    },
    guessWordRow: {},
    emptyBox: {
        border: '2px solid gray',
        backgroundColor: 'white',
        boxShadow: 'none',
    },
};

export default Jonordle;
