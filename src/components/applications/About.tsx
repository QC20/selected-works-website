import React, { useState } from 'react';
import Colors from '../../constants/colors';

export interface AboutProps {
    onInteract?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
}

const About: React.FC<AboutProps> = ({ onInteract, onClose, onMinimize }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'technology' | 'hobby'>('general');

    // TODO: Customize these sections with your actual information
    const bioData = {
        general: {
            content: (
                <>
                    <p>
                        <strong>Objective:</strong>
                    </p>
                    <p style={{ marginLeft: 16, marginBottom: 12 }}>
                        Building innovative web experiences and exploring the intersection of
                        technology and creativity.
                    </p>

                    <p>
                        <strong>Information:</strong>
                    </p>
                    <p style={{ marginLeft: 16 }}>Jonas Kjeldmand</p>
                    <p style={{ marginLeft: 16 }}>Full Stack Developer & Creative Technologist</p>
                    <p style={{ marginLeft: 16, marginBottom: 12 }}>jokje@dtu.dk</p>

                    <p>
                        <strong>Location:</strong>
                    </p>
                    <p style={{ marginLeft: 16 }}>Copenhagen, Denmark</p>
                    <p style={{ marginLeft: 16 }}>Open to opportunities</p>
                    <p style={{ marginLeft: 16 }}>On Site / Remote / Hybrid</p>
                </>
            ),
        },
        technology: {
            content: (
                <>
                    <p>
                        I primarily use <strong>React</strong> and <strong>TypeScript</strong> to
                        create user-friendly interfaces, often incorporating{' '}
                        <strong>Tailwind CSS</strong> for styling.
                    </p>
                    <p>
                        I've developed full-stack projects with <strong>Node.js</strong>,{' '}
                        <strong>Express</strong>, <strong>MongoDB</strong> and{' '}
                        <strong>PostgreSQL</strong>, bringing together frontend and backend for
                        seamless applications.
                    </p>
                    <p>
                        <strong>3D & Graphics:</strong> Three.js, Babylon.js, WebGL, GLSL
                    </p>
                    <p>
                        <strong>Tools:</strong> Git, Docker, Webpack, Vite, VS Code
                    </p>
                    <p style={{ marginTop: 12 }}>
                        I specialize in creating interactive 3D experiences and exploring the
                        creative possibilities of modern web technologies.
                    </p>
                </>
            ),
        },
        hobby: {
            content: (
                <>
                    <p>
                        In my free time, I love exploring creative projects including digital
                        art, generative design, and music production.
                    </p>
                    <p>
                        I'm passionate about gaming, game design, and interactive storytelling.
                        When I'm not at the computer, I enjoy hiking, photography, and urban
                        exploration.
                    </p>
                    <p>
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
            fontSize: 11,
        },
        tabContainer: {
            display: 'flex',
            gap: 2,
            background: Colors.lightGray,
            padding: '4px 4px 0 4px',
        },
        tab: {
            padding: '4px 16px',
            cursor: 'pointer',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            userSelect: 'none' as const,
            color: Colors.black,
        },
        activeTab: {
            background: Colors.white,
            borderBottomColor: Colors.white,
            borderBottom: `1px solid ${Colors.white}`,
        },
        contentArea: {
            flex: 1,
            overflow: 'auto',
            padding: '12px 16px',
            background: Colors.white,
            color: Colors.black,
            fontSize: 11,
            lineHeight: '1.6',
        },
        content: {
            maxWidth: '100%',
        },
        paragraph: {
            margin: '8px 0',
            fontSize: 11,
        },
        buttonGroup: {
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            justifyContent: 'flex-end',
            background: Colors.lightGray,
            borderTop: `1px solid ${Colors.darkGray}`,
        },
        button: {
            padding: '4px 16px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            cursor: 'pointer',
            minWidth: 50,
            textAlign: 'center' as const,
        },
    };

    return (
        <div style={styles.container}>
            {/* Tab Bar */}
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
                        {tab === 'general' && 'General'}
                        {tab === 'technology' && 'Technology'}
                        {tab === 'hobby' && 'Hobby'}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div style={styles.contentArea}>
                <div style={styles.content}>{bioData[activeTab].content}</div>
            </div>

            {/* Button Bar */}
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
