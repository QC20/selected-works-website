import React, { useState } from 'react';
import DesktopShortcut from '../os/DesktopShortcut';
import Window from '../os/Window';

export interface floatingSphereProps extends WindowAppProps {}

/**
 * What's actually rendering: the Thomas attractor, a strange attractor from
 * chaos theory — a particle following a simple set of differential equations
 * whose path never repeats and never settles, tracing the same kind of
 * intricate, non-repeating shape strange attractors are known for. Spacebar
 * switches to a different attractor, drag rotates it, scroll zooms.
 */
const EXPLAINER =
    "What you're looking at: the Thomas attractor — a strange attractor from chaos theory. " +
    "A point follows a simple set of equations, over and over, and never repeats or settles down; " +
    "tracing that path is what draws the shape. Spacebar switches attractors, drag rotates, scroll zooms.";

const floatingSphere: React.FC<floatingSphereProps> = (props) => {
    const [showInfo, setShowInfo] = useState(true);

    return (
        <Window
            top={20}
            left={20}
            width={600}
            height={400}
            windowBarIcon="computerSmall"
            windowTitle="Internet Explorer"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
        >
            <div className="site-page" style={{ flexDirection: 'column' }}>
                <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                    <iframe
                        src="https://qc20.github.io/Attractor/"
                        title="Interactive Attractor"
                        width="100%"
                        height="100%"
                    />
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
                        <DesktopShortcut
                            icon="computerBig"
                            invertText
                            shortcutName={'Computer Details'}
                            onOpen={() => {}}
                        />
                    </div>
                </div>
                {showInfo && (
                    <div
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            background: '#ffffe1',
                            borderTop: '1px solid #86898d',
                            fontSize: 11,
                        }}
                    >
                        <span style={{ flex: 1 }}>{EXPLAINER}</span>
                        <button
                            className="site-button"
                            style={{ flexShrink: 0 }}
                            onClick={() => setShowInfo(false)}
                        >
                            Got it
                        </button>
                    </div>
                )}
            </div>
        </Window>
    );
};



export default floatingSphere;
