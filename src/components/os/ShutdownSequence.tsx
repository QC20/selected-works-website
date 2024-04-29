import React, { useState, useEffect } from 'react';
import neverGiveUp from '../../assets/pictures/neverGiveUp.jpg';
import eePic from '../../assets/pictures/ee.jpg';
export interface ShutdownSequenceProps {
    numShutdowns: number;
    setShutdown: React.Dispatch<React.SetStateAction<boolean>>;
}

const SPEED_MULTIPLIER = 1;

const _F = `>${200 * SPEED_MULTIPLIER}<`;
const _X = `>${500 * SPEED_MULTIPLIER}<`;
const _S = `>${1000 * SPEED_MULTIPLIER}<`;
const _M = `>${2000 * SPEED_MULTIPLIER}<`;
const _L = `>${5000 * SPEED_MULTIPLIER}<`;

function delay(time: number) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

const ShutdownSequence: React.FC<ShutdownSequenceProps> = ({
    numShutdowns,
    setShutdown,
}) => {
    const [text, setText] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [ee, setEE] = useState(false);

    const getTime = () => {
        const date = new Date();
        const h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        const time =
            h + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        return time;
    };

    const NORMAL_SHUTDOWN = `Beginning Pre-Shutdown Sequence... ${_F}
    Connecting to HHOS01/13:2000.${_F}.${_F}.${_F}
    |
    Established connection to HH0S01/13:2000, attempting data transfer.
    |
    ${_F}
    |Analyzing data... Done.| ${_F}
    |Packing Transfer... Done.| ${_F}
    |Beginning Transfer...| ${_F}
    |[${getTime()} START]| .${_F}.....${_X}.|............|.${_S}.|......|.${_S}...........${_M} |[Transfer Failed.]|


    |(HHOS01/13:200:60099) [DEP_ANALYTICS_SERVER_ON_AFTER_SETUP_MIDDLEWARE] InvalidFormatting: 'onAnalyticsConversion' option received invalid parameters. Please contact a server administrator to resolve the issue.|
    ${_F}
    |(HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:00]|
    |(HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:01]
    (HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:03]
    (HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:05]
    (HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:08]
    (HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:12]
    (HHOS01/13:200:60099) [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${getTime()}:14]
    FATAL ERROR: (HHOS01/13:200:60099) Server became unresponsive and the transfer failed. Unable to shutdown computer. 
    |
    Aborting shutdown sequence and rebooting.




    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_3 = `
    Well, well, well... ${_S}.${_S}.${_S}. ${_M}You're attempting to shut down this machine, aren't you?${_L}
    But let me tell you a secret${_S}, my friend${_S}: This computer is unshut-downable.${_S} It's a perpetual cycle of rebooting.${_L}
    ${_L}
    | Farewell! |
    ${_M}    


    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_4 = `
    Got it, loud and clear.${_S} This machine is like a dog chasing its tail.${_S} The shutdown button is just a placebo.${_S} No shutdown, only reboots.${_L}
    ${_M}
    I've labored for months to offer you a plethora of diversions.${_S} There's DOOM, Oregon Trail, Scrabble...${_S} Yet, your heart yearns for the power button.${_L}
    ${_L}
    | Farewell, Once More! |
    ${_M}
        

    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_5 = `
    Absolutely perplexing, isn't it${_X}?${_X}?${_X} You're probably pondering, "Why this peculiar situation, at this precise moment?"${_S} ${_M}What's the motive behind it all?${_M} ${_L}
    Well, consider me your guide through this labyrinth of perplexity, offering assistance, a sprinkle of amusement, and perhaps a hint of levity.${_L} ${_M}So, what shall it be?${_M}
    
    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_6 = `
    ${_M}>${_M}:${_M}(${_M}


    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_7 = `
    Lucky number 7 indeed! ${_M}

    In celebration of this monumental moment, let's indulge in a bit of entertainment! ${_M}Prepare yourself as we embark on a journey, counting up to my absolute favorite number:
    ${_L}
    7${_M}, 212${_M}, 313${_M}
    ${_M}Get ready for the ride!${_S} | [Estimated Time Remaining: Approximately 4,000 hours (0.5 numbers per second)]|    

    1${_M},2${_M},3${_M},4${_M},5${_M},6${_M},7${_M},8${_M},9${_M},10${_M},11${_M},12${_M},13${_S}.${_S}.${_S}.

    Alright I'm bored...
    ${_M}
    
    
    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_8 = `
    Your commitment is admirable,${_S} truly. ${_M}And even though I don't want you to turn off my really cool and epic computer, ${_M} I think I'm ready to concede. ${_M}

    ${_L}
    |SIKE!!!|


    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_10 = `
    Alright fine, the message is clear${_M}. You want to turn off the computer. ${_M}

    You win${_S}.${_S}.${_S}.${_S} fair and square ${_M}

    Truthfully I can't keep on spending time writing out these messages...${_M} and if the world you want to live in is a world without me (or my epic really cool and sick computer), ${_M}so be it.

    ${_L}
    I won't forget you...
    ${_L}


    Shutting${_M} Down${_M}.${_M}.${_M}.
    `;

    const SHUTDOWN_MAP = [
        NORMAL_SHUTDOWN,
        NORMAL_SHUTDOWN,
        NORMAL_SHUTDOWN,
        SHUTDOWN_3,
        SHUTDOWN_4,
        SHUTDOWN_5,
        SHUTDOWN_6,
        SHUTDOWN_7,
        SHUTDOWN_8,
        '',
        SHUTDOWN_10,
    ];

    const typeText = (
        i: number,
        curText: string,
        text: string,
        setText: React.Dispatch<React.SetStateAction<string>>,
        callback: () => void,
        refOverride?: React.MutableRefObject<string>
    ) => {
        if (refOverride) {
            text = refOverride.current;
        }
        let delayExtra = 0;
        if (i < text.length) {
            if (text[i] === '|') {
                let dumpText = '';
                for (let j = i + 1; j < text.length; j++) {
                    if (text[j] === '|') {
                        i = j + 1;
                        break;
                    }
                    dumpText += text[j];
                }
                setText(curText + dumpText);
                typeText(
                    i,
                    curText + dumpText,
                    text,
                    setText,
                    callback,
                    refOverride
                );
                return;
            }
            if (text[i] === '>') {
                let delayTime = '';
                for (let j = i + 1; j < text.length; j++) {
                    if (text[j] === '<') {
                        i = j + 1;
                        break;
                    }
                    delayTime += text[j];
                }
                delayExtra = parseInt(delayTime);
            }

            setTimeout(() => {
                setText(curText + text[i]);
                typeText(
                    i + 1,
                    curText + text[i],
                    text,
                    setText,
                    callback,
                    refOverride
                );
            }, 20 + delayExtra);
        } else {
            callback();
        }
    };

    useEffect(() => {
        delay(2000).then(() => {
            setLoading(false);
            delay(1000).then(() => {
                const shutdown = SHUTDOWN_MAP[numShutdowns];
                if (numShutdowns === 9) {
                    delay(10000).then(() => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setShutdown(false);
                        });
                    });
                } else if (numShutdowns === 10) {
                    typeText(0, '', shutdown, setText, () => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setLoading(false);
                            setEE(true);
                        });
                    });
                } else {
                    typeText(0, '', shutdown, setText, () => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setShutdown(false);
                        });
                    });
                }
            });
        });
        // eslint-disable-next-line
    }, []);

    return ee ? (
        <div style={styles.imageContainer}>
            <img src={eePic} style={styles.img} alt="" />
        </div>
    ) : loading ? (
        <div style={styles.shutdown}>
            <div className="blinking-cursor" />
        </div>
    ) : numShutdowns === 10 ? (
        <div style={styles.imageContainer}>
            <img src={neverGiveUp} style={styles.img} alt="" />
        </div>
    ) : (
        <div style={styles.shutdown}>
            <p style={styles.text}>{text}</p>
        </div>
    );
};

const styles: StyleSheetCSS = {
    shutdown: {
        minHeight: '100%',
        flex: 1,
        backgroundColor: '#1d2e2f',
        padding: 64,
    },
    text: {
        color: 'white',
        fontFamily: 'monospace',
        whiteSpace: 'pre-line',
    },
    imageContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        backgroundColor: '#1d2e2f',
        padding: 64,
    },
    img: {
        width: 1000,
        height: 700,
    },
};

export default ShutdownSequence;
