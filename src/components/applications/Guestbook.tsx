import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import nudgeSound from '../../assets/audio/nudge.mp3';
import {
    GuestMessage,
    fetchMessages,
    postMessage,
    clean,
    isRemote,
} from './guestbookApi';
import { botReply } from './msnBot';

/**
 * MSN Messenger — the guestbook, dressed as the chat client it looks like.
 *
 * Modelled closely on the MSN window in Yute (Yuteoctober)'s Windows95
 * Portfolio: a menu bar, a grooved toolbar holding the username button, the
 * nudge and the bot switch, an online count, the chat itself, then the compose
 * box and a status bar that says who's typing.
 *
 * Two things work differently here, because that portfolio talks to a
 * WebSocket server and this one talks to a REST table (see guestbookApi.ts):
 *
 *   - **Nudge** rattles your own window and plays the sound. There it also
 *     buzzes everyone else's; with no socket to push down, there is nobody to
 *     send it to.
 *   - **The bot** answers locally, in this browser, and its replies are not
 *     posted to the guestbook. There the bot lives on the server, so everyone
 *     sees it talk.
 */

export interface GuestbookProps extends WindowAppProps {}

const NAME_KEY = 'guestbook_name';
const BOT_KEY = 'guestbook_bot';

/** How long a message counts towards "Online User" (see onlineCount). */
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

const formatStamp = (iso: string): string => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};

const formatDay = (iso: string): string => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

/** A message the local bot produced. Never leaves this browser. */
interface LocalMessage extends GuestMessage {
    bot?: boolean;
}

const Guestbook: React.FC<GuestbookProps> = (props) => {
    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [sending, setSending] = useState(false);

    // The "Username" dialog that floats over the window, as in the example.
    const [nameDialogOpen, setNameDialogOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState(name);

    const [botActive, setBotActive] = useState(
        () => localStorage.getItem(BOT_KEY) === '1'
    );
    const [shaking, setShaking] = useState(false);

    // Clicking a message reveals its timestamp for a few seconds.
    const [revealed, setRevealed] = useState<string | number | null>(null);
    const revealTimer = useRef<number>();

    const listRef = useRef<HTMLDivElement>(null);
    const nudgeAudio = useRef<HTMLAudioElement>();

    const scrollToBottom = useCallback(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    const load = useCallback(async () => {
        try {
            const data = await fetchMessages();
            // Keep any bot replies already on screen; they exist only here, so
            // a refresh from the server would otherwise wipe them.
            setMessages((prev) => [...data, ...prev.filter((m) => m.bot)]);
            setStatus('ready');
            setTimeout(scrollToBottom, 0);
        } catch {
            setStatus('error');
        }
    }, [scrollToBottom]);

    useEffect(() => {
        load();
        // Light polling so new messages from other visitors show up.
        const id = window.setInterval(load, 20000);
        return () => window.clearInterval(id);
    }, [load]);

    useEffect(() => () => window.clearTimeout(revealTimer.current), []);

    /**
     * "Online User" — how many different people have posted in the last quarter
     * hour, plus you. A REST table has no presence channel, so this is the
     * closest honest reading of who is about.
     */
    const onlineCount = useMemo(() => {
        const cutoff = Date.now() - ONLINE_WINDOW_MS;
        const recent = new Set(
            messages
                .filter((m) => !m.bot && new Date(m.created_at).getTime() >= cutoff)
                .map((m) => m.name.toLowerCase())
        );
        recent.add((name.trim() || 'anonymous').toLowerCase());
        return recent.size;
    }, [messages, name]);

    const lastMessageDay = useMemo(() => {
        const real = messages.filter((m) => !m.bot);
        return real.length ? formatDay(real[real.length - 1].created_at) : null;
    }, [messages]);

    const nudge = useCallback(() => {
        setShaking(true);
        if (!nudgeAudio.current) nudgeAudio.current = new Audio(nudgeSound);
        nudgeAudio.current.currentTime = 0;
        // Browsers block audio until the page has been interacted with; the
        // click that got us here counts, so this normally just plays.
        nudgeAudio.current.play().catch(() => {});
    }, []);

    const toggleBot = useCallback(() => {
        setBotActive((on) => {
            localStorage.setItem(BOT_KEY, on ? '0' : '1');
            return !on;
        });
    }, []);

    const send = useCallback(async () => {
        const n = name.trim() || 'Anonymous';
        const m = draft.trim();
        if (!m || sending) return;
        localStorage.setItem(NAME_KEY, n);
        setSending(true);
        const text = clean(m).slice(0, 500);
        try {
            const saved = await postMessage(clean(n).slice(0, 40), text);
            setMessages((prev) => [...prev, saved]);
            setDraft('');
            setTimeout(scrollToBottom, 0);

            if (botActive) {
                const reply = botReply(text, n);
                // A beat's delay so it reads as a reply rather than an echo.
                window.setTimeout(() => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `bot-${Date.now()}`,
                            name: 'MSNBot',
                            message: reply,
                            created_at: new Date().toISOString(),
                            bot: true,
                        },
                    ]);
                    setTimeout(scrollToBottom, 0);
                }, 700);
            }
        } catch {
            setStatus('error');
        } finally {
            setSending(false);
        }
    }, [name, draft, sending, botActive, scrollToBottom]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const reveal = (id: string | number) => {
        setRevealed(id);
        window.clearTimeout(revealTimer.current);
        revealTimer.current = window.setTimeout(() => setRevealed(null), 3000);
    };

    const commitName = () => {
        const next = nameDraft.trim().slice(0, 20);
        setName(next);
        localStorage.setItem(NAME_KEY, next);
        setNameDialogOpen(false);
    };

    return (
        <Window
            top={40}
            left={40}
            width={470}
            height={540}
            windowTitle="MSN"
            windowBarIcon="msnIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            shake={shaking}
            onShakeEnd={() => setShaking(false)}
            bottomLeftText={
                isRemote
                    ? `${messages.filter((m) => !m.bot).length} message(s)`
                    : 'offline demo — saved in your browser only'
            }
        >
            <div style={styles.page}>
                <div style={styles.menuBar}>
                    <span style={styles.menuItem}>
                        File<u style={styles.mnemonic}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Edit<u style={styles.mnemonic}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        View<u style={styles.mnemonic}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Help<u style={styles.mnemonic}>_</u>
                    </span>
                </div>

                {/* Grooved toolbar: username, nudge, and the bot switch. */}
                <div style={styles.groove}>
                    <button
                        type="button"
                        style={styles.toolButton}
                        onClick={() => {
                            setNameDraft(name);
                            setNameDialogOpen(true);
                        }}
                        title="Set your username"
                    >
                        <Icon icon="msnChatIcon" style={styles.toolIcon} />
                    </button>
                    <button
                        type="button"
                        style={styles.toolButton}
                        onClick={nudge}
                        title="Send a nudge"
                    >
                        <Icon icon="msnNudgeIcon" style={styles.toolIcon} />
                    </button>
                    <span style={styles.grooveText}>
                        Username: {name.trim() ? name : 'Anonymous'}
                    </span>
                    <button
                        type="button"
                        style={Object.assign(
                            {},
                            styles.botToggle,
                            botActive && styles.botToggleActive
                        )}
                        onClick={toggleBot}
                        title="Chat with the bot (replies are only shown to you)"
                    >
                        {botActive ? 'Bot Online' : 'Bot Offline'}
                    </button>
                </div>

                <div style={styles.onlineRow}>
                    <span style={styles.onlineText}>
                        Online User: <b>{onlineCount}</b>
                    </span>
                </div>

                <div style={styles.list} ref={listRef}>
                    {status === 'loading' && <p style={styles.dim}>LOADING…</p>}
                    {status === 'error' && (
                        <p style={styles.dim}>
                            Couldn't reach the guestbook. Trying again shortly…
                        </p>
                    )}
                    {status === 'ready' && messages.length === 0 && (
                        <p style={styles.dim}>No messages yet — be the first!</p>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={styles.line}
                            onClick={() => reveal(msg.id)}
                        >
                            <span
                                style={Object.assign({}, styles.stamp, {
                                    opacity: revealed === msg.id ? 1 : 0,
                                })}
                            >
                                {formatStamp(msg.created_at)}
                            </span>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.author,
                                    msg.bot && styles.authorBot
                                )}
                            >
                                &lt;{msg.name}&gt;:{' '}
                            </span>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.body,
                                    msg.bot && styles.bodyBot
                                )}
                            >
                                {msg.message}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={styles.compose}>
                    <textarea
                        style={styles.textarea}
                        placeholder="Enter your message here..."
                        value={draft}
                        maxLength={500}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <button
                        type="button"
                        style={Object.assign(
                            {},
                            styles.sendBtn,
                            (!draft.trim() || sending) && styles.sendBtnDisabled
                        )}
                        onClick={send}
                        disabled={!draft.trim() || sending}
                    >
                        Send
                    </button>
                </div>

                <div style={styles.statusBar}>
                    <p style={styles.statusText}>
                        {draft.trim().length > 0
                            ? `${name.trim() || 'Anonymous'} is typing...`
                            : lastMessageDay
                              ? `Last message received on ${lastMessageDay}`
                              : 'No messages yet'}
                    </p>
                </div>

                {/* The Username dialog — a little window of its own, over the app. */}
                {nameDialogOpen && (
                    <div style={styles.modalScrim}>
                        <div style={styles.dialog}>
                            <div style={styles.dialogBar}>
                                <Icon
                                    icon="msnChatIcon"
                                    style={styles.dialogBarIcon}
                                />
                                <span style={styles.dialogTitle}>Username</span>
                                <button
                                    type="button"
                                    style={styles.dialogClose}
                                    onClick={() => setNameDialogOpen(false)}
                                    title="Close"
                                >
                                    ×
                                </button>
                            </div>
                            <form
                                style={styles.dialogBody}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    commitName();
                                }}
                            >
                                <label style={styles.dialogLabel}>
                                    Username:
                                </label>
                                <input
                                    style={styles.dialogInput}
                                    type="text"
                                    maxLength={20}
                                    autoFocus
                                    placeholder="Enter your username here..."
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                />
                                <div style={styles.dialogButtons}>
                                    <button
                                        type="submit"
                                        style={styles.dialogButton}
                                    >
                                        Ok
                                    </button>
                                    <button
                                        type="button"
                                        style={styles.dialogButton}
                                        onClick={() => {
                                            setNameDraft(name);
                                            setNameDialogOpen(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    page: {
        position: 'relative',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: Colors.lightGray,
        boxSizing: 'border-box',
        fontFamily: 'MSSerif',
    },
    menuBar: {
        display: 'flex',
        gap: 14,
        padding: '4px 8px',
        fontSize: 12,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'default',
        userSelect: 'none',
    },
    mnemonic: {
        marginLeft: '-2px',
    },
    groove: {
        alignItems: 'center',
        gap: 6,
        height: 38,
        margin: '2px 10px 0 10px',
        padding: '0 4px',
        borderTop: `3px groove ${Colors.white}`,
        borderBottom: `3px groove ${Colors.white}`,
        flexShrink: 0,
    },
    toolButton: {
        width: 34,
        height: 30,
        padding: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
    toolIcon: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    grooveText: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        paddingLeft: 4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    botToggle: {
        width: 78,
        padding: '2px 0',
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.darkGray,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
        textAlign: 'center',
    },
    botToggleActive: {
        color: Colors.black,
        border: `2px solid ${Colors.black}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    onlineRow: {
        alignItems: 'center',
        height: 24,
        margin: '0 10px',
        flexShrink: 0,
    },
    onlineText: {
        fontSize: 12,
    },
    list: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        flexDirection: 'column',
        margin: '0 10px',
        padding: '3px 5px',
        background: Colors.white,
        border: `1px solid ${Colors.black}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    dim: {
        fontSize: 12,
        color: Colors.darkGray,
    },
    line: {
        position: 'relative',
        display: 'block',
        fontSize: 13,
        lineHeight: '17px',
        wordBreak: 'break-word',
        cursor: 'default',
        marginBottom: 1,
    },
    stamp: {
        position: 'absolute',
        top: -1,
        right: 0,
        fontSize: 10,
        color: Colors.darkGray,
        background: Colors.white,
        paddingLeft: 6,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
    },
    author: {
        color: Colors.blue,
    },
    authorBot: {
        color: '#7a1fa2',
    },
    body: {
        color: '#171616',
    },
    bodyBot: {
        color: '#7a1fa2',
    },
    compose: {
        height: 60,
        gap: 4,
        margin: '10px 10px 0 10px',
        flexShrink: 0,
    },
    textarea: {
        flex: 1,
        minWidth: 0,
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: 'MSSerif',
        fontSize: 13,
        padding: '3px 4px',
        resize: 'none',
        background: Colors.white,
        border: `2px solid ${Colors.black}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    sendBtn: {
        width: 76,
        flexShrink: 0,
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 13,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
    },
    sendBtnDisabled: {
        color: Colors.darkGray,
        cursor: 'default',
    },
    statusBar: {
        height: 22,
        margin: '8px 10px 8px 10px',
        alignItems: 'center',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    statusText: {
        fontSize: 12,
        paddingLeft: 4,
        color: '#323131',
    },
    modalScrim: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 9, 9, 0.44)',
        zIndex: 98,
    },
    dialog: {
        flexDirection: 'column',
        width: 280,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        outline: `1px solid ${Colors.white}`,
    },
    dialogBar: {
        alignItems: 'center',
        height: 22,
        paddingLeft: 3,
        paddingRight: 3,
        background: Colors.blue,
        flexShrink: 0,
    },
    dialogBarIcon: {
        width: 16,
        height: 16,
        objectFit: 'contain',
    },
    dialogTitle: {
        flex: 1,
        fontSize: 13,
        color: Colors.white,
        paddingLeft: 4,
    },
    dialogClose: {
        width: 16,
        height: 15,
        padding: 0,
        lineHeight: '11px',
        fontFamily: 'MSSerif',
        fontSize: 13,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        cursor: 'pointer',
    },
    dialogBody: {
        flexDirection: 'column',
        padding: 12,
        gap: 6,
    },
    dialogLabel: {
        fontSize: 13,
    },
    dialogInput: {
        fontFamily: 'MSSerif',
        fontSize: 13,
        padding: '3px 4px',
        background: Colors.white,
        border: `2px solid ${Colors.black}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    dialogButtons: {
        gap: 8,
        justifyContent: 'center',
        marginTop: 6,
    },
    dialogButton: {
        minWidth: 74,
        padding: '4px 0',
        fontFamily: 'MSSerif',
        fontSize: 13,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        cursor: 'pointer',
    },
};

export default Guestbook;
