import React, { useState } from 'react';
// @ts-ignore
import house from '../../../assets/audio/agressive_phonk.mp3';
// @ts-ignore
//import SoundCafeSessions from '../../../assets/audio/NChainzSoundCafeSession.mp3';
import SoundCafeSessions from '../../../../src/assets/audio/TellThem.mp3';
// @ts-ignore
//import QuantumSessions from '../../../assets/audio/NChainsQuantumSession.mp3';
import QuantumSessions from '../../../../src/assets/audio/TellThem.mp3';
// @ts-ignore
import tellThem from '../../../../src/assets/audio/TellThem.mp3';
// @ts-ignore
import meDJing from '../../../assets/pictures/projects/art/MePlaying.mp4';
// @ts-ignore
import asciiMe from '../../../assets/audio/1-5mb.mp4';

import meDJing2 from '../../../../src/assets/pictures/meDJing2.jpg';
// @ts-ignore
import lifeJourney from '../../../assets/pictures/projects/art/lifes-journey.mp4';

import MusicNote from '../../../assets/icons/MusicNote.gif'
import cdSpin from '../../../assets/pictures/cdSpin.gif';

import { MusicPlayer } from '../../general';
import { styles } from '../../os/DragIndicator';
import LineSplit from '../LineSplit'
import ResumeDownload from '../ResumeDownload';
import VideoAsset from '../../general/VideoAsset';


import Window from '../../os/Window';

import shortcut from '../../../../src/assets/pictures/projects/audio/shortcut.gif'; 

export interface MusicProjectsProps {}

const MusicProjects: React.FC<MusicProjectsProps> = (props) => {
    const [currentSong, setCurrentSong] = useState<string>('');

    return (
        <div className="site-page-content">
            <h1>Arts & Design</h1>
            <h3>My creations</h3>
            <br />

            
            <div className="text-block">
                <p>
                    text goes here
                </p>
                <br />
            </div>
            <ResumeDownload />
            <br />
            <h2><img src={MusicNote} width="4%" ></img>{' '}My Musical Passions<img src={MusicNote} width="4%" ></img></h2>

            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, marginRight: 32 }}>
                    <p> 
                        Music has always been my passion. From the melodies to the lyrics, and from the intricate production techniques to the cultural impact it carries, 
                        every aspect has fascinated me. My journey began at the age of 15 when I purchased my first Technics 1210 turntables. 
                        <p>This marked the beginning of my 
                        fascination with physical media and my exploration into DJing, event planning, and hosting. By the time I was 19, I had joined the DJ collective, {' '}
                        <a
                                href='https://www.facebook.com/dubkultur'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    Dubkultur
                                </a>     
                        , and for roughly 5 years, we organized and performed at events across Copenhagen. This experience kept me constantly engaged with the latest sounds and 
                        developments in the music scene. It also sparked my interest in music production, as I sought to capture the raw, grassroots essence by creating, producing, 
                        publishing, and performing my own tracks. {' '}
                    </p></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                    <img src={meDJing2} style={{ width: '100%' }} alt="" /> 
                    </div>{/* Adjusted width */}
                    <p>
                        <sub>
                            <b>Image 2:</b> Me turning knobs at Bolsjefabrikken, Copenhagen. {' '}
                            <a
                                href='https://github.com/QC20/DIY-Arduino-Controller/tree/main/Code%20Examples'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    here.
                                </a>               
                        </sub>
                    </p>
                </div>

            </div>

            <p>
                Being immersed in music and sound not only brings me immense joy and thrills but also fosters invaluable friendships. It's like a journey filled with endless adventures! 
                Through this passion, I've delved into a multitude of digital audio workstations (DAWs), exploring the realms of {' '}
                    <a href="https://www.reasonstudios.com/" target="_blank" rel="noopener noreferrer">Reason</a>, {' '}
                    <a href="https://www.apple.com/logic-pro/" target="_blank" rel="noopener noreferrer">Logic</a>, and {' '}
                    <a href="https://www.ableton.com/" target="_blank" rel="noopener noreferrer">Ableton</a>. {' '}
                But it doesn't stop there – it's led me to experiment with visual art expressions and graphic design, expanding my creative horizons even further.
            </p>
            <p>
                From a young age, it's taught me the ins and outs of orchestrating unforgettable parties and managing a crew of activists, ensuring every event runs like a well-oiled machine. It's not just a hobby; it's a lifestyle that continuously shapes and enriches my journey.
            </p>

            <br />
            <p>
                As my musical taste takes many twists and turns, I prefer sharing the type of records I'm listening to rather than naming specific genres. 
            If you're interested, feel free to have a look at my {' '}
                    <a
                    href='https://www.discogs.com/user/JonasKjeldmand/collection'
                    target='_blank'
                    rel='noopener noreferrer'>
                    Discogs record collection
                    </a>   
                    .{' '}
            </p>
            <br />

            <MusicPlayer
                src={tellThem}
                title="Tell Them - N-Chainz (formerly Proactive Selektor)"
                subtitle="135 BPM Bass Music - An old track of mine from back in 2014"
                currentSong={currentSong}
                setCurrentSong={setCurrentSong}
            />

            <br />
            <br />
            
            <br />
            <h2>Recorded Mixes {' '} <img src={cdSpin} width="4%" ></img></h2>
            <br />
            <p>
            Besides spinning tunes and creating beats, I still make appearances on stage from time to time, 
            although not as frequently as before. But don't worry, I've prepared something special just for you. {' '}
            </p>
            <p>
                Imagine this: recent live mixes, carefully recorded for your enjoyment. Some are pure vinyl, while others blend analog and digital sounds. 
                It's a glimpse into what drives me, and it's all here waiting for you. {' '}
            </p>
            <br />
            <MusicPlayer
                src={QuantumSessions}
                title="N-Chainz Live DJ Set @ Quantum II"
                subtitle="Recorded Live 25.02.2022 - [Dubstep | UK Garage | Footwork | Drum & Bass]"
                currentSong={currentSong}
                setCurrentSong={setCurrentSong}
            />
            <br />
            <MusicPlayer
                src={SoundCafeSessions}
                title="N-Chainz Live Vinyl DJ Set @ Soundtrack Cafe"
                subtitle="Recorded Live 24.11.2023 - [140 Bass Music]"
                currentSong={currentSong}
                setCurrentSong={setCurrentSong}
            />
            <br />
            <div className="captioned-image" style={{ width: '90%' }}>
                <VideoAsset src={meDJing} />
                <p style={styles.caption}>
                    <sub>
                        <b>
                            Image 1: {' '}
                        </b> 
                        Me spinning records at Soundtrack Cafe. Watch the entire recording {' '}
                            <a
                                href='https://www.youtube.com/watch?v=I8lCJ542q6s&t'
                                target='_blank'
                                rel='noopener noreferrer'>
                                here.
                            </a> 
                    </sub>
                </p>
            </div>
            <p>
                Being immersed in music and sound not only brings me immense joy and thrills but also fosters invaluable friendships. It's like a journey filled with endless adventures! 
                Through this passion, I've delved into a multitude of digital audio workstations (DAWs), exploring the realms of {' '}
                    <a href="https://www.reasonstudios.com/" target="_blank" rel="noopener noreferrer">Reason</a>, {' '}
                    <a href="https://www.apple.com/logic-pro/" target="_blank" rel="noopener noreferrer">Logic</a>, and {' '}
                    <a href="https://www.ableton.com/" target="_blank" rel="noopener noreferrer">Ableton</a>. {' '}
                But it doesn't stop there – it's led me to experiment with visual art expressions and graphic design, expanding my creative horizons even further.
            </p>
            <p>
                From a young age, it's taught me the ins and outs of orchestrating unforgettable parties and managing a crew of activists, ensuring every event runs like a well-oiled machine. It's not just a hobby; it's a lifestyle that continuously shapes and enriches my journey.
            </p>

            <br />
            <LineSplit />
            <br />
    
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
    
                {' '}
                Interactive ASCII Visionarium
                {' '}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                <div style={{ flex: 1, marginLeft: 32 }}>
                    <p> 
                    AsciiVision is a captivating creative coding venture that blends human-computer interaction with artistic flair. By tapping into your 
                    device's webcam via the Camera API, AsciiVision seamlessly bridges the gap between the tangible and the digital realms. 
                    Using JavaScript wizardry, it transforms each pixel's luminosity into a unique ASCII character, providing a dynamic interpretation 
                    of the live video feed. This fusion of human-computer interactivity and creative coding delivers an immersive and exhilarating journey 
                    for users. You can even invert the colors{' '}. 
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '-82px' }}>
                    <div style={{ textAlign: 'center', width: '85%', marginLeft: '-75px' }}>
                        <VideoAsset src={asciiMe} /> 
                    </div>
                    
                </div>
                
            </div>
            <br />
            <h3>Link to Project:</h3>
            <ul>
                <li>
                    <p>
                        <a 
                            rel="noreferrer" 
                            target="_blank"
                            href="https://github.com/QC20/AsciiVision"
                            >
                            <p>
                                <b>
                                    Github repo
                                </b>
                                {' '} - go check out the code base to learn more! {' '}
                            </p>
                        </a>
                    </p>
                </li>
            </ul>
            <LineSplit />

            <br />
    
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
    
                {' '}
                Life's a Journey - Interactive Vizualization
                {' '}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                <div style={{ flex: 1, marginLeft: 32 }}>
                    <p> 
                        Life's Journey is a small interactive game inspired by the original Game of Life. Step into a mesmerizing world where you can shape and witness the unfolding of 
                        life itself. Immerse yourself in the captivating gameplay and experience the beauty of emergent patterns. {' '}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '-82px' }}>
                    <div style={{ textAlign: 'center', width: '85%', marginLeft: '-75px' }}>
                        <VideoAsset src={lifeJourney} /> 
                    </div>
                    
                </div>
                <p>
                Immerse yourself in the captivating gameplay and experience the magic of cellular automata, revealing emergent patterns that mesmerize and inspire. 
                Engage with dynamic landscapes and explore infinite possibilities, all powered by p5.js for a truly immersive visual experience. {' '}
                </p>
            </div>
            <br />
            <h3>Link to Project:</h3>
            <ul>
                <li>
                    <p>
                        <a 
                            rel="noreferrer" 
                            target="_blank"
                            href="https://github.com/QC20/game-of-life-simulation"
                            >
                            <p>
                                <b>
                                    Github repo
                                </b>
                                {' '} - go check out the code base to learn more! {' '}
                            </p>
                        </a>
                    </p>
                </li>
            </ul>

            <LineSplit />

        </div>
    );
};


// const styles: StyleSheetCSS = {};

export default MusicProjects;



