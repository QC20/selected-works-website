import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import {
    GuestMessage,
    fetchMessages,
    postMessage,
    clean,
    isRemote,
} from './guestbookApi';

export interface GuestbookProps extends WindowAppProps {}

const NAME_KEY = 'guestbook_name';

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const Guestbook: React.FC<GuestbookProps> = (props) => {
    const [messages, setMessages] = useState<GuestMessage[]>([]);
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [sending, setSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    const load = useCallback(async () => {
        try {
            const data = await fetchMessages();
            setMessages(data);
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

    const send = useCallback(async () => {
        const n = name.trim();
        const m = draft.trim();
        if (!n || !m || sending) return;
        localStorage.setItem(NAME_KEY, n);
        setSending(true);
        try {
            const saved = await postMessage(clean(n).slice(0, 40), clean(m).slice(0, 500));
            setMessages((prev) => [...prev, saved]);
            setDraft('');
            setTimeout(scrollToBottom, 0);
        } catch {
            setStatus('error');
        } finally {
            setSending(false);
        }
    }, [name, draft, sending, scrollToBottom]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <Window
            top={40}
            left={40}
            width={460}
            height={520}
            windowTitle="Guestbook — Leave a message"
            windowBarIcon="msnIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={
                isRemote
                    ? `${messages.length} messages`
                    : 'offline demo — saved in your browser only'
            }
        >
            <div style={styles.page}>
                <div style={styles.banner}>
                    <p style={styles.bannerTitle}>Sign my guestbook</p>
                    <p style={styles.bannerSub}>
                        Say hi, leave a note, read what others left behind.
                    </p>
                </div>

                <div style={styles.list} ref={listRef}>
                    {status === 'loading' && <p style={styles.dim}>Loading…</p>}
                    {status === 'error' && (
                        <p style={styles.dim}>
                            Couldn't reach the guestbook. Try again in a moment.
                        </p>
                    )}
                    {status === 'ready' && messages.length === 0 && (
                        <p style={styles.dim}>No messages yet — be the first!</p>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} style={styles.msg}>
                            <div style={styles.msgHead}>
                                <span style={styles.msgName}>{msg.name}</span>
                                <span style={styles.msgTime}>
                                    {formatTime(msg.created_at)}
                                </span>
                            </div>
                            <p style={styles.msgBody}>{msg.message}</p>
                        </div>
                    ))}
                </div>

                <div style={styles.compose}>
                    <input
                        style={styles.nameInput}
                        placeholder="Your name"
                        value={name}
                        maxLength={40}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div style={styles.sendRow}>
                        <textarea
                            style={styles.textarea}
                            placeholder="Type a message and press Enter…"
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
                                (!name.trim() || !draft.trim() || sending) &&
                                    styles.sendBtnDisabled
                            )}
                            onClick={send}
                            disabled={!name.trim() || !draft.trim() || sending}
                        >
                            {sending ? '…' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    page: {
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: Colors.lightGray,
        boxSizing: 'border-box',
        padding: 6,
    },
    banner: {
        flexDirection: 'column',
        background: Colors.blue,
        color: Colors.white,
        padding: 8,
        marginBottom: 6,
    },
    bannerTitle: {
        fontFamily: 'MSSerif',
        fontSize: 15,
        color: Colors.white,
        marginBottom: 2,
    },
    bannerSub: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.white,
    },
    list: {
        flex: 1,
        overflowY: 'auto',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: Colors.black,
        borderLeftColor: Colors.black,
        padding: 8,
        flexDirection: 'column',
    },
    dim: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.darkGray,
    },
    msg: {
        flexDirection: 'column',
        marginBottom: 10,
    },
    msgHead: {
        alignItems: 'baseline',
        justifyContent: 'space-between',
    },
    msgName: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.blue,
    },
    msgTime: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
    },
    msgBody: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
    },
    compose: {
        flexDirection: 'column',
        marginTop: 6,
    },
    nameInput: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        padding: 4,
        marginBottom: 4,
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: Colors.black,
        borderLeftColor: Colors.black,
    },
    sendRow: {
        alignItems: 'stretch',
    },
    textarea: {
        flex: 1,
        fontFamily: 'MSSerif',
        fontSize: 12,
        padding: 4,
        height: 44,
        resize: 'none',
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: Colors.black,
        borderLeftColor: Colors.black,
    },
    sendBtn: {
        marginLeft: 4,
        width: 64,
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 12,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
    },
    sendBtnDisabled: {
        color: Colors.darkGray,
        cursor: 'default',
    },
};

export default Guestbook;
