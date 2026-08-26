import React, { useEffect, useState } from 'react';
import Window from '../os/Window';
import { useInterval } from 'usehooks-ts';
import { motion } from 'framer-motion';

export interface CreditsProps extends WindowAppProps {}

const CREDITS = [
    {
        title: 'Creation & Design',
        rows: [['Jonas Kjeldmand Jensen', '']],
    },
    {
        title: 'Sound Design',
        rows: [
            ['Sound Cassette', 'Office Ambience'],
            ['Windows 95 Startup Sound', 'Microsoft'],
        ],
    },
    {
        title: '3D Room ("Step Outside")',
        rows: [
            ['Henry Heffernan', 'Room & Models'],
            ['Used under MIT License', ''],
        ],
    },
    {
        title: 'Special Thanks',
        rows: [
            ['Bruno Simon', 'Henry Heffernan'],
            ['Dikra Ben Allel', 'Yute (Yuteoctober)'],
        ],
    },
    {
        title: 'Guestbook & Resolution Toggle',
        rows: [
            ['Yute (Yuteoctober)', 'Windows95 Portfolio'],
            ['Adapted under MIT License', ''],
        ],
    },
    {
        // The algorithms behind two of the accessories. Both are published
        // methods rather than borrowed code — implemented here from the
        // descriptions — but they are somebody's ideas and belong on this list.
        title: 'Algorithms & Methods',
        rows: [
            ['Thimbleby, Inglis & Witten', 'Stereogram algorithm, 1994'],
            ['J. Ridley Stroop', 'Colour-word interference, 1935'],
            ['F. C. Donders', 'Reaction time method, 1868'],
        ],
    },
    {
        title: 'Television Archive',
        rows: [
            ['The Internet Archive', 'archive.org'],
            ['Prelinger Archives', 'Computer Chronicles'],
        ],
    },
    {
        title: 'Inspiration',
        rows: [
            ['Bruno Simon', 'Jesse Zhou'],
            ['Pink Yellow', 'Henry Heffernan'],
            ['Antonin Picard']
        ],
    },
];

const Credits: React.FC<CreditsProps> = (props) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [time, setTime] = useState(0);

    // every 5 seconds, move to the next slide
    useInterval(() => {
        setTime(time + 1);
        // setCurrentSlide((currentSlide + 1) % CREDITS.length);
    }, 1000);

    useEffect(() => {
        if (time > 5) {
            setCurrentSlide((currentSlide + 1) % CREDITS.length);
            setTime(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [time]);

    const nextSlide = () => {
        setTime(0);
        setCurrentSlide((currentSlide + 1) % CREDITS.length);
    };

    return (
        // add on resize listener
        <Window
            top={48}
            left={48}
            width={1100}
            height={800}
            windowTitle="Credits"
            windowBarIcon="windowExplorerIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'© Copyright 2025 Jonas Kjeldmand Jensen'}
        >
            <div
                onMouseDown={nextSlide}
                className="site-page"
                style={styles.credits}
            >
                <h2>Credits</h2>
                <p>website-name, 2025</p>
                <br />
                <br />
                <br />
                <div style={styles.slideContainer}>
                    {
                        <motion.div
                            animate={{ opacity: 1, y: -20 }}
                            transition={{ duration: 0.5 }}
                            key={`section-${CREDITS[currentSlide].title}`}
                            style={styles.section}
                        >
                            <h3 style={styles.sectionTitle}>
                                {CREDITS[currentSlide].title}
                            </h3>
                            {CREDITS[currentSlide].rows.map((row, i) => {
                                return (
                                    <div key={`row-${i}`} style={styles.row}>
                                        <p>{row[0]}</p>
                                        <p>{row[1]}</p>
                                    </div>
                                );
                            })}
                        </motion.div>
                    }
                </div>
                <p>Click to continue...</p>
                <br />
                <div style={styles.nextSlideTimer}>
                    {/* make a time number of dots */}
                    {Array.from(Array(time)).map((i) => {
                        return (
                            <div key={i}>
                                <p>.</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    credits: {
        width: '100%',
        backgroundColor: 'black',
        paddingTop: 64,
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 64,
        color: 'white',
        overflow: 'hidden',
    },
    row: {
        overflow: 'none',
        justifyContent: 'space-between',
        flexDirection: 'row',
        width: 600,
        alignSelf: 'center',
    },
    section: {
        overflow: 'none',
        alignItems: 'center',
        flexDirection: 'column',
        marginBottom: 32,
        opacity: 0,
    },
    sectionTitle: {
        marginBottom: 32,
    },
    slideContainer: {
        width: '100%',
        height: '70%',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
    },
    nextSlideTimer: {
        width: 64,
        height: 32,
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
};

export default Credits;
