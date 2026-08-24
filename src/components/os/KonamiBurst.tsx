import React, { useEffect, useMemo, useState } from 'react';
import { IconName } from '../../assets/icons';
import { Icon } from '../general';

/**
 * The one-off flourish for finding the Konami code — see `konami.ts` for
 * where it's triggered. A handful of desktop icons rain down the screen once
 * and the whole thing unmounts itself; there's nothing to clean up between
 * plays since a fresh set of icons/positions is only ever picked while `play`
 * is true.
 */
export interface KonamiBurstProps {
    play: boolean;
    onDone: () => void;
}

const ICONS: IconName[] = [
    'doomIcon',
    'winampIcon',
    'snakeIcon',
    'tetrisIcon',
    'scrabbleIcon',
    'minesweeperIcon',
    'notepadIcon',
    'stocksIcon',
    'pinballIcon',
    'msnIcon',
];

const PIECES = 18;
const DURATION_MS = 2600;

const KonamiBurst: React.FC<KonamiBurstProps> = ({ play, onDone }) => {
    const [visible, setVisible] = useState(false);

    // A fresh random layout only when a play actually starts — reusing the
    // same one on a second trigger would look identical every time.
    const pieces = useMemo(() => {
        if (!play) return [];
        return Array.from({ length: PIECES }, (_, i) => ({
            icon: ICONS[Math.floor(Math.random() * ICONS.length)],
            left: Math.random() * 100,
            delay: Math.random() * 0.9,
            duration: 1.8 + Math.random() * 1.1,
            size: 24 + Math.round(Math.random() * 12),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]);

    useEffect(() => {
        if (!play) return;
        setVisible(true);
        const id = window.setTimeout(() => {
            setVisible(false);
            onDone();
        }, DURATION_MS);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]);

    if (!visible) return null;

    return (
        <div style={styles.overlay}>
            {pieces.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        animation: `konamiFall ${p.duration}s ease-in ${p.delay}s 1 both`,
                    }}
                >
                    <Icon icon={p.icon} size={p.size} />
                </div>
            ))}
        </div>
    );
};

const styles: StyleSheetCSS = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Above every window and the taskbar, but shouldn't eat clicks —
        // it's a flourish, not a dialog.
        zIndex: 200001,
        pointerEvents: 'none',
        overflow: 'hidden',
    },
};

export default KonamiBurst;
