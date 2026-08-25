import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import {
    PET_LIST,
    PetDef,
    adoptPet,
    computeMood,
    contentment,
    feedPet,
    pettPet,
    resetPetChoice,
    usePetState,
} from '../os/pets';

/**
 * Pet — Desktop, Programs, and the Store.
 *
 * Two very different screens behind one window, switched on whether
 * `state.species` is set: a chooser for the four available animals, and a
 * small dashboard for the one you have picked. Adopting, feeding and patting
 * all go straight through `pets.ts`'s module store, so this window and the
 * tray's own mini version of it (`TrayPanels.tsx`'s `PetPanel`) can never show
 * two different animals or two different hunger levels — there is exactly one
 * source of truth and both of these just render it.
 */

const MOOD_LABEL: Record<ReturnType<typeof computeMood>, string> = {
    excited: 'Excited',
    content: 'Content',
    hungry: 'Getting hungry',
    starving: 'Very hungry',
};

const MOOD_COLOR: Record<ReturnType<typeof computeMood>, string> = {
    excited: '#1a8a34',
    content: '#2e7d32',
    hungry: '#b8860b',
    starving: '#a52a2a',
};

/** The same segmented Win95 meter as Statistics.tsx, kept local on purpose —
 *  a fifteen-line component isn't worth a shared import across two apps that
 *  otherwise have nothing to do with each other. */
const Meter: React.FC<{ value: number; max: number; color: string }> = ({
    value,
    max,
    color,
}) => {
    const pct = max ? Math.min(1, Math.max(0, value / max)) : 0;
    const cells = 24;
    const lit = Math.round(pct * cells);
    return (
        <div style={styles.meter}>
            {Array.from({ length: cells }, (_, i) => (
                <span
                    key={i}
                    style={{
                        ...styles.meterCell,
                        ...(i < lit ? { background: color } : null),
                    }}
                />
            ))}
        </div>
    );
};

const humanAge = (from: number): string => {
    if (!from) return 'moments';
    const ms = Date.now() - from;
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
};

const Chooser: React.FC<{ onAdopt: (species: PetDef['id']) => void }> = ({
    onAdopt,
}) => (
    <div style={styles.chooserRoot}>
        <p style={styles.chooserIntro}>
            Four animals have taken up residence on this machine. Pick one —
            you can always change your mind later.
        </p>
        <div style={styles.chooserGrid}>
            {PET_LIST.map((pet) => (
                <div key={pet.id} style={styles.card}>
                    <Icon icon={pet.icon} size={48} />
                    <span style={styles.cardName}>{pet.name}</span>
                    <p style={styles.cardTagline}>{pet.tagline}</p>
                    <button
                        type="button"
                        style={styles.adoptButton}
                        onClick={() => onAdopt(pet.id)}
                    >
                        Adopt {pet.name}
                    </button>
                </div>
            ))}
        </div>
    </div>
);

const Dashboard: React.FC<{
    pet: PetDef;
    state: ReturnType<typeof usePetState>;
}> = ({ pet, state }) => {
    const mood = computeMood(state);
    const level = contentment(state);

    return (
        <div style={styles.dashRoot}>
            <div style={styles.dashHead}>
                <Icon icon={pet.icon} size={64} />
                <div style={styles.dashHeadText}>
                    <span style={styles.dashName}>{pet.name}</span>
                    <span style={styles.dashTagline}>{pet.tagline}</span>
                    <span
                        style={{
                            ...styles.moodBadge,
                            color: MOOD_COLOR[mood],
                            borderColor: MOOD_COLOR[mood],
                        }}
                    >
                        {MOOD_LABEL[mood]}
                    </span>
                </div>
            </div>

            <fieldset style={styles.group}>
                <legend style={styles.legend}>Contentment</legend>
                <Meter value={level} max={100} color={MOOD_COLOR[mood]} />
                <div style={styles.actions}>
                    <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => feedPet()}
                    >
                        Feed {pet.name}
                    </button>
                    <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => pettPet()}
                    >
                        Pat {pet.name}
                    </button>
                </div>
            </fieldset>

            <fieldset style={styles.group}>
                <legend style={styles.legend}>About {pet.name}</legend>
                <Row label="Adopted" value={`${humanAge(state.adoptedAt)} ago`} />
                <Row label="Times fed" value={String(state.totalFeedings)} />
                <Row label="Times patted" value={String(state.totalPets)} />
                {state.totalAdoptions > 1 && (
                    <Row
                        label="Pets adopted in total"
                        value={String(state.totalAdoptions)}
                    />
                )}
            </fieldset>

            <button
                type="button"
                style={styles.switchButton}
                onClick={() => resetPetChoice()}
            >
                Choose a different pet…
            </button>
        </div>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
    </div>
);

export interface PetProps extends WindowAppProps {}

const Pet: React.FC<PetProps> = ({ onInteract, onClose, onMinimize }) => {
    const state = usePetState();
    const pet = state.species ? PET_LIST.find((p) => p.id === state.species) : null;

    return (
        <Window
            top={100}
            left={220}
            width={pet ? 360 : 540}
            height={pet ? 480 : 520}
            windowTitle={pet ? `${pet.name} - Pet` : 'Adopt a Pet'}
            windowBarIcon={pet ? pet.icon : 'petModemIcon'}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={pet ? `Living in the tray` : 'Nobody home yet'}
        >
            <div style={styles.root}>
                {pet ? (
                    <Dashboard pet={pet} state={state} />
                ) : (
                    <Chooser onAdopt={(species) => adoptPet(species)} />
                )}
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        overflowY: 'auto',
        padding: 10,
    },

    // ---- chooser ----
    chooserRoot: { display: 'flex', flexDirection: 'column', gap: 12 },
    chooserIntro: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
        margin: 0,
    },
    chooserGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '12px 10px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        textAlign: 'center',
    },
    cardName: {
        fontFamily: 'MSSerif',
        fontWeight: 'bold',
        fontSize: 13,
        color: Colors.black,
    },
    cardTagline: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: '#444',
        margin: '2px 0 6px',
        lineHeight: 1.4,
    },
    adoptButton: {
        padding: '4px 10px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },

    // ---- dashboard ----
    dashRoot: { display: 'flex', flexDirection: 'column', gap: 10 },
    dashHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dashHeadText: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0,
    },
    dashName: {
        fontFamily: 'MSSerif',
        fontWeight: 'bold',
        fontSize: 16,
        color: Colors.black,
    },
    dashTagline: { fontFamily: 'MSSerif', fontSize: 10, color: '#444' },
    moodBadge: {
        alignSelf: 'flex-start',
        marginTop: 2,
        padding: '1px 7px',
        fontFamily: 'MSSerif',
        fontSize: 10,
        fontWeight: 'bold',
        border: '1px solid',
        borderRadius: 2,
    },
    group: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        margin: 0,
        padding: '4px 10px 10px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    legend: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    meter: {
        flexDirection: 'row',
        gap: 1,
        padding: 2,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
    },
    meterCell: { width: 8, height: 12, background: Colors.lightGray },
    actions: { flexDirection: 'row', gap: 8 },
    actionButton: {
        flex: 1,
        padding: '5px 8px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 10,
    },
    rowLabel: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    switchButton: {
        alignSelf: 'flex-start',
        padding: '4px 8px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: '#1a1a8c',
        background: 'transparent',
        border: 'none',
        textDecoration: 'underline',
    },
};

export default Pet;
