import React, { useEffect, useState } from "react";
import { fetchMessages, GuestMessage, isRemote } from "../applications/guestbookApi";

/**
 * A one-line rotating preview of the most recent guestbook messages, shown on
 * Home. Self-contained on purpose — it's the one piece of Home.tsx that talks
 * to the network, so if this doesn't earn its place it can be deleted (and
 * this import in Home.tsx removed) without touching anything else on the
 * page.
 *
 * Renders nothing if there's no Supabase backend configured (nothing shared
 * to show), no messages yet, or the fetch fails — silence is the right
 * failure mode for a decorative footnote like this one, not an error state.
 */
const ROTATE_MS = 5000;

const GuestbookTicker: React.FC = () => {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isRemote) return;
    let cancelled = false;
    fetchMessages()
      .then((all) => {
        if (cancelled) return;
        // Newest first, most recent five — a ticker, not the whole guestbook.
        setMessages(all.slice(-5).reverse());
      })
      .catch(() => {
        /* stays empty, renders nothing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [messages.length]);

  if (messages.length === 0) return null;
  const current = messages[index];

  return (
    <p style={styles.ticker}>
      💬 <b>{current.name}</b> left a note in the guestbook:{" "}
      <i>
        "
        {current.message.length > 80
          ? `${current.message.slice(0, 80)}…`
          : current.message}
        "
      </i>
    </p>
  );
};

const styles: StyleSheetCSS = {
  ticker: {
    // A full line clear of the nav above it. At 24 the descenders of a
    // long entry could ride up into the display face of the name.
    marginTop: 48,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 520,
  },
};

export default GuestbookTicker;
