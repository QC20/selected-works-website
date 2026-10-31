import React from 'react';
import { lazyApp } from './lazyApp';
import { usePetState } from './pets';

/**
 * The desktop pet, loaded only for people who have one.
 * -----------------------------------------------------
 * The animals are drawn, not pictured: a small renderer, a skeleton for each
 * species and a library of poses, a few thousand lines in all. That is worth
 * paying for once there is an animal on the taskbar and not at all before —
 * and most first-time visitors have not adopted one, so for them it is pure
 * weight on the first download, which `lazyApp` was written to keep small.
 *
 * So the creature is its own chunk, and this is the only thing the desktop
 * mounts: a subscription to the pet store that renders nothing until a
 * species exists. It is separate from `Desktop` so that feeding or patting —
 * which notify the store's listeners — re-renders this rather than the
 * entire desktop.
 */

const DesktopPet = lazyApp(() => import('./DesktopPet'));

const PetHost: React.FC<{ suspended: boolean }> = ({ suspended }) => {
    const { species } = usePetState();
    if (!species) return null;
    return (
        <React.Suspense fallback={null}>
            <DesktopPet suspended={suspended} />
        </React.Suspense>
    );
};

export default PetHost;
