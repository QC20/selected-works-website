/**
 * What Patch Notes shows.
 *
 * Newest first. Each entry is one area of the desktop and the dates are the real
 * ones from the project's history, so this reads as a change log rather than
 * decoration. Add to the top when you ship something.
 *
 * Modelled on `patchNotes.js` in Yute's Windows95 Portfolio, which is where the
 * idea of shipping the change log as an app in the Utility folder comes from.
 */

export interface PatchNote {
    /** The area of the desktop this batch of work touched. */
    head: string;
    /** ISO date, shown as-is. */
    date: string;
    /** One or two sentences on why this got built, not just what shipped. */
    why?: string;
    notes: string[];
}

const patchNotes: PatchNote[] = [
    {
        head: 'Internet Explorer',
        date: '2026-07-30',
        why: "Every site used to open in its own bare iframe, no chrome, no way back. One real browser window with actual history means following a link never strands you outside the desktop.",
        notes: [
            'Every site on the desktop now opens in one Internet Explorer window instead of a plain frame',
            'Added Back and Forward, working from a real history stack',
            'Added Stop, which cancels the load and shows the "Action canceled" page',
            'Added Refresh and Home',
            'The address bar is editable — type a URL or a search and press Enter',
            'Added a Favorites drop-down listing every site on this desktop',
        ],
    },
    {
        head: 'Utility',
        date: '2026-07-30',
        why: 'Task Manager, Patch Notes and Reset Storage needed a home that wasn\'t the desktop itself — Windows 95\'s own Utility folder, under Hard Disk (D:), was the obvious slot.',
        notes: [
            'Added Task Manager to Hard Disk (D:) > Utility',
            'Added Patch Notes to Hard Disk (D:) > Utility',
            'Added Reset Storage to Hard Disk (D:) > Utility',
        ],
    },
    {
        head: 'Start Menu',
        date: '2026-07-30',
        why: 'LinkedIn was already one of the contact icons on the Contact page — worth surfacing from Start too, the same way a resume link is.',
        notes: ['Added LinkedIn under Start > Resume'],
    },
    {
        head: 'Notepad',
        date: '2026-07-29',
        why: 'A silent "Untitled.txt" download the moment you clicked Save didn\'t feel like Notepad. Asking for a name, and keeping the file in My Documents so it\'s still there next visit, does.',
        notes: [
            'Save As now asks for a file name instead of silently downloading Untitled.txt',
            'Files can be saved to My Documents on the C: drive, and opened again later',
            'Files can also be downloaded to your own computer',
        ],
    },
    {
        head: 'MSN Messenger',
        date: '2026-07-29',
        why: 'The guestbook was already dressed as MSN Messenger. The nudge — and its sound — is the one detail of that client almost everyone who used it in 2003 still remembers.',
        notes: [
            'Added the nudge button, with its sound',
            'Reworked the chat window toolbar',
        ],
    },
    {
        head: 'Programs',
        date: '2026-07-29',
        why: "Windows 95 apps didn't only live on the desktop — the Programs folder, Start menu and Hard Disk (C:) are how a real install actually organised them, so games and utilities are reachable the same three ways here.",
        notes: [
            'Added the Programs folder, with Paint, Notepad, Solitaire, Pinball and the rest',
            'Programs are reachable from the desktop, the Start menu, Hard Disk (C:) and Run',
        ],
    },
    {
        head: 'My Computer',
        date: '2026-07-29',
        why: 'A flat window listing every drive read as a shortcut list, not a computer. Back, Up one level and a real address bar make it browsable the way My Computer actually was.',
        notes: [
            'My Computer now browses a filesystem in one window: Back, Up one level and an address drop-down',
            'Added Hard Disk (C:), Hard Disk (D:) and CD-ROM',
            'Added the Pictures folder, which opens photos in the picture viewer',
        ],
    },
    {
        head: 'Desktop',
        date: '2026-07-28',
        why: 'Icons snapping back to the same grid on every reload broke the one thing that was supposed to sell the idea: that this is your desktop, not a screenshot of one. Remembering where you dragged things, and a right-click menu, are what make it feel owned rather than borrowed.',
        notes: [
            'Icons can be dragged, and their positions are remembered',
            'Added the right-click context menu, including New Folder',
            'Files can be dragged into the Recycle Bin, and restored from it',
        ],
    },
    {
        head: '3D Experience',
        date: '2026-07-26',
        why: "Wanted one moment where the site's own bit — 'this is all a simulation' — actually pays off, rather than staying a joke in the copy. The desktop receding into a CRT in a real room is that moment, built on Henry Heffernan's original 3D room (credited in Credits).",
        notes: [
            'Added Step Outside — the desktop recedes into a CRT monitor in a 3D room',
            'Added camera controls to the 3D scene',
        ],
    },
    {
        head: 'Showcase',
        date: '2026-07-22',
        why: 'The papers section and the experience timeline were the oldest, least-touched parts of the site — overdue for the same care the rest of the desktop was getting.',
        notes: [
            'Reworked the papers and publications section',
            'Updated the experience timeline',
        ],
    },
];

export default patchNotes;
