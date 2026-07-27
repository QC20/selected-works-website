import React, { useState } from 'react';
import Colors from '../../constants/colors';

export interface AboutProps {
    onInteract?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
}

const About: React.FC<AboutProps> = ({ onInteract, onClose, onMinimize }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'technology' | 'hobby'>('general');

    // TODO: Change these to your actual information
    const bioData = {
        general: {
            title: 'General Information',
            content: (
                <>
                    <p>
                        <strong>Name:</strong> Jonas Kjeldmand
                    </p>
                    <p>
                        <strong>Title:</strong> Full Stack Developer & Creative Technologist
                    </p>
                    <p>
                        <strong>Location:</strong> Copenhagen, Denmark
                    </p>
                    <p>
                        <strong>Email:</strong> jokje@dtu.dk
                    </p>
                    <p>
                        <strong>Status:</strong> Open to new opportunities
                    </p>
                    <p style={{ marginTop: 12 }}>
                        Building innovative web experiences and exploring the intersection of
                        technology and creativity. Passionate about creating immersive digital
                        environments and solving complex technical challenges.
                    </p>
                </>
            ),
        },
        technology: {
            title: 'Technology & Skills',
            content: (
                <>
                    <p>
                        <strong>Frontend:</strong> React, TypeScript, Three.js, Tailwind CSS, Framer
                        Motion
                    </p>
                    <p>
                        <strong>Backend:</strong> Node.js, Express, MongoDB, PostgreSQL
                    </p>
                    <p>
                        <strong>3D & Graphics:</strong> Three.js, Babylon.js, WebGL, GLSL
                    </p>
                    <p>
                        <strong>Tools:</strong> Git, Docker, Webpack, Vite, VS Code
                    </p>
                    <p style={{ marginTop: 12 }}>
                        I specialize in creating interactive 3D experiences and full-stack web
                        applications. I'm experienced with modern JavaScript frameworks and enjoy
                        pushing the boundaries of what's possible in the browser.
                    </p>
                </>
            ),
        },
        hobby: {
            title: 'Hobbies & Interests',
            content: (
                <>
                    <p>
                        <strong>Creative Projects:</strong> Digital art, generative design, music
                        production
                    </p>
                    <p>
                        <strong>Gaming:</strong> Exploring indie games, game design, interactive
                        storytelling
                    </p>
                    <p>
                        <strong>Outdoor Activities:</strong> Hiking, photography, urban exploration
                    </p>
                    <p>
                        <strong>Learning:</strong> Always exploring new technologies and creative
                        tools
                    </p>
                    <p style={{ marginTop: 12 }}>
                        I believe in the power of technology to create meaningful experiences.
                        Whether it's through code, art, or music, I'm constantly experimenting
                        with new ways to express ideas and connect with others.
                    </p>
                </>
            ),
        },
    };

    const styles: StyleSheetCSS = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 12,
        },
        tabContainer: {
            display: 'flex',
            borderBottom: `1px solid ${Colors.darkGray}`,
            background: Colors.lightGray,
            paddingLeft: 4,
        },
        tab: {
            padding: '6px 16px',
            cursor: 'pointer',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            userSelect: 'none' as const,
            transition: 'background 0.1s',
        },
        activeTab: {
            background: Colors.white,
            borderBottomColor: Colors.white,
        },
        contentArea: {
            flex: 1,
            overflow: 'auto',
            padding: 16,
            background: Colors.white,
            color: Colors.black,
        },
        content: {
            lineHeight: 1.6,
            maxWidth: '100%',
        },
        paragraph: {
            margin: '8px 0',
            fontSize: 11,
        },
        buttonGroup: {
            display: 'flex',
            gap: 8,
            padding: 12,
            justifyContent: 'flex-end',
            background: Colors.lightGray,
            borderTop: `1px solid ${Colors.darkGray}`,
        },
        button: {
            padding: '4px 12px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            cursor: 'pointer',
            minWidth: 60,
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.tabContainer}>
                {['general', 'technology', 'hobby'].map((tab) => (
                    <div
                        key={tab}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab ? styles.activeTab : {}),
                        }}
                        onClick={() => setActiveTab(tab as 'general' | 'technology' | 'hobby')}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </div>
                ))}
            </div>

            <div style={styles.contentArea}>
                <div style={styles.content}>
                    {bioData[activeTab].content}
                </div>
            </div>

            <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={onClose}>
                    OK
                </button>
                <button style={styles.button} onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default About;
