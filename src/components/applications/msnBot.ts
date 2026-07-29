/**
 * The MSN bot.
 *
 * Yute's Windows95 Portfolio runs its bot on the chat server, so its replies go
 * out to everyone in the room. This guestbook is a REST table with no server to
 * put a bot on, so this one answers in your browser only — which is why its
 * replies aren't posted back to the guestbook. Switching "Bot Offline" to "Bot
 * Online" in the toolbar turns it on.
 *
 * Keyword matching, first rule that hits wins, so put the specific patterns
 * above the general ones.
 */

interface Rule {
    test: RegExp;
    replies: string[];
}

const RULES: Rule[] = [
    {
        test: /\b(hi|hello|hey|yo|hiya|howdy|hej|halloj)\b/i,
        // {name} is filled in with the sender, or dropped if they're Anonymous.
        replies: [
            'Hey{name}! 👋 Ask me about Jonas, this desktop, or just say something.',
            'Hello{name}. Type "help" if you want to know what I can answer.',
        ],
    },
    {
        test: /\bhelp\b|what can you|commands?/i,
        replies: [
            'Try asking about: jonas, work, projects, contact, cv, this site, the programs, or games.',
        ],
    },
    {
        test: /\b(who|about).*(jonas|you)\b|\bjonas\b/i,
        replies: [
            'Jonas Kjeldmand Jensen — academic, usability engineer and tinkerer. The About icon on the desktop has the long version.',
        ],
    },
    {
        test: /\b(work|job|hire|hiring|experience|role)\b/i,
        replies: [
            'Open My Showcase on the desktop — it has the experience, papers and projects in one window.',
        ],
    },
    {
        test: /\b(project|portfolio|showcase|built|made)\b/i,
        replies: [
            'Start → Projects has the live ones: Pin Portrait, Emoji Heatmap and Scroll. They open right here in a browser window.',
        ],
    },
    {
        test: /\b(contact|email|mail|reach|message)\b/i,
        replies: [
            'The Mail icon on the desktop opens a contact form. Or leave it here — this is a guestbook, after all.',
        ],
    },
    {
        test: /\b(cv|resume|résumé)\b/i,
        replies: [
            'Start → Resume → Resume File. You can read it in the window or download the PDF.',
        ],
    },
    {
        test: /\b(github|code|repo|source)\b/i,
        replies: [
            'The GitHub icon opens the repositories in a window; its maximize button takes you to the real site.',
        ],
    },
    {
        test: /\b(game|games|play|doom|minesweeper|solitaire|pinball)\b/i,
        replies: [
            'Doom, The Oregon Trail and Scrabble sit on the desktop. Pinball, Solitaire and Minesweeper are in the Programs folder.',
        ],
    },
    {
        test: /\b(program|programs|paint|notepad|winamp|calculator|dos)\b/i,
        replies: [
            'Open the Programs folder — Paint, Notepad, Winamp, Calculator, MS-DOS Prompt and the rest are all in there and all real.',
        ],
    },
    {
        test: /\b(site|website|desktop|windows|95|98|how.*(made|built))\b/i,
        replies: [
            'It is a React desktop. The programs in the Programs folder come from 98.js; the rest is built for this site.',
        ],
    },
    {
        test: /\b(nudge|buzz|shake)\b/i,
        replies: ['Press the yellow face in the toolbar. Go on.'],
    },
    {
        test: /\b(bye|goodbye|later|cya|see ya|farvel)\b/i,
        replies: ['See you around. Leave a message before you go 🙂'],
    },
    {
        test: /\b(thanks|thank you|ta|tak)\b/i,
        replies: ["Any time. That's what I'm here for."],
    },
    {
        test: /\?\s*$/,
        replies: [
            "Good question — I only know this desktop, honestly. Try 'help' for what I can answer.",
        ],
    },
];

const FALLBACKS = [
    "Noted. Have a poke around the desktop — there's more in the Programs folder than it looks.",
    "I'm a very small bot, so that one's beyond me. Ask about Jonas, the projects, or the programs.",
    'Got it. Your message is in the guestbook for real, by the way — I just talk back.',
];

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

/** Picks a reply for `text`. `name` is the sender, used to address them back. */
export function botReply(text: string, name: string): string {
    const who = name.trim() && name.trim() !== 'Anonymous' ? ` ${name.trim()}` : '';

    for (const rule of RULES) {
        if (rule.test.test(text)) {
            return pick(rule.replies).replace('{name}', who);
        }
    }
    return pick(FALLBACKS).replace('{name}', who);
}
