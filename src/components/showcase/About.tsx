import React from 'react';
import me from '../../assets/pictures/workingAtComputer.jpg';
import meNow from '../../assets/pictures/currentme1.jpg';
import { Link } from 'react-router-dom';
import ResumeDownload from './ResumeDownload';
import sparkles from '../../assets//pictures/sparkles.gif'
import LineSplit from '../showcase/LineSplit'
import computerPassion from './../../assets/pictures/computerPassion.gif'
import Cherry from './../../assets/pictures/Cherry.gif'
import ComputerIcons from './../../assets/pictures/ComputerIcons.gif'


export interface AboutProps {}

const About: React.FC<AboutProps> = (props) => {
    return (
        // add on resize listener
        <div className="site-page-content">
            {/* <img src={me} style={styles.topImage} alt="" /> */}
            <h1 style={{ marginLeft: -16 }}>Welcome to my digital realm</h1>
            <h3><img src={sparkles} width="4%" alt="" /> Hi there, I'm Jonas 👋 <img src={sparkles} width="4%" alt="" /></h3>
            <br />
            <div className="text-block">
                <p>
                Driven by a passion for programming and interfacing with innovative technologies, I thrive across various domains within Computer Science, always keeping the
                user's needs and desires at the forefront of my work. {' '}
                </p>
                <br />
                <p>
                    Well, you've made it this far. I suppose that must mean some of the content on my selected works website has caught your eye. I hope you'll enjoy it.
                    And yes, everything you see here is made my me from the bottom up, including the
                    <a
                            rel="noreferrer"
                            target="_blank"
                            href="https://github.com/QC20/selected-works-website"
                            >
                            website itself
                    </a>. Everthing is open source and reproducible, so feel free to
                    copy and 'steal' whatever you fancy for your own projects. Just make sure to drop me a mention will you? {' '}
                    Maybe you've even taken some time to try clicking on some of the icons on the desktop behind this window. Doom is a great game, you know. 

                </p>    
                <p>    
                    Well, in any case, I hope you enjoy your time here and if you have any questions or comments, you can contact me using{' '}
                    <Link to="/contact">this form</Link>, or send me an email at {' '}
                    <a href="mailto:jkj@di.ku.dk">
                        jkj@di.ku.dk
                    </a>. Or you can go ahead and connect with me on {' '}
                    <a href="https://www.linkedin.com/in/jonas-kjeldmand/">
                        Linkedin
                    </a>.
                </p>
            </div>
            <ResumeDownload />
            <div className="text-block">
                <h3>Getting to know me</h3>
                <br />
                <p>
                    In this section, allow me to share a glimpse of who I am. From my passions to my journey, I aim to provide you with a deeper understanding of the person 
                    behind the screen. My methodological grip has been honed by diverse experiences, from collaborative projects in academia to hands-on industry roles, and 
                    personal projects with like-minded makers and designers. Each encounter has contributed to my comprehensive understanding of programming and creative 
                    technologies, fostering a versatile skill set that enables me to navigate various domains within Computer Science with ease. {' '}
                </p>
                <br />
                <div className="captioned-image">
                    <img src={me} style={styles.image} alt="" />
                    <p>
                        <sub>
                            <b>Image 1:</b> Me hard at work at UCPH's creative maker space :)
                        </sub>
                    </p>
                </div>

                <p>
                        Outside of the software domain, I have many projects and hobbies that I enjoy practicing in my spare time. Among the more tangible things I do, 
                        I tinker with {' '}
                            <Link to="/projects/art">physical computing</Link>{' '}
                            as well as {' '}
                            <Link to="/projects/art">software programming</Link> {' '} and {' '}
                            <Link to="/projects/music">music & art</Link>
. 
                        . You can learn more about each on their respective pages under the '<Link to="/projects">Projects</Link>' tab on my website. Other hobbies I enjoy 
                        also enjoy is reading, hiking, and playing squash.
                        </p>
                <br />
            
                <br />
                <div style={{}}>
                    <div
                        style={{
                            flex: 1,
                            textAlign: 'justify',
                            alignSelf: 'center',
                            flexDirection: 'column',
                        }}
                    >
                        <h3><img src={ComputerIcons} width="9%" ></img>{' '}My passions</h3>
                        <br />

                        <br />
                        <p>
                        My journey into the realm of information technology started early. I remember spending countless hours on social sites, enhancing my bio with HTML coding. 
                        The ability to make screens interactive and visually engaging fascinated me, setting the stage for my passion for technology. {' '}

                        Upon carrying out my Bachelors in {' '}
                            <Link to='https://studier.ku.dk/kandidat/kommunikation-og-it/' target='_blank'>Communication & IT</Link>
                        , I was first time radicalized into the banner of Human-Computer Interaction (HCI) and introduction to {' '}
                            <Link to='https://di.ku.dk/english/research/groups/cscw/' target='_blank'>CSCW</Link> {' '}
                        through the supervision and co-authoring with {' '}
                            <Link to='https://di.ku.dk/english/news/2024/professor-pernille-bjoern-recognized-as-distinguished-member-of-acm/' target='_blank'>Pernille Bjørn</Link> {' '}
                        and my tenure at the . 
                            <Link to='https://di.ku.dk/english/research/human-centred-computing/' target='_blank'>Human-Centred Computing section</Link> {' '}at{' '}
                            <Link to='https://di.ku.dk/' target='_blank'>DIKU</Link>. During this initial engagement with academia I was a part of  {' '}
                            <Link to='https://www.femtech.dk/' target='_blank'>Femtech</Link>,
                        which is a pioneering initiative focused on fostering diversity and inclusion in technology.
                        From here I was introduced to HCI and interaction design, discovering the intricate balance between technology and human needs. 
                        Exploring topics such as user experience, usability, and interface design, I became passionate about creating technology that enhances 
                        human capabilities and enriches lives.

                        To further hone my technical skills and feed my interests, I pursued a M.Sc. in {' '}
                            <Link to='https://studies.ku.dk/masters/it-and-cognition/profile-and-career/' target='_blank'>IT & Cognition</Link> {' '}
                        to empower me to develop advanced cognitive tehcbologies, enabling me to gain deep knowledge of language, vision, and cognition, to design innovative 
                        information and communication technology (ICT) that mimics human cognitive processes and addresses complex cognitive phenomena such as memory, attention, 
                        and language. As these systems increasingly rely on machine learning and AI, my objective is to refine these approaches and enhance user engagement. 
                        By enabling individuals to draw more actionable insights from these technologies, I aim to leverage my interdisciplinary background to propel the 
                        development of Human-Centered AI.{' '}


                        </p>
                    </div>
                    <div style={styles.verticalImage}>
                        <img src={meNow} style={styles.image} alt="" />
                        <p>
                            <sub>
                                <b>Image 2:</b> Me not working particularly hard, April 2024
                            </sub>
                        </p>
                    </div>
                </div>
                <br />
                <br />
                <p>
                    So yeah, that wraps up the 'about me' section for now. Now, feel free to explore the rest of the website and discover all it has to offer. I've included 
                    interactive elements, moving images, GIFs, redirects, and games for your enjoyment. So, please take the time to learn something new and get inspired. 
                    Everything on here is shared through open source and is 100% reproducible, should you get the urge to try some of the designs yourself. Happy exploring!{' '}
                
                    Don't forget to try some of the other app shortcuts on the desktop as well. I've made the website to emulate the classic MS95 OS as much as possible, 
                    meaning that all element you see are interactive and all buttons work. Go ahead and see for yourself. 
                    If you like it, feel free to let me know. {' '}
                        
                    {' '}
                    Good luck and have fun!
                </p>
                <br />
                <p>
                    If you have any questions, I would love to hear them. You can ask them{' '}
                    <Link to="/contact">here</Link>, or send me an email at {' '}
                    <a href="mailto:jkj@di.ku.dk">
                        jkj@di.ku.dk
                    </a>.
                    Should you spot potential for collaboration or if you could use some assistance with your own project, feel free to continue the conversation on {' '}
                        <Link 
                            to="https://www.linkedin.com/in/jonas-kjeldmand/"
                            target='_blank'>
                                Linkedin
                        </Link>
                        .{' '}
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    contentHeader: {
        marginBottom: 16,
        fontSize: 48,
    },
    image: {
        height: 'auto',
        width: '100%',
    },
    topImage: {
        height: 'auto',
        width: '100%',
        marginBottom: 32,
    },
    verticalImage: {
        alignSelf: 'center',
        // width: '80%',
        marginLeft: 32,
        flex: 0.8,

        alignItems: 'center',
        // marginBottom: 32,
        textAlign: 'center',
        flexDirection: 'column',
    },
};

export default About;
