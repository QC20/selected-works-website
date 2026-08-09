import React, { useRef, useState } from 'react';
import { useLazyMount } from './useLazyMount';

export interface LazyImageProps
    extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'style' | 'className'> {
    src: string;
    style?: React.CSSProperties;
    /**
     * Forwarded to the wrapper, not the `<img>`. A class like `.stacked` (see
     * Software.tsx) carries a negative margin that positions the figure
     * *among its siblings* — that's the wrapper's job once there is one, not
     * a rule about the picture inside it.
     */
    className?: string;
}

/** A reasonably neutral guess for an image this component has never seen before. */
const DEFAULT_RATIO = 4 / 3;

/**
 * Measured width÷height per `src`, shared by every instance on the page.
 * Once one `<LazyImage>` has loaded a picture, every other instance of that
 * same picture (a different showcase page revisited later in the session,
 * for instance) reserves the correct box on its very first paint instead of
 * guessing. See `useLazyMount` for why this exists instead of `loading="lazy"`.
 */
const aspectCache = new Map<string, number>();

/**
 * Drop-in replacement for `<img>` that defers the real fetch until the
 * picture is about to be needed.
 *
 * A plain swap of the tag name is deliberate: every prop that used to reach
 * the `<img>` still does (`{...rest}`), so the only behaviour that changes is
 * *when* the browser is told to load the file. The one exception is `width`
 * / `height` as bare HTML attributes — those get folded into the wrapper's
 * size instead of the (not yet mounted) image's, so a caption or a floated
 * figure sizes correctly even before the picture arrives.
 */
const LazyImage: React.FC<LazyImageProps> = ({
    src,
    style,
    className,
    width,
    height,
    onLoad,
    alt,
    ...rest
}) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const inView = useLazyMount(wrapRef);
    const [ratio, setRatio] = useState(() => aspectCache.get(src) ?? DEFAULT_RATIO);

    const wrapperStyle: React.CSSProperties = Object.assign(
        // Every layout context this sits in (`.wrap-figure img`,
        // `.captioned-image img`, `.full-figure img`) already defaults an
        // `<img>` to `width: 100%` — matching that here means a caller who
        // passes no sizing at all still gets the size they'd have gotten
        // before. `.captioned-image` is a flex container without `align-items:
        // stretch`, so without this a bare wrapper `<div>` would shrink to fit
        // its content instead of filling the column the way the `<img>` did.
        { display: 'block', width: '100%' },
        style,
        width !== undefined ? { width } : null,
        height !== undefined ? { height } : null,
        // Only needed while the real dimensions aren't known yet — once
        // they're on the element itself, aspect-ratio would just fight the
        // explicit height for nothing.
        height === undefined ? { aspectRatio: String(ratio) } : null
    );

    return (
        <div ref={wrapRef} className={className} style={wrapperStyle}>
            {inView && (
                <img
                    src={src}
                    alt={alt ?? ''}
                    {...rest}
                    style={styles.fill}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                            const r = img.naturalWidth / img.naturalHeight;
                            aspectCache.set(src, r);
                            setRatio(r);
                        }
                        onLoad?.(e);
                    }}
                />
            )}
        </div>
    );
};

const styles: { fill: React.CSSProperties } = {
    fill: { display: 'block', width: '100%', height: '100%' },
};

export default LazyImage;
