import React, { useMemo, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import {
    STORE_APPS,
    StoreApp,
    installAll,
    setInstalled,
    useInstalledApps,
} from '../os/installedApps';

/**
 * Add/Remove Programs.
 *
 * Windows 95's own applet was a list box, a description underneath and one
 * button that changed its label depending on what was selected — so that's what
 * this is, rather than a modern app store with cards. Selecting an app shows
 * what it is; the button installs it or removes it.
 *
 * "Remove" only takes the icon off the desktop (see `installedApps.ts`); the
 * program is still there and still opens from Run. The status line says so,
 * because a visitor who removes Doom and can't work out how to get it back has
 * been given a worse desktop, not a more personal one.
 */

export interface StoreProps extends WindowAppProps {
    /** Icons come from the APPLICATIONS map, so the desktop stays the source. */
    iconFor: (key: string) => IconName;
    /** Keys to leave out — Step Outside, inside the 3D monitor. */
    hiddenKeys?: string[];
}

const Store: React.FC<StoreProps> = ({
    iconFor,
    hiddenKeys = [],
    onInteract,
    onClose,
    onMinimize,
}) => {
    const isInstalled = useInstalledApps();
    const apps = useMemo(
        () => STORE_APPS.filter((a) => !hiddenKeys.includes(a.key)),
        [hiddenKeys]
    );
    const [selectedKey, setSelectedKey] = useState<string | null>(
        apps[0]?.key ?? null
    );

    const selected: StoreApp | null =
        apps.find((a) => a.key === selectedKey) || null;
    const selectedInstalled = selected ? isInstalled(selected.key) : false;

    const installedCount = apps.filter((a) => isInstalled(a.key)).length;
    const anyRemoved = installedCount < apps.length;

    const formatSize = (kb: number) =>
        kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`;

    return (
        <Window
            top={70}
            left={140}
            width={480}
            height={430}
            windowTitle="Store — Add/Remove Programs"
            windowBarIcon="storeIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={`${installedCount} of ${apps.length} installed`}
        >
            <div style={styles.container}>
                <p style={styles.intro}>
                    The following software can be installed on this desktop.
                    Select a program and choose Add or Remove.
                </p>

                <div style={styles.list}>
                    {apps.map((app) => {
                        const installed = isInstalled(app.key);
                        const isSelected = selectedKey === app.key;
                        return (
                            <div
                                key={app.key}
                                style={Object.assign(
                                    {},
                                    styles.row,
                                    isSelected && styles.rowSelected
                                )}
                                onPointerDown={() => setSelectedKey(app.key)}
                                onDoubleClick={() =>
                                    setInstalled(app.key, !installed)
                                }
                            >
                                <Icon
                                    icon={iconFor(app.key)}
                                    style={styles.rowIcon}
                                />
                                <span style={styles.rowName}>{app.name}</span>
                                <span style={styles.rowCategory}>
                                    {app.category}
                                </span>
                                <span style={styles.rowSize}>
                                    {formatSize(app.size)}
                                </span>
                                <span
                                    style={Object.assign(
                                        {},
                                        styles.rowState,
                                        !installed && styles.rowStateOff
                                    )}
                                >
                                    {installed ? 'Installed' : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* The description box, exactly where the real applet had it. */}
                <div style={styles.detail}>
                    {selected ? (
                        <>
                            <p style={styles.detailName}>{selected.name}</p>
                            <p style={styles.detailBlurb}>{selected.blurb}</p>
                        </>
                    ) : (
                        <p style={styles.detailBlurb}>
                            Select a program from the list above.
                        </p>
                    )}
                </div>

                <div style={styles.buttons}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !anyRemoved && styles.buttonDisabled
                        )}
                        onClick={installAll}
                        disabled={!anyRemoved}
                        title="Put every program back on the desktop"
                    >
                        Restore All
                    </button>
                    <div style={styles.spacer} />
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !selected && styles.buttonDisabled
                        )}
                        onClick={() =>
                            selected &&
                            setInstalled(selected.key, !selectedInstalled)
                        }
                        disabled={!selected}
                    >
                        {selectedInstalled ? 'Remove' : 'Add'}
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Close
                    </button>
                </div>

                <p style={styles.note}>
                    Removing a program only takes its icon off the desktop. It
                    stays on the disk — Start &gt; Run still opens it by name.
                </p>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        gap: 8,
        padding: 10,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    intro: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.4,
        flexShrink: 0,
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    row: {
        alignItems: 'center',
        gap: 8,
        padding: '3px 6px',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
        color: Colors.black,
        touchAction: 'manipulation',
    },
    rowSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    rowIcon: {
        width: 16,
        height: 16,
        objectFit: 'contain',
        flexShrink: 0,
    },
    rowName: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    rowCategory: {
        width: 78,
        fontFamily: 'MSSerif',
        fontSize: 10,
        flexShrink: 0,
    },
    rowSize: {
        width: 56,
        fontFamily: 'MSSerif',
        fontSize: 10,
        textAlign: 'right',
        flexShrink: 0,
    },
    rowState: {
        width: 56,
        fontFamily: 'MSSerif',
        fontSize: 10,
        textAlign: 'right',
        flexShrink: 0,
    },
    rowStateOff: {
        opacity: 0.5,
    },
    detail: {
        flexDirection: 'column',
        gap: 3,
        height: 54,
        padding: '6px 8px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    detailName: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    detailBlurb: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        lineHeight: 1.4,
    },
    buttons: {
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    spacer: {
        flex: 1,
    },
    button: {
        minWidth: 76,
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
    buttonDisabled: {
        opacity: 0.45,
        cursor: 'default',
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.4,
        flexShrink: 0,
    },
};

export default Store;
