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
    hidePetForNow,
    pettPet,
    playFetch,
    resetPetChoice,
    tossTreat,
    trickPet,
    unhidePet,
    usePetState,
} from '../os/pets';
import {
    ACCESSORIES,
    SCALE_STEP,
    achievementRows,
    adjustScale,
    equipAccessory,
    resetScale,
    unlockedAccessories,
    useAchievementState,
} from '../os/petAchievements';

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

            {/* Everything here happens out on the taskbar rather than in this
                window — the buttons are a remote control for the creature on
                the bar, which is why they say where to look. */}
            <fieldset style={styles.group}>
                <legend style={styles.legend}>Play</legend>
                <div style={styles.actions}>
                    <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => playFetch()}
                    >
                        Play fetch
                    </button>
                    <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => trickPet()}
                    >
                        Do a trick
                    </button>
                    <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => tossTreat()}
                    >
                        Toss a treat
                    </button>
                </div>
                <p style={styles.hint}>
                    {pet.name} {pet.trickName} on command, chases {pet.toyName}{' '}
                    along the taskbar, and will come and find {pet.treatName}{' '}
                    wherever it lands. Out there you can also drag {pet.name}{' '}
                    around the screen, throw them, double-click for the trick,
                    or right-click for the lot.
                </p>
            </fieldset>

            <fieldset style={styles.group}>
                <legend style={styles.legend}>About {pet.name}</legend>
                <Row label="Adopted" value={`${humanAge(state.adoptedAt)} ago`} />
                <Row label="Times fed" value={String(state.totalFeedings)} />
                <Row label="Times patted" value={String(state.totalPets)} />
                <Row label="Tricks performed" value={String(state.totalTricks)} />
                <Row label="Games of fetch" value={String(state.totalGames)} />
                <Row label="Treats tossed" value={String(state.totalTreats)} />
                {state.totalAdoptions > 1 && (
                    <Row
                        label="Pets adopted in total"
                        value={String(state.totalAdoptions)}
                    />
                )}
            </fieldset>

            <Achievements />
            <Wardrobe pet={pet} />

            {state.hidden && (
                <button
                    type="button"
                    style={styles.switchButton}
                    onClick={() => unhidePet()}
                >
                    Bring {pet.name} back to the taskbar
                </button>
            )}

            <div style={styles.footerLinks}>
                <button
                    type="button"
                    style={styles.switchButton}
                    onClick={() => resetPetChoice()}
                >
                    Choose a different pet…
                </button>
                {!state.hidden && (
                    <button
                        type="button"
                        style={styles.switchButton}
                        onClick={() => hidePetForNow()}
                    >
                        Send {pet.name} away for now
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * The trophy cabinet.
 * -------------------
 * Twelve rows, nine of them visible from the start and three that read
 * "???" until they happen. The visible ones carry a progress bar, because a
 * checklist with no sense of how close you are is just a list of things you
 * have not done; the secret ones carry nothing, because a progress bar on a
 * secret is a spoiler with extra steps.
 *
 * The locked hints never state the number. "Ask for the trick. Then ask
 * again." is an invitation; "Perform 15 tricks" is a chore, and a portfolio
 * is not the place to hand somebody a chore.
 */
const Achievements: React.FC = () => {
    const achievements = useAchievementState();
    const rows = achievementRows(achievements);
    const earned = rows.filter((r) => r.unlocked).length;

    return (
        <fieldset style={styles.group}>
            <legend style={styles.legend}>
                Achievements ({earned}/{rows.length})
            </legend>
            <div style={styles.achievementList}>
                {rows.map((row) => {
                    const hidden = row.secret && !row.unlocked;
                    return (
                        <div key={row.id} style={styles.achievementRow}>
                            <span
                                style={{
                                    ...styles.achievementTick,
                                    ...(row.unlocked
                                        ? styles.achievementTickOn
                                        : null),
                                }}
                                aria-hidden="true"
                            >
                                {row.unlocked ? '\u2713' : ''}
                            </span>
                            <div style={styles.achievementText}>
                                <span
                                    style={{
                                        ...styles.achievementName,
                                        ...(row.unlocked
                                            ? null
                                            : styles.achievementNameLocked),
                                    }}
                                >
                                    {hidden ? 'Secret achievement' : row.name}
                                </span>
                                <span style={styles.achievementBlurb}>
                                    {row.unlocked ? row.blurb : row.hint}
                                </span>
                                {!row.unlocked && !row.secret && (
                                    <div style={styles.progressTrack}>
                                        <div
                                            style={{
                                                ...styles.progressFill,
                                                width: `${Math.round(
                                                    (row.current / row.goal) * 100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                )}
                                {row.unlocked && row.reward && (
                                    <span style={styles.rewardNote}>
                                        Unlocked: {ACCESSORIES[row.reward].name}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </fieldset>
    );
};

/**
 * The wardrobe and the size control.
 *
 * Both are here as well as on the creature's own right-click menu, because
 * the menu is only reachable if you already know the creature is clickable —
 * and half the people who open this window have never noticed it walking
 * about down there at all.
 */
const Wardrobe: React.FC<{ pet: PetDef }> = ({ pet }) => {
    const achievements = useAchievementState();
    const owned = unlockedAccessories();

    return (
        <fieldset style={styles.group}>
            <legend style={styles.legend}>Wardrobe</legend>
            {owned.length === 0 ? (
                <p style={styles.hint}>
                    Nothing yet. {pet.name} earns something to wear for most of
                    the achievements above — the first one is a bow tie, and it
                    only takes a single pat.
                </p>
            ) : (
                <div style={styles.actions}>
                    <button
                        type="button"
                        style={{
                            ...styles.actionButton,
                            ...(achievements.equipped
                                ? null
                                : styles.actionButtonActive),
                        }}
                        onClick={() => equipAccessory(null)}
                    >
                        Nothing
                    </button>
                    {owned.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            style={{
                                ...styles.actionButton,
                                ...(achievements.equipped === a.id
                                    ? styles.actionButtonActive
                                    : null),
                            }}
                            onClick={() => equipAccessory(a.id)}
                        >
                            {a.name}
                        </button>
                    ))}
                </div>
            )}

            <div style={styles.sizeRow}>
                <span style={styles.rowLabel}>
                    Size on the taskbar
                    <span style={styles.sizeValue}>
                        {Math.round(achievements.scale * 100)}%
                    </span>
                </span>
                <div style={styles.actions}>
                    <button
                        type="button"
                        style={styles.actionButton}
                        disabled={achievements.scale <= 0.4}
                        onClick={() => adjustScale(-SCALE_STEP)}
                    >
                        Shrink
                    </button>
                    <button
                        type="button"
                        style={styles.actionButton}
                        disabled={achievements.scale >= 2}
                        onClick={() => adjustScale(SCALE_STEP)}
                    >
                        Grow
                    </button>
                    <button
                        type="button"
                        style={styles.actionButton}
                        disabled={achievements.scale === 1}
                        onClick={() => resetScale()}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </fieldset>
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
            // Wider and taller than it was, because the dashboard now
            // carries a twelve-row achievement list and a wardrobe under the
            // original three panels. At 360 the achievement blurbs wrapped to
            // four lines each and the whole thing read as a wall.
            width={pet ? 408 : 540}
            height={pet ? 640 : 520}
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

    // ---- achievements and wardrobe ----
    achievementList: { flexDirection: 'column', gap: 7 },
    achievementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    /** The Win95 checkbox, sunk into the dialog the way a real one was. */
    achievementTick: {
        flexShrink: 0,
        width: 13,
        height: 13,
        marginTop: 1,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        boxShadow: `inset 1px 1px 0 ${Colors.black}`,
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: '11px',
        textAlign: 'center',
        color: Colors.black,
    },
    achievementTickOn: { color: '#0a5a14' },
    achievementText: { flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 },
    achievementName: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    /** Locked titles sit back a shade so the earned ones read as earned. */
    achievementNameLocked: { fontWeight: 'normal', color: '#4a4a4a' },
    achievementBlurb: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#3a3a3a',
    },
    rewardNote: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: '#0a5a14',
    },
    progressTrack: {
        marginTop: 2,
        height: 8,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    progressFill: {
        height: '100%',
        background: '#000080',
        minWidth: 0,
    },
    actionButtonActive: {
        borderColor: Colors.darkGray,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        fontWeight: 'bold',
    },
    sizeRow: {
        flexDirection: 'column',
        gap: 5,
        marginTop: 8,
    },
    sizeValue: {
        marginLeft: 6,
        fontWeight: 'bold',
    },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    hint: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#444',
        margin: 0,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    switchButton: {
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
