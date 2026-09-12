import { useEffect, useRef } from 'react';

/**
 * Is this component still on screen?
 * ----------------------------------
 * For the three read-only windows that fetch from somewhere slow — the Vault,
 * the GitHub viewer and the Reading List. All three load through a
 * `useCallback` that is called both from an effect on mount *and* from a
 * "Try again" button, which rules out the `let alive = true` pattern the
 * effects elsewhere on this desktop use: that flag belongs to one run of one
 * effect, and these callbacks outlive both.
 *
 * The Vault is the reason this exists. It chains three sequential network
 * requests — the uid lookup, the cache, then the file itself — so the window
 * in which a visitor can open it, decide it is taking too long, and close it
 * again is several seconds wide, and every one of those `setState` calls used
 * to land on a component that had been gone for most of that time.
 *
 *     const mounted = useMountedRef();
 *     ...
 *     if (!mounted.current) return;
 *     setThings(data);
 *
 * Deliberately a ref rather than state: reading it must never cause a render,
 * and it has to be readable from inside an async function that closed over an
 * earlier one.
 */
export function useMountedRef(): React.MutableRefObject<boolean> {
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    return mounted;
}

export default useMountedRef;
