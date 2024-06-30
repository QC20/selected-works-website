/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
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
import MinenParty from '../../../../src/assets/pictures/CROPPED-2014-11-09-01-37.mp4';
// @ts-ignore
import asciiMe from '../../../assets/audio/1-5mb.mp4';
// @ts-ignore
import PaintingPallets from '../../../assets/pictures/projects/art/PaintingPallets.mp4';

import Painting1 from '../../../../src/assets/pictures/projects/art/Painting1.jpg';
import Painting2 from '../../../../src/assets/pictures/projects/art/Painting2.jpg';
import Painting3 from '../../../../src/assets/pictures/projects/art/Painting3.jpg';

import meDJing2 from '../../../../src/assets/pictures/meDJing2.jpg';
// @ts-ignore
import lifeJourney from '../../../assets/pictures/projects/art/lifes-journey.mp4';

import MusicNote from '../../../assets/icons/MusicNote.gif'
import cdSpin from '../../../assets/pictures/cdSpin.gif';
import paintBrush from '../../../assets/pictures/projects/art/paint-brush.gif';

import { Link, MusicPlayer } from '../../general';
import { styles } from '../../os/DragIndicator';
import LineSplit from '../LineSplit'
import ResumeDownload from '../ResumeDownload';
import VideoAsset from '../../general/VideoAsset';

import Window from '../../os/Window';
import shortcut from '../../../../src/assets/pictures/projects/audio/shortcut.gif'; 

interface MusicProjectsProps {}

const MusicProjects: React.FC<MusicProjectsProps> = () => {
    const [currentSong, setCurrentSong] = useState('');

    useEffect(() => {
        const handleKeyDown = (event: MessageEvent) => {
            if (event.data.type === 'keydown' && (event.data.key === 'ArrowUp' || event.data.key === 'ArrowDown' || event.data.key === 'ArrowLeft' || event.data.key === 'ArrowRight')) {
                event.preventDefault();
            }
        };

        window.addEventListener('message', handleKeyDown);

        return () => {
            window.removeEventListener('message', handleKeyDown);
        };
    }, []);

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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-10px' }}>
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
                subtitle="Recorded Live 25.02.2022 - [UK Garage | Techno | Juke/Footwork | Drum & Bass]"
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
                        Me spinning records at Soundtrack Cafe (Balders Plads, Copenhagen). Watch the entire recording {' '}
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
                        AsciiVision is a captivating creative coding venture that blends interaction design with some type of artistic retro vibe. Drawing on 
                        your gullibility to give me access to your device's webcam via the Camera API, AsciiVision seamlessly transforms the tangible into the digital. 
                        Using JavaScript some wizardry, it transforms each pixel's luminosity into a unique{' '}
                            <a
                                href='https://en.wikipedia.org/wiki/ASCII'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    ASCII                                    
                            </a>
                                {' '}character, providing a dynamic interpretation of the live video feed. I invite my users to experience this immersive and exhilarating journey 
                                delivered by this fusion of interactive computing and creative coding. You can even invert the colors. Have fun playing around :-) {' '} 
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '-82px', marginTop: '-20px' }}>
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

            <br />

            <LineSplit />
            <br />



            <div className="text-block">
                
                <h2>Selected Creative Web Dev Work</h2>
                <br />
        <p> 
             So I have made this entire website comprised of nothing but{' '} 
                            <a
                                href='https://qc20.github.io/Horizontal-Scroll-Website/'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    Black and White Visualizations                                  
                            </a>. I suggest you go and explore it if you want to get a feel of what interests me web development-wise. {' '}
        </p>
        <br />
        <div className="captioned-image" style={{ width: '80%', marginTop: '-0px' }}>
    <iframe
        src="https://qc20.github.io/Horizontal-Scroll-Website/"
        style={{ width: '1200px', height: '500px', border: 'none' }}
        title="Game of Life Simulation"
    ></iframe>
</div>
<br></br>
    <p>
        While I continue to add to it, I believe you can understand where I am heading and the type of creative and artistic explorations that excite me. 
        So, yeah, this serves as a small promo for some of my selected web development work featured on my portfolio website. Enjoy.{' '}
    </p>
    <br />
</div>

<LineSplit />


            <div className="text-block">
                
                <h2>Crashing Squares</h2>
                <br />
        <p> 
            Oh boy!{' '} 
            <a
                href='https://brm.io/matter-js/'
                target='_blank'
                rel='noopener noreferrer'>
                matter.js                      
            </a>{' '}is the bee's knees. You can do tons of great things with this nifty bite-size physics engine that lets you toss shapes and sprites around in simulated
            realities. For this design, I created a set of shapes and sizes that fall from the sky, which you can throw around using your mouse.
        </p>
        <br /> <br></br>
        <div className="captioned-image" style={{ width: '80%', marginTop: '-0px' }}>
            <iframe
                src="https://qc20.github.io/Crashing-Squares-Website/"
                style={{ width: '1200px', height: '500px', border: 'none' }}
                title="Game of Life Simulation">
            </iframe>
            <br /> <br></br>
    <p>
        I imagine this design can be used as a striking and expressive landing page for your website, with minimal text and only a few links to make the design stand out. 
        In my stripped-down example, I've included a small interactive button with a link to my LinkedIn profile to underline how you might include a very subtle redirect. 
        For a fun twist, swap the geometric shapes with bouncing SVGs or images to make your design pop!
    </p>

</div>

<LineSplit />
    
<br />

<div className="text-block">
                
                <h2>Life's a Journey - Interactive Visualization </h2>
                <br />
        <p> 
            Life's Journey is a small interactive experience inspired by Jon Conway's {' '} 
                            <a
                                href='https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    classic Game of Life                                   
                            </a>. Step into a mesmerizing world where you can shape and witness the unfolding of life itself. {' '}
        </p>
        <p>
            Immerse yourself in the captivating gameplay and experience the magic of cellular automata, revealing emergent patterns that mesmerize and inspire. 
            Engage with dynamic landscapes and explore infinite possibilities, all powered by p5.js for a truly immersive visual experience. {' '}
        </p>
        <div className="captioned-image" style={{ width: '80%', marginTop: '-0px' }}>
    <iframe
        src="https://qc20.github.io/game-of-life-simulation/"
        style={{ width: '800px', height: '600px', border: 'none' }}
        title="Game of Life Simulation"
    ></iframe>
    <p>
        <sub>
            <b>Image 3:</b> live{' '}
            <a
                href='https://qc20.github.io/game-of-life-simulation/'
                target='_blank'
                rel='noopener noreferrer'>
                demo of the visualization
            </a>{' '}
            dynamically changing colors, smoothly navigating obstacles, and naturally regenerating. <br />
            Press the image and start playing! Use the arrow keys to navigate and press <b>C</b> to change color. {' '}
        </sub>
    </p>
</div>

                <p>
                Indulge in this engaging interpretation of the Game of Life project crafted in{' '}
                            <a
                                href='https://p5js.org/'
                                target='_blank'
                                rel='noopener noreferrer'>
                                    P5.js                                    
                            </a>. 
                        Navigate through the grid using your keyboard's arrow keys and 
                        customize cell colors by pressing <b>C</b>. The rules a pretty simple. Every cell observes its surrounding neighbours to check whether 
                        its living area is underpopulated, overpopulated or suitable to live in. The game launches from its initial state, presenting a grid of cells. 
                        These are the basic principles guiding cell interaction: {' '}
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
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
                <img src={paintBrush} width="15%" style={{ marginRight: '40px' }} />
                    {' '}
                    {' '} My Oil Paintings {' '}
            </h2>

            
                <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                <div style={{ flex: 1, marginLeft: 32 }}>
                    
                <p> 
                A more recent activity I've been picking up is oil painting. What really excites me about this endeavor is that I have no prior 
                experience whatsoever. Actually, growing up left-handed and with handwriting that was more or less intelligible, I guess I was 
                somewhat deterred from drawing, painting, or doing anything by hand.{' '}
            <br /><br></br>

                However, in 2021, I started to pick up my first supplies and first clean canvas. Having no idea what I was doing or how to even begin 
                learning, I decided to just throw myself into it and hope something beautiful would spawn out of it. Moreover, I think it was a deliberate 
                decision of mine to not seek any type of help or teaching about techniques or styles. The reason for this was purely based on the idea 
                that I wanted to see what I would be able to create purely based on my own intuition and creativity.{' '}
      
            <br /> <br></br>

        What excites and inspires me when conceptualizing a new canvas is starting from an initial feeling, exploring uncharted techniques, experimenting 
        with new texture designs, or using paint products I haven’t tried before. I persist until something I like emerges, and then I continue from there. 
        Overall, a significant takeaway from oil painting is the opportunity to refine and practice skills I initially lacked proficiency or experience in. {' '}

        <br /> <br></br>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '0px' }}>
        <div style={{ textAlign: 'center', width: '50%', marginRight: '10px' }}>
            <img src={Painting2} style={{ width: '100%' }} alt="" /> 
        </div>
        <div style={{ textAlign: 'center', width: '50%', marginLeft: '10px' }}>
            <img src={Painting3} style={{ width: '100%' }} alt="" /> 
        </div>
    </div>
</p>

                    
                    
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '-82px', marginTop: '-85px' }}>
                    <div style={{ textAlign: 'center', width: '85%', marginLeft: '-75px' }}>
                        <VideoAsset src={PaintingPallets} /> 
                    </div>
            </div>
            
            </div>
            </div>

        
        </div>
        </div>
    );
};


export default MusicProjects;