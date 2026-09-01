/**
 * Markdown, rendered the way this desktop renders everything else.
 * ----------------------------------------------------------------
 * Written rather than installed, for the same reason the rest of this project
 * vendors what it needs: a markdown library would arrive with its own type
 * system, its own opinions about sanitisation, and a stylesheet built for a
 * 2024 web page — and then every one of those opinions would have to be
 * overridden to make it look like Windows 95. This is a few hundred lines that
 * already look right.
 *
 * It is deliberately not a general-purpose markdown engine. It covers what
 * Obsidian notes are actually made of, which includes four things CommonMark
 * has never heard of:
 *
 *   [[Wiki links]]        — resolved by note *name*, not path
 *   ![[Embeds]]           — an image, or a transclusion we show as a link
 *   > [!note] Callouts    — a blockquote with a type
 *   ---frontmatter---     — YAML at the top, shown as properties
 *
 * On safety: this returns React elements, never `dangerouslySetInnerHTML`, so
 * a note's text cannot become markup. That matters more than usual here —
 * these notes come from outside the bundle, over the network, and the whole
 * point of the window is to display someone's writing verbatim.
 */

import React from 'react';
import Colors from '../../constants/colors';

/** How the renderer reaches back into the vault it is being shown inside. */
export interface MarkdownContext {
    /** A `[[link]]` was clicked. The target is raw, unresolved. */
    onWikiLink: (target: string) => void;
    /** An ordinary http(s) link was clicked. */
    onExternal: (url: string) => void;
    /**
     * A path inside the vault to a real URL, for `![[image.png]]`. Returning
     * null renders the embed as a link instead of a broken picture.
     */
    resolveAsset: (path: string) => string | null;
}

/* ---- frontmatter ---------------------------------------------------- */

export interface Frontmatter {
    [key: string]: string;
}

/**
 * Splits `---\nkey: value\n---\n` off the top of a note.
 *
 * Parsed by hand rather than with a YAML library because Obsidian frontmatter
 * in practice is flat key/value plus the occasional list, and the *only* thing
 * this does with it is print it in a properties strip. A real YAML parser here
 * would be a dependency earning nothing.
 */
export function splitFrontmatter(text: string): {
    frontmatter: Frontmatter;
    body: string;
} {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { frontmatter: {}, body: text };

    const frontmatter: Frontmatter = {};
    let key = '';
    match[1].split(/\r?\n/).forEach((line) => {
        const pair = line.match(/^([A-Za-z0-9_ -]+):\s*(.*)$/);
        if (pair) {
            key = pair[1].trim();
            frontmatter[key] = pair[2].trim();
        } else if (key && /^\s*-\s+/.test(line)) {
            // A YAML list continues the key above it: "tags:\n  - one\n  - two"
            const value = line.replace(/^\s*-\s+/, '').trim();
            frontmatter[key] = frontmatter[key]
                ? `${frontmatter[key]}, ${value}`
                : value;
        }
    });

    // Empty keys are noise from a template nobody filled in.
    Object.keys(frontmatter).forEach((k) => {
        if (!frontmatter[k]) delete frontmatter[k];
    });

    return { frontmatter, body: text.slice(match[0].length) };
}

/* ---- cleaning ------------------------------------------------------- */

/**
 * The two things in a real vault that are not meant to be read.
 *
 * `%%like this%%` is an Obsidian comment — the author's note to themselves,
 * invisible in Obsidian and so almost always something they would not choose
 * to publish as prose. And markdown permits raw HTML, which vaults use for
 * footers and layout; rendering the tags as text is worse than either
 * honouring them (which would mean injecting untrusted markup) or dropping
 * them. So the tags go and the words inside them stay.
 *
 * Both are skipped inside fenced code, where a `<div>` is the subject rather
 * than the formatting — which is why this walks lines instead of running two
 * regexes over the whole document.
 */
export function stripNonProse(body: string): string {
    let fenced = false;
    return body
        .split('\n')
        .map((line) => {
            if (/^\s*```/.test(line)) {
                fenced = !fenced;
                return line;
            }
            if (fenced) return line;
            return line
                .replace(/%%[\s\S]*?%%/g, '')
                .replace(/<\/?[A-Za-z][^>]*>/g, '');
        })
        .join('\n');
}

/**
 * A note usually opens with an H1 repeating its own filename, because that is
 * what every Obsidian template does. The window already shows the name in its
 * own heading, so printing it twice is just noise.
 */
export function dropTitleHeading(body: string, title: string): string {
    const match = body.match(/^\s*#\s+(.+?)\s*$/m);
    if (!match || match.index === undefined) return body;
    // Only if it is genuinely the *first* thing — an H1 further down is a
    // section of the note, not its title.
    if (body.slice(0, match.index).trim()) return body;
    if (match[1].trim().toLowerCase() !== title.trim().toLowerCase()) return body;
    return body.slice(match.index + match[0].length);
}

/* ---- inline --------------------------------------------------------- */

/**
 * One pass over a line of text, in precedence order.
 *
 * The order of these alternatives is the grammar: `![[` has to be tried before
 * `[[`, and both before `[`, or the shorter pattern eats the longer one's
 * opening bracket and everything after it renders as literal text.
 */
const INLINE = new RegExp(
    [
        '!\\[\\[([^\\]]+)\\]\\]', // 1: ![[embed]]
        '\\[\\[([^\\]]+)\\]\\]', // 2: [[wiki link]]
        '!\\[([^\\]]*)\\]\\(([^)]+)\\)', // 3,4: ![alt](src)
        '\\[([^\\]]+)\\]\\(([^)]+)\\)', // 5,6: [text](href)
        '`([^`]+)`', // 7: `code`
        '\\*\\*([^*]+)\\*\\*', // 8: **bold**
        '__([^_]+)__', // 9: __bold__
        '\\*([^*\\n]+)\\*', // 10: *italic*
        '==([^=]+)==', // 11: ==highlight==
        '~~([^~]+)~~', // 12: ~~strike~~
        '(https?://[^\\s<>)\\]]+)', // 13: a bare URL
    ].join('|'),
    'g'
);

/** The label a wiki link shows: the alias after `|`, else the target. */
const wikiLabel = (target: string): string => {
    const alias = target.split('|');
    if (alias.length > 1) return alias.slice(1).join('|').trim();
    // `[[Note#Heading]]` reads better as "Note > Heading" than as raw text.
    return target.replace('#', ' › ').trim();
};

export function renderInline(
    text: string,
    ctx: MarkdownContext,
    keyPrefix: string
): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    let last = 0;
    let n = 0;
    INLINE.lastIndex = 0;

    let m: RegExpExecArray | null;
    while ((m = INLINE.exec(text)) !== null) {
        if (m.index > last) out.push(text.slice(last, m.index));
        last = m.index + m[0].length;
        const key = `${keyPrefix}-i${n++}`;

        if (m[1] !== undefined) {
            // ![[embed]] — an image if we can find it, a link to it if not.
            const path = m[1].split('|')[0].trim();
            const src = ctx.resolveAsset(path);
            out.push(
                src ? (
                    <img key={key} src={src} alt={path} style={inline.image} />
                ) : (
                    <button
                        key={key}
                        style={inline.link}
                        onClick={() => ctx.onWikiLink(path)}
                    >
                        {wikiLabel(m![1])}
                    </button>
                )
            );
        } else if (m[2] !== undefined) {
            const target = m[2];
            out.push(
                <button
                    key={key}
                    style={inline.link}
                    onClick={() => ctx.onWikiLink(target)}
                >
                    {wikiLabel(target)}
                </button>
            );
        } else if (m[4] !== undefined) {
            const src = /^https?:/.test(m[4]) ? m[4] : ctx.resolveAsset(m[4]);
            out.push(
                src ? (
                    <img key={key} src={src} alt={m[3]} style={inline.image} />
                ) : (
                    <span key={key} style={inline.muted}>
                        [{m[3] || 'image'}]
                    </span>
                )
            );
        } else if (m[5] !== undefined) {
            const href = m[6];
            const external = /^https?:/.test(href);
            out.push(
                <button
                    key={key}
                    style={inline.link}
                    onClick={() =>
                        external ? ctx.onExternal(href) : ctx.onWikiLink(href)
                    }
                >
                    {m![5]}
                </button>
            );
        } else if (m[7] !== undefined) {
            out.push(
                <code key={key} style={inline.code}>
                    {m[7]}
                </code>
            );
        } else if (m[8] !== undefined || m[9] !== undefined) {
            out.push(<strong key={key}>{m[8] ?? m[9]}</strong>);
        } else if (m[10] !== undefined) {
            out.push(<em key={key}>{m[10]}</em>);
        } else if (m[11] !== undefined) {
            out.push(
                <mark key={key} style={inline.highlight}>
                    {m[11]}
                </mark>
            );
        } else if (m[12] !== undefined) {
            out.push(
                <span key={key} style={inline.strike}>
                    {m[12]}
                </span>
            );
        } else if (m[13] !== undefined) {
            const href = m[13];
            out.push(
                <button
                    key={key}
                    style={inline.link}
                    onClick={() => ctx.onExternal(href)}
                >
                    {href}
                </button>
            );
        }
    }

    if (last < text.length) out.push(text.slice(last));
    return out;
}

/* ---- blocks --------------------------------------------------------- */

/** `> [!warning] Be careful` — Obsidian's callouts. */
const CALLOUT = /^\[!([A-Za-z]+)\]([+-])?\s*(.*)$/;

/** Callout accent colours. Anything unlisted gets the default blue. */
const CALLOUT_COLORS: Record<string, string> = {
    note: '#0000a3',
    info: '#0000a3',
    tip: '#008000',
    success: '#008000',
    question: '#8a6d00',
    warning: '#8a6d00',
    caution: '#8a6d00',
    danger: '#a30000',
    error: '#a30000',
    quote: '#5a5a5a',
    example: '#5a2a8a',
    abstract: '#3e9697',
    summary: '#3e9697',
};

/**
 * Line-by-line, because that is how markdown blocks actually work: a fence
 * runs until it closes, a list runs until a line isn't a list item, and a
 * paragraph runs until a blank line. Anything cleverer would be a parser, and
 * a parser is not what a notes window needs.
 */
export function renderMarkdown(
    body: string,
    ctx: MarkdownContext
): React.ReactNode[] {
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const out: React.ReactNode[] = [];
    let i = 0;
    let n = 0;

    while (i < lines.length) {
        const line = lines[i];
        const key = `b${n++}`;

        // Fenced code — taken verbatim, including any markdown inside it.
        const fence = line.match(/^\s*```+\s*(\S*)/);
        if (fence) {
            const buf: string[] = [];
            i++;
            while (i < lines.length && !/^\s*```/.test(lines[i])) {
                buf.push(lines[i++]);
            }
            i++; // the closing fence
            out.push(
                <pre key={key} style={block.pre}>
                    {fence[1] ? (
                        <span style={block.lang}>{fence[1]}</span>
                    ) : null}
                    {buf.join('\n')}
                </pre>
            );
            continue;
        }

        if (!line.trim()) {
            i++;
            continue;
        }

        // Horizontal rule, drawn as the groove Windows would have used.
        if (/^\s*(\*\s*\*\s*\*|-\s*-\s*-|_\s*_\s*_)[\s*\-_]*$/.test(line)) {
            out.push(<div key={key} style={block.rule} />);
            i++;
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            out.push(
                <p
                    key={key}
                    style={{
                        ...block.heading,
                        fontSize: Math.max(12, 20 - level * 2),
                        marginTop: level === 1 ? 0 : 14,
                    }}
                >
                    {renderInline(heading[2], ctx, key)}
                </p>
            );
            i++;
            continue;
        }

        // Blockquote, and the callout that may be hiding in its first line.
        if (/^\s*>/.test(line)) {
            const buf: string[] = [];
            while (i < lines.length && /^\s*>/.test(lines[i])) {
                buf.push(lines[i++].replace(/^\s*>\s?/, ''));
            }
            const callout = buf[0]?.match(CALLOUT);
            const kind = callout ? callout[1].toLowerCase() : '';
            const accent = CALLOUT_COLORS[kind] || Colors.blue;
            const heading_ = callout ? callout[3] || callout[1] : '';
            const rest = callout ? buf.slice(1) : buf;
            out.push(
                <div
                    key={key}
                    style={{ ...block.quote, borderLeftColor: accent }}
                >
                    {callout ? (
                        <p style={{ ...block.calloutTitle, color: accent }}>
                            {renderInline(heading_, ctx, `${key}-t`)}
                        </p>
                    ) : null}
                    {rest
                        .join('\n')
                        .split(/\n{2,}/)
                        .filter((p) => p.trim())
                        .map((p, k) => (
                            <p key={k} style={block.para}>
                                {renderInline(p.replace(/\n/g, ' '), ctx, `${key}-${k}`)}
                            </p>
                        ))}
                </div>
            );
            continue;
        }

        // Lists. A task list is a bullet list whose markers are checkboxes,
        // which is worth keeping — half of what people put in a vault is
        // things they meant to do.
        if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
            const items: { text: string; done: boolean | null }[] = [];
            const ordered = /^\s*\d+[.)]\s+/.test(line);
            while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
                let text = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
                const task = text.match(/^\[([ xX])\]\s+(.*)$/);
                items.push({
                    text: task ? task[2] : text,
                    done: task ? task[1].toLowerCase() === 'x' : null,
                });
                i++;
            }
            out.push(
                <div key={key} style={block.list}>
                    {items.map((item, k) => (
                        <div key={k} style={block.listItem}>
                            <span style={block.bullet}>
                                {item.done === null
                                    ? ordered
                                        ? `${k + 1}.`
                                        : '▪'
                                    : item.done
                                      ? '☑'
                                      : '☐'}
                            </span>
                            <span
                                style={
                                    item.done ? block.doneText : block.itemText
                                }
                            >
                                {renderInline(item.text, ctx, `${key}-${k}`)}
                            </span>
                        </div>
                    ))}
                </div>
            );
            continue;
        }

        // A table: a header row, a divider of dashes, then rows.
        if (line.includes('|') && /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(lines[i + 1] || '')) {
            const cells = (row: string) =>
                row
                    .replace(/^\s*\|/, '')
                    .replace(/\|\s*$/, '')
                    .split('|')
                    .map((c) => c.trim());
            const head = cells(lines[i]);
            i += 2;
            const rows: string[][] = [];
            while (i < lines.length && lines[i].includes('|')) {
                rows.push(cells(lines[i++]));
            }
            out.push(
                <div key={key} style={block.tableWrap}>
                    <table style={block.table}>
                        <thead>
                            <tr>
                                {head.map((c, k) => (
                                    <th key={k} style={block.th}>
                                        {renderInline(c, ctx, `${key}-h${k}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, r) => (
                                <tr key={r}>
                                    {row.map((c, k) => (
                                        <td key={k} style={block.td}>
                                            {renderInline(c, ctx, `${key}-${r}${k}`)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            continue;
        }

        // Anything else is a paragraph: every line until a blank one.
        const buf: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^\s*(#{1,6}\s|>|```|([-*+]|\d+[.)])\s)/.test(lines[i])
        ) {
            buf.push(lines[i++]);
        }
        out.push(
            <p key={key} style={block.para}>
                {renderInline(buf.join(' '), ctx, key)}
            </p>
        );
    }

    return out;
}

const inline: StyleSheetCSS = {
    link: {
        display: 'inline',
        padding: 0,
        margin: 0,
        border: 'none',
        background: 'none',
        font: 'inherit',
        color: Colors.blue,
        textDecoration: 'underline',
        cursor: 'pointer',
        textAlign: 'left',
    },
    code: {
        fontFamily: 'monospace',
        fontSize: 11,
        background: Colors.lightGray,
        padding: '0 3px',
        border: `1px solid ${Colors.darkGray}`,
    },
    image: {
        display: 'block',
        maxWidth: '100%',
        margin: '8px 0',
        border: `1px solid ${Colors.darkGray}`,
    },
    highlight: { background: '#ffff8d', color: Colors.black },
    strike: { textDecoration: 'line-through', opacity: 0.7 },
    muted: { color: Colors.darkGray },
};

const block: StyleSheetCSS = {
    para: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.black,
        margin: '0 0 10px 0',
    },
    heading: {
        fontFamily: 'MSSerif',
        fontWeight: 'bold',
        color: Colors.black,
        margin: '14px 0 6px 0',
    },
    rule: {
        height: 2,
        margin: '12px 0',
        borderTop: `1px solid ${Colors.darkGray}`,
        borderBottom: `1px solid ${Colors.white}`,
    },
    pre: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        padding: 8,
        margin: '0 0 10px 0',
        overflowX: 'auto',
        whiteSpace: 'pre',
    },
    lang: {
        display: 'block',
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        marginBottom: 4,
    },
    quote: {
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `4px solid ${Colors.blue}`,
        background: '#e9eaec',
        padding: '8px 10px 1px 10px',
        margin: '0 0 10px 0',
    },
    calloutTitle: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        margin: '0 0 6px 0',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        margin: '0 0 10px 0',
    },
    listItem: { display: 'flex', gap: 8, alignItems: 'flex-start' },
    bullet: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        flexShrink: 0,
        minWidth: 14,
    },
    itemText: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.black,
    },
    doneText: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.darkGray,
        textDecoration: 'line-through',
    },
    tableWrap: { overflowX: 'auto', margin: '0 0 10px 0' },
    table: { borderCollapse: 'collapse', fontFamily: 'MSSerif', fontSize: 11 },
    th: {
        border: `1px solid ${Colors.darkGray}`,
        background: Colors.lightGray,
        padding: '3px 6px',
        textAlign: 'left',
        fontWeight: 'bold',
    },
    td: {
        border: `1px solid ${Colors.darkGray}`,
        padding: '3px 6px',
        background: Colors.white,
    },
};
