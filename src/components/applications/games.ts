import { IconName } from '../../assets/icons';

/**
 * Every game on this machine, in one list.
 *
 * Three places show games — the Start menu's Games fly-out, My Computer >
 * Hard Disk (C:) > Games, and the desktop for the few that have icons — and
 * before this they each had their own hand-written list, which is exactly the
 * arrangement that ends with a game appearing in one and not the others.
 *
 * `key` is the APPLICATIONS key in `Desktop.tsx`, so everything here opens the
 * same way it would from anywhere else on the desktop.
 */

export interface Game {
    key: string;
    name: string;
    icon: IconName;
    /** Rough size in KB, for the folder's status bar. Cosmetic. */
    size: number;
    /** One line, in the register of the back of a shareware box. */
    blurb: string;
}

export const GAMES: Game[] = [
    {
        key: 'doom',
        name: 'Doom',
        icon: 'doomIcon',
        size: 12_000,
        blurb: "id Software's 1993 shooter, running in the browser.",
    },
    {
        key: 'jonordle',
        name: 'Jonordle',
        icon: 'scrabbleIcon',
        size: 96,
        blurb: 'Wordle with one answer, and it is not going to change.',
    },
    {
        key: 'minesweeper',
        name: 'Minesweeper',
        icon: 'minesweeperIcon',
        size: 120,
        blurb: 'Clear the board without standing on a mine.',
    },
    {
        key: 'trail',
        name: 'The Oregon Trail',
        icon: 'trailIcon',
        size: 8400,
        blurb: 'Ford the river. Lose an ox. Die of dysentery.',
    },
    {
        key: 'pinball',
        name: 'Pinball',
        icon: 'pinballIcon',
        size: 6700,
        blurb: 'Space Cadet, the table that shipped with the machine.',
    },
    {
        key: 'scrabble',
        name: 'Scrabble',
        icon: 'scrabbleIcon',
        size: 3200,
        blurb: 'Word game for one, against a dictionary that does not lose.',
    },
    {
        key: 'snake',
        name: 'Snake',
        icon: 'snakeIcon',
        size: 48,
        blurb: 'Eat, grow, and try not to meet yourself coming back.',
    },
    {
        key: 'solitaire',
        name: 'Solitaire',
        icon: 'solitaireIcon',
        size: 612,
        blurb: 'The reason a generation learned to use a mouse.',
    },
    {
        key: 'tetris',
        name: 'Tetris',
        icon: 'tetrisIcon',
        size: 64,
        blurb: 'Seven shapes, falling, forever.',
    },
];

export const gameByKey = (key: string): Game | undefined =>
    GAMES.find((g) => g.key === key);

export const isGame = (key: string): boolean => GAMES.some((g) => g.key === key);
