import React, { useRef, useState } from 'react';
import { useLazyMount } from './useLazyMount';

export interface VideoAssetProps {
    src: string;
    /** Forwarded to the wrapper, same as `LazyImage`'s `style` prop. */
    style?: React.CSSProperties;
}

/**
 * Measured width÷height per `src`, shared by every instance on the page —
 * same idea as `LazyImage`'s cache, and for the same reason: reserve the
 * right box before the file has arrived, so the page doesn't jump once it
 * does.
 */
const aspectCache = new Map<string, number>();
const DEFAULT_RATIO = 16 / 9;

/**
 * A small looping clip, muted and decorative, embedded in the showcase.
 *
 * Two things changed from the original:
 *
 *  - It used to mount with `autoPlay` and no `preload`, which in practice
 *    means "start fetching and decoding immediately" — for seven clips on a
 *    page, most of them off-screen, that's megabytes moving before anyone
 *    has scrolled to them. It now waits until it's about to be visible (see
 *    `useLazyMount`) and sets `preload="none"` until then.
 *  - It was missing `playsInline`. Without it, iOS Safari either refuses
 *    autoplay entirely or takes the video fullscreen instead of playing it
 *    where it sits — on a page meant to read as embedded media, that's a
 *    second bug wearing the first one's clothes.
 */
const VideoAsset: React.FC<VideoAssetProps> = ({ src, style }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const inView = useLazyMount(wrapRef);
    const [ratio, setRatio] = useState(() => aspectCache.get(src) ?? DEFAULT_RATIO);

    return (
        <div
            ref={wrapRef}
            style={Object.assign(
                {},
                styles.wrap,
                { aspectRatio: String(ratio) },
                style
            )}
        >
            {inView && (
                <video
                    style={styles.video}
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    disablePictureInPicture
                    onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth && v.videoHeight) {
                            const r = v.videoWidth / v.videoHeight;
                            aspectCache.set(src, r);
                            setRatio(r);
                        }
                    }}
                />
            )}
        </div>
    );
};

const styles: StyleSheetCSS = {
    wrap: {
        display: 'block',
        width: '100%',
    },
    video: {
        display: 'block',
        width: '100%',
        height: '100%',
    },
};

export default VideoAsset;
