import React, { useState } from 'react';
// @ts-ignore
import house from '../../../assets/audio/agressive_phonk.mp3';
// @ts-ignore
//import SoundCafeSessions from '../../../assets/audio/NChainzSoundCafeSession.mp3';
import SoundCafeSessions from '../../../../src/assets/audio/NChainzSoundCafeSession.mp3';
// @ts-ignore
//import QuantumSessions from '../../../assets/audio/NChainsQuantumSession.mp3';
import QuantumSessions from '../../../../src/assets/audio/NChainsQuantumSession.mp3';
// @ts-ignore
import ByensRadioMix from '../../../../src/assets/audio/ProaktiveSelektorByensRadioradiorip.mp3';
// @ts-ignore
import tellThem from '../../../../src/assets/audio/TellThem.mp3';
// @ts-ignore
import meDJing from '../../../assets/pictures/projects/art/MePlaying.mp4';
// @ts-ignore
import MinenParty from '../../../../src/assets/pictures/2014-11-09-01-37.mp4';
// @ts-ignore
import asciiMe from '../../../assets/audio/1-5mb.mp4';

import meDJing2 from '../../../../src/assets/pictures/meDJing2.jpg';
// @ts-ignore
import lifeJourney from '../../../assets/pictures/projects/art/lifes-journey.mp4';

import MusicNote from '../../../assets/icons/MusicNote.gif'
import cdSpin from '../../../assets/pictures/cdSpin.gif';

import { Link, MusicPlayer } from '../../general';
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
                I have dedicated this section to my artistic endeavors, where I explore the realms of music, sound, and visual arts. I am deeply engrossed 
                in having artistic outlets, whether they are analog or digital. I don't want to limit myself to any one canvas. This perspective has 
                inspired me to explore a variety of mediums. For instance, I deeply appreciate the tactile experience and rich color spectrum achievable 
                through oil painting, as well as the flexibility of the medium. I can leave my painting for three days, and when I resume working on it, 
                it's as if I was never away. {' '}
                </p>
                <p>
                Similarly, the computer screen presents itself as the canvas we might spend the most time looking at in our lives. Therefore, 
                experimenting with this medium is a natural progression, especially because it allows for entirely new ways of incorporating 
                interactive elements and exploring the realm of interaction design. {' '}
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
                        every aspect fascinates me. My journey began at the age of 15 when I purchased my first set of {' '}
                        <a
                                href='https://www.technics.com/global/home/sl1200.html'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    Technics 1210
                                </a>      
                                {' '}turntables. 
                        <p>
                            This marked the beginning of my 
                            fascination with physical media and my exploration into DJing, music production, and exhibiting it to people at venues. By the time I was 19, I had joined the DJ collective, {' '}
                        <a
                                href='https://www.facebook.com/dubkultur'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    Dubkultur
                                </a>     
                        , and for about 5 years, we organized and performed at events across Copenhagen. This experience kept me constantly engaged with the latest sounds and 
                        developments in the music scene. It also sparked my interest in music production, as I sought to capture the raw, DIY essence by creating, producing, 
                        publishing, and performing my own tracks. {' '}
                    </p></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                    <img src={meDJing2} style={{ width: '100%' }} alt="" /> 
                    </div>{/* Adjusted width */}
                    <p>
                        <sub>
                            <b>Image 1:</b> Me turning knobs at Bolsjefabrikken, Copenhagen. {' '}          
                        </sub>
                    </p>
                </div>

            </div>

            <p>
            Music and sound immerse me in joy and thrills.
                Through this passion, I've delved into a multitude of digital audio workstations (DAWs), exploring the realms of {' '}
                    <a href="https://www.reasonstudios.com/" target="_blank" rel="noopener noreferrer">Reason</a>, {' '}
                    <a href="https://www.apple.com/logic-pro/" target="_blank" rel="noopener noreferrer">Logic</a>, and {' '}
                    <a href="https://www.ableton.com/" target="_blank" rel="noopener noreferrer">Ableton</a>. {' '}
                But it doesn't stop there – it led me to experiment with visual art expressions and graphic design, expanding my creative horizons even further.
            </p>
            <p>
            From a young age, I've learned the intricacies of organizing memorable events and leading teams of activists. It's more than just a hobby; it's a lifestyle that continually shapes and enriches my journey.
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
                title="Tell Them - N-Chainz (formerly Proaktive Selektor)"
                subtitle="135 BPM Bass Music - An old track of mine from back in 2014"
                currentSong={currentSong}
                setCurrentSong={setCurrentSong}
            />

            <br />
            
            <br />
            <h2>Recorded Mixes {' '} <img src={cdSpin} width="4%" ></img></h2>
            <br />
            <p>
            Besides spinning tunes and creating beats, I still make appearances on stage from time to time, 
            although not as frequently as previously. Not to worry though, I've prepared a small selection of live mixes for your pleasure. {' '}
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
            <MusicPlayer
                src={ByensRadioMix}
                title="Byens Radio Pirate Radio Rip - Proaktiv Selektor (ca. 2013)"
                subtitle="From back when pirate radio was still on the FM band - [140 Bass Music]"
                currentSong={currentSong}
                setCurrentSong={setCurrentSong}
            />
            <br />
            <div className="captioned-image" style={{ width: '90%' }}>
                <VideoAsset src={meDJing} />
                <p style={styles.caption}>
                    <sub>
                        <b>
                            Image 2: {' '}
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
                If you've found this section interesting and would like to learn more, collaborate, or simply chat about records, 
                feel free to reach out. {' '}
            </p>

            <br />
            <LineSplit />
            <br />
            <br />
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
                Interactive ASCII Visionarium
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                <div style={{ flex: 1, marginLeft: 32 }}>
                    <p> 
                    AsciiVision is a captivating creative coding venture that blends interaction design with artistic flair. By tapping into your 
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
    


<div className="text-block">
                
                <h2>Life's a Journey - Interactive Visualization </h2>
                <br />
                <p> 
            Life's Journey is a small interactive game inspired by the original Game of Life. Step into a mesmerizing world where you can shape and witness the unfolding of life itself. Immerse yourself in the captivating gameplay and experience the beauty of emergent patterns. {' '}
        </p>
        <p>
            Immerse yourself in the captivating gameplay and experience the magic of cellular automata, revealing emergent patterns that mesmerize and inspire. Engage with dynamic landscapes and explore infinite possibilities, all powered by p5.js for a truly immersive visual experience. {' '}
        </p>
                <div className="captioned-image" style={{ width: '80%', marginTop: '-0px' }}>
                    <VideoAsset src={lifeJourney}  /> 
                    <p>
                        <sub>
                            <b>Image 3:</b> live demo of the visualization dynamically changing colors, smoothly navigating obstacles, and naturally regenerating. {' '} 
                        </sub>
                    </p>
                </div>
                <p>
                Experience an engaging interpretation of the Game of Life project crafted in p5.js. Navigate through the grid using arrow keys and 
                customize cell colors with a simple keystroke (press 'C'). Dive in as the game launches automatically, presenting a grid of cells 
                for interaction. Click to bring cells to life, and observe their evolution based on predefined rules. Relax and immerse yourself in 
                the captivating patterns that emerge. Here are the basic principles guiding cell interaction: {' '}
                <br></br><br />
                <li>
                    Cells with fewer than two live neighbors perish due to underpopulation.
                </li>
                <li>
                    Cells with two or three live neighbors persist into the next generation.
                </li>
                <li>
                    Cells with more than three live neighbors succumb to overpopulation.
                </li>
                <li>
                    Dead cells with precisely three live neighbors spring to life through reproduction.
                </li>
                </p>

                <br />
                <h3>Link to Project:</h3>
                <ul>
                    <li>
                        <a
                            rel="noreferrer"
                            target="_blank"
                            href="https://github.com/QC20/game-of-life-simulation"
                        >
                            <p>
                                <b>P5.js Game of Life Simulation</b> - Life's a Journey {' '}
                            </p>
                        </a>
                    </li>
                </ul>        
            </div>

            <LineSplit />
            <br />
            <div className="text-block">
                <br />
                <h2> My oil Paintings </h2>
            <br />
            <p>
                 Lately, I have taken up real-world painting. I felt it was time to explore the tactile experience of oil painting. 
                </p>
                <br />
                <div className="captioned-image">
                <VideoAsset src={MinenParty} /> 
                    
                    <p>
                        <sub>
                            <b>Image 9:</b> Live demo of the  {' '} 
                                <a
                                    href='https://github.com/QC20/Screensaver-LDR'
                                    target='_blank'
                                    rel='noopener noreferrer'>
                                    LDR interactive screensaver
                                </a>    
                                    {' '}reacting to the mouse placement and the sorrounding light.
                        </sub>
                    </p>
                </div>
                <p>
                In this project, deliberate user input, like mouse interactions, merges with the dynamic influence of ambient light. It's about blending 
                control with environmental responsiveness, creating an interactive experience that blurs the line between user agency and natural influence. 
                While we start with mouse and light, the project encourages exploration:  reacting to gyroscopic changes, responding to variations in sound 
                intensity, or dynamically adapting to specific spoken words. These uncontrolled elements hold the potential to transform the user's journey, 
                opening doors to new realms of exploration and creativity.{' '}
                </p>
        </div>
        </div>
    );
};


// const styles: StyleSheetCSS = {};

export default MusicProjects;



