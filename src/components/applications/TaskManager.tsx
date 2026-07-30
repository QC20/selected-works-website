import React, { useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';

/**
 * Task Manager — My Computer > Hard Disk (D:) > Utility.
 *
 * The Windows 95 "Close Program" box: every open window listed, with End Task,
 * Shut Down and Cancel underneath. This is the equivalent of the Task Manager in
 * Yute's Utility folder, wired to this desktop's own window list rather than
 * faking one — the rows are the windows you actually have open, and End Task
 * closes the selected one for real.
 */

export interface Task {
    key: string;
    name: string;
    icon: IconName;
    minimized: boolean;
}

export interface TaskManagerProps extends WindowAppProps {
    tasks: Task[];
    /** Closes a window by its key. */
    endTask: (key: string) => void;
    /** Start -> Shut down, from here. */
    shutdown: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
    tasks,
    endTask,
    shutdown,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [selected, setSelected] = useState<string | null>(null);

    // A task that gets closed elsewhere shouldn't stay selected here.
    const selectedTask = tasks.find((t) => t.key === selected) || null;

    return (
        <Window
            top={130}
            left={220}
            width={400}
            height={390}
            windowTitle="Close Program"
            windowBarIcon="taskManagerIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={`${tasks.length} task${
                tasks.length === 1 ? '' : 's'
            } running`}
        >
            <div style={styles.container}>
                <div style={styles.list}>
                    {tasks.length === 0 ? (
                        <p style={styles.empty}>No programs are running.</p>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.key}
                                style={Object.assign(
                                    {},
                                    styles.row,
                                    selected === task.key && styles.rowSelected
                                )}
                                onClick={() => setSelected(task.key)}
                                onDoubleClick={() => {
                                    endTask(task.key);
                                    setSelected(null);
                                }}
                            >
                                <Icon icon={task.icon} size={16} />
                                <span style={styles.rowName}>
                                    {task.name}
                                    {task.minimized ? ' (minimized)' : ''}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <p style={styles.warning}>
                    WARNING: Pressing CTRL+ALT+DEL again will restart your
                    computer. You will lose unsaved information in all programs
                    that are running.
                </p>

                <div style={styles.buttons}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !selectedTask && styles.buttonDisabled
                        )}
                        disabled={!selectedTask}
                        onClick={() => {
                            if (!selectedTask) return;
                            endTask(selectedTask.key);
                            setSelected(null);
                        }}
                    >
                        End Task
                    </button>
                    <button style={styles.button} onClick={shutdown}>
                        Shut Down
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Cancel
                    </button>
                </div>
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
        // Without this the padding is added *outside* the 100% height, so the
        // container ends up taller than the window and the buttons get clipped.
        boxSizing: 'border-box',
        gap: 8,
        padding: 10,
        background: Colors.lightGray,
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
        gap: 6,
        padding: '3px 6px',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
        color: Colors.black,
    },
    rowSelected: {
        background: Colors.blue,
        color: Colors.white,
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
    empty: {
        padding: 10,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    warning: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        lineHeight: 1.5,
        flexShrink: 0,
    },
    buttons: {
        justifyContent: 'flex-end',
        gap: 6,
        flexShrink: 0,
    },
    button: {
        width: 90,
        padding: '4px 0',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        flexShrink: 0,
        justifyContent: 'center',
    },
    buttonDisabled: {
        color: Colors.darkGray,
        cursor: 'default',
    },
};

export default TaskManager;
