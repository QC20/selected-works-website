/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/jsx-no-comment-textnodes */
import React from 'react';
import ResumeDownload from '../ResumeDownload';
import Window from '../../os/Window';
import DosPlayer from '../../dos/DosPlayer';

interface paperProps {}

const PapersProjects: React.FC<paperProps> = (props) => {
    return (
        <div className="site-page-content">
            {/* First Work Experience */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Academic Publications</h1>
                    </div>
                    <br />
                    <p>
                        Welcome to my academic journey, where my passion for unraveling the complexities of human-computer interaction (HCI) shines through in every published paper. Delve into a{' '}
                        <a rel="noreferrer" target="_blank" href="https://scholar.google.com/citations?user=DKHqqFMAAAAJ">collection of scholarly works</a>
                        {' '}showcased on this page, each meticulously crafted and rigorously reviewed.
                    </p>
                    <br />
                    <p>
                        Among them, you'll discover contributions to premier conferences such as ACM GROUP, ACM CUI, and the highly esteemed ACM CHI. This isn't just about dry academia; it's about pushing boundaries, sparking conversations, and shaping the future of HCI.
                    </p>
                    <p>
                        Each paper represents a significant endeavor in advancing knowledge within various domains, including HCI, cognitive science, and computer science. Dive into these academic publications to explore recent research contributions and insights into topics ranging from user experience design and computational complexity to novel interface design, showcasing recent research contributions that are the culmination of dedication, collaboration, and innovative thinking.
                    </p>
                    <br />
                    <ResumeDownload />
                    <br />
                    <div style={styles.headerRow}>
                        <h3>Exploring Audio Icons for Content-Based Navigation in Voice User Interfaces</h3> 
                    </div>
                    <div>
                        <h4><u>Jonas Kjeldmand Jensen</u>, Daniel Ashbrook</h4>
                    </div>
                    <div>
                        <h5>Published in ACM CUI'23. 
                            <a 
                                rel="noreferrer" 
                                target="_blank" 
                                href="https://dl.acm.org/doi/10.1145/3571884.3604302">
                                    DOI
                                </a>.
                                </h5>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <ul>
                        <p><b>Abstract</b></p>
                        <p>
                            Voice interaction is an increasingly popular technology, allowing users to control devices and applications without the need for physical interaction or ocular attention. Augmented voice playback control features, such as audio icons, have the potential to significantly improve voice navigation for instructional videos. This study evaluates audio icons for improving how-to video navigation in a Wizard-of-Oz-controlled setup with 24 participants assembling a wooden robot using a voice-controlled laptop. Results showed that audio icons helped participants complete the task faster, with fewer voice commands, and higher satisfaction. However, some usability challenges were observed. Significant differences in perceived usability were found between audio icons placed with visual points-of-action and the baseline, but not between the baseline and audio icons at 30-second intervals. These findings provide valuable insights for VUI system researchers and designers to advance the use of audio icons for improving voice interface navigation.
                        </p>
                </ul>
            </div>
            <div style={styles.headerRow}>
                <h3>Barriers to End-User Designers of Augmented Fabrication</h3>
            </div>
            <div>
                <h4>Chandan Mahapatra, <u>Jonas Kjeldmand Jensen</u>, Michael McQuaid, Daniel Ashbrook</h4>
            </div>
            <div>
                <h5>Published in ACM CHI'19. 
                    <a 
                        rel="noreferrer" 
                        target="_blank" 
                        href="https://dl.acm.org/doi/10.1145/3290605.3300613">
                            DOI
                            </a>.
                            </h5>
            </div>
            <div className="text-block">
                <ul>

                        <p><b>Abstract</b></p>

                        <p>
                            Augmented fabrication is the practice of designing and fabricating an artifact to work with existing objects. Although common both in the wild and as an area for research tools, little is known about how novices approach the task of designing under the constraints of interfacing with real-world objects. In this paper, we report the results of a study of fifteen novice end users in an augmented fabrication design task. We discuss obstacles encountered in four contexts: capturing information about physical objects, transferring information to 3D modeling software, digitally modeling a new object, and evaluating whether the new object will work when fabricated. Based on our findings, we suggest how future tools can better support augmented fabrication in each of these contexts.
                        </p>

                </ul>
            </div>
            <div style={styles.headerRow}>
                <h3>Into Scandinavia: When Online Fatherhood Reflects Societal Infrastructures</h3>
            </div>
            <div>
                <h4><u>Jonas Kjeldmand Jensen</u>, Tawfiq Ammari, Pernille Bjørn</h4>
            </div>
            <div>
                <h5>Published in ACM GROUP'18. 
                    <a 
                        rel="noreferrer" 
                        target="_blank" 
                        href="https://dl.acm.org/doi/10.1145/3361112">
                            DOI
                        </a>.
                        </h5>
            </div>
            <div className="text-block">
                <ul>
                        <p><b>Abstract</b></p>

                        <p>
                            Denmark is a generous welfare state that provides resources and legal means for fathers to take their parental role seriously and engage with their children. In this paper, we explore the relation between Danish fathers' interaction online and the societal, legal, and economic infrastructures in which they are situated. By focusing on how fathers living in Denmark make use of the Internet and social media sites to facilitate their role as parents, we can explore how online engagement is shaped by the different societal 'norms' of parenting. Our research outlines the ways in which societal infrastructures influence how fathers perceive, and subsequently make use of social media in relation to child-caring. We find that fathers discuss their experiences of legal inequities and stereotypical discrimination on social network sites like Facebook. We also study fathers' online reviews of a Danish parenting App, FAR, designed specifically to support fathers. By analyzing social media discussions around fatherhood in Denmark, we found connections to the ways in which the current political climate shapes and influences fatherhood in Denmark, as they reflect the societal infrastructures which situate fathers in contemporary Denmark. Further, we found a strong political interest for collective action to transform the societal infrastructures to support legal equality for child caretaking across genders. This strong political motivation is distinct from existing studies exploring how fatherhood is displayed on social media in other countries such as the USA. On this basis, we argue that research exploring social media use in institutions which are strongly shaped by societal norms, must explicitly consider the role which society takes in shaping such institutions and include these aspects into the analysis. Our data show that fathers use social media sites as platforms to produce a fatherhood more in line with their lived experience of parenting, and that they advocate for collective political action to strengthen fathers' legal rights.
                        </p>
 
                </ul>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    header: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerContainer: {
        alignItems: 'flex-end',
        width: '100%',
        justifyContent: 'center',
    },
    headerRow: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
};

export default PapersProjects;
