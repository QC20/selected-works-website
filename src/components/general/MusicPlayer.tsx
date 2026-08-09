import React, { useState, useRef, useEffect } from 'react';
import PlayIcon from '../../assets/icons/play.png';
import PauseIcon from '../../assets/icons/pause.png';
import RewindIcon from '../../assets/icons/rewind.png';
import ForwardIcon from '../../assets/icons/forward.png';
import CDIcon from '../../assets/icons/cd.png';
import colors from '../../constants/colors';

import { motion, Variants } from 'framer-motion';

export interface MusicPlayerProps {
    src: string;
    title: string;
    subtitle: string;
    currentSong: string;
    setCurrentSong: React.Dispatch<React.SetStateAction<string>>;
}

const MusicPlayer: React.FC<MusicPlayerProps> = (props) => {
    const [isPlaying, setIsPlaying] = useState(false);
    // No element until something actually asks to hear this track — these are
    // DJ sets in the tens of megabytes, and this page has four of them. The
    // old code called `new Audio(props.src)` for all four the moment the page
    // rendered, which starts every browser fetching and buffering right away;
    // on iOS that reliably ran into the platform's limit on how many decoded
    // media elements can be alive at once, and later players would go silent
    // for reasons that had nothing to do with which button was pressed.
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(1);

    /** Builds the element on first use and wires up the one listener it needs. */
    const getAudio = () => {
        if (audioRef.current) return audioRef.current;
        const audio = new Audio(props.src);
        audio.preload = 'none';
        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration);
            if (audio.currentTime === audio.duration) {
                setIsPlaying(false);
            }
        });
        audioRef.current = audio;
        return audio;
    };

    /** Fully lets go of the element rather than just pausing it, so switching
     * to a different track actually frees the megabytes this one had buffered
     * — not just silences them. */
    const releaseAudio = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audioRef.current = null;
        setCurrentTime(0);
        setDuration(1);
    };

    // fast fowrad 15 seconds
    const fastForward = () => {
        getAudio().currentTime += 15;
    };

    // fast rewind to start of song
    const fastRewind = () => {
        getAudio().currentTime -= 15;
    };

    const togglePlay = () => {
        if (isPlaying) {
            // setCdState(CDState.easeIn);
            setIsPlaying(false);
        } else {
            // setCdState(CDState.easeOut);
            setIsPlaying(true);
            props.setCurrentSong(props.title);
        }
    };

    useEffect(() => {
        if (props.currentSong === props.title) {
            getAudio().play();
            setIsPlaying(true);
        } else {
            releaseAudio();
            setIsPlaying(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.currentSong, props.title]);

    // format current time
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time - minutes * 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.play();
        else audioRef.current.pause();
    }, [isPlaying]);

    useEffect(() => {
        return () => releaseAudio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            style={styles.musicPlayerContainer}
            className="music-controller-container "
        >
            <div style={styles.playerStart}>
                <div>
                    <motion.img
                        variants={vars}
                        animate={isPlaying ? 'play' : 'pause'}
                        src={CDIcon}
                        style={styles.cd}
                        onMouseDown={togglePlay}
                        alt=""
                    />
                </div>
            </div>
            <div style={styles.playerInfo}>
                <div style={styles.progressContainer}>
                    <p style={styles.time}>
                        <b>{formatTime(currentTime)}</b>
                    </p>

                    <div style={styles.progressBarContainer}>
                        <div
                            style={Object.assign({}, styles.progress, {
                                // transform scaleX = currentTime / duration
                                transform: `scaleX(${currentTime / duration})`,
                            })}
                        />
                    </div>
                    <p style={styles.time}>
                        <b>{duration === 1 ? '..:..' : formatTime(duration)}</b>
                    </p>
                </div>
                <div style={styles.playerBottom}>
                    <div style={styles.info}>
                        <h3>{props.title}</h3>
                        <p>{props.subtitle}</p>
                    </div>
                    <div style={styles.playerControls}>
                        <div
                            style={styles.controlButton}
                            className="site-button"
                            onMouseDown={fastRewind}
                        >
                            <img
                                src={RewindIcon}
                                style={styles.controlIcon}
                                alt=""
                            />
                        </div>
                        <div
                            style={styles.controlButton}
                            className="site-button"
                            onMouseDown={togglePlay}
                        >
                            <img
                                src={isPlaying ? PauseIcon : PlayIcon}
                                style={styles.controlIcon}
                                alt=""
                            />
                        </div>
                        <div
                            style={styles.controlButton}
                            className="site-button"
                            onMouseDown={fastForward}
                        >
                            <img
                                src={ForwardIcon}
                                style={styles.controlIcon}
                                alt=""
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const vars: Variants = {
    play: {
        rotate: 360,
        transition: { repeat: Infinity, duration: 0.9, ease: 'linear' },
    },
    pause: {
        rotate: -360,
        transition: {
            duration: 0.6,
            ease: 'easeOut',
        },
    },
};

const styles: StyleSheetCSS = {
    musicPlayerContainer: {
        flexDirection: 'row',
        width: '100%',
        borderRadius: 4,
    },
    playerControls: {
        justifyContent: 'center',
        alignItems: 'center',
        background: 'red',
    },
    progress: {
        width: '100%',
        transform: `scaleX(0)`,
        height: 6,
        background: colors.black,
        transformOrigin: 'left',
    },
    progressBarContainer: {
        width: '100%',
        height: 6,
        background: colors.lightGray,
        marginLeft: 8,
        marginRight: 8,
    },
    progressContainer: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
    },
    playerInfo: {
        flex: 1,
        overflow: 'hidden',
        border: `1px solid ${colors.darkGray}`,
        borderTopWidth: 0,
        flexDirection: 'column',
        borderBottomWidth: 0,
        padding: 16,
        paddingTop: 18,
    },
    info: {
        flexDirection: 'column',
    },
    playerBottom: {
        paddingTop: 2,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerStart: {
        flexShrink: 1,

        justifyContent: 'center',
        alignItems: 'center',
        width: 96,
    },
    controlButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlIcon: {
        width: 20,
        height: 20,
    },
    time: {
        fontSize: 14,
    },
    cd: {
        width: 56,
        height: 56,
        cursor: 'pointer',
    },
};

export default MusicPlayer;
