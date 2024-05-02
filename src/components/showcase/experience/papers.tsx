/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/jsx-no-comment-textnodes */
import React, { useState } from 'react';
import ResumeDownload from '../ResumeDownload';
import Window from '../../os/Window';
import DosPlayer from '../../dos/DosPlayer';





export interface paperPropss {}

const PapersProjects: React.FC<paperPropss> = (props) => {
    return (
        <div className="site-page-content">

            {/* First Work Experience */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Academic Publications</h1>
                        
                    </div>
                    <br></br>
                        <p>
                        Welcome to my academic journey, where my passion for unraveling the complexities of human-computer interaction (HCI) shines 
                        through in every published paper. Delve into a collection of scholarly works showcased on this page, each meticulously crafted 
                        and rigorously reviewed. {' '}
                        </p>
                      <br></br>
                        <p>
                        Among them, you'll discover contributions to premier conferences such as ACM GROUP, ACM CUI, and the highly esteemed ACM CHI. 
                        This isn't just about dry academia; it's about pushing boundaries, sparking conversations, and shaping the future of HCI. {' '}
                        </p>
                        <p>
                        Each paper represents a significant endeavor in advancing knowledge within various domains, including HCI, cognitive science, 
                        and computer science. Dive into these academic publications to explore recent research contributions and insights into topics 
                        ranging from user experience design and computational complexity, to novel interface design, showcasing recent research 
                        contributions that are the culmination of dedication, collaboration, and innovative thinking.  {' '}
                        </p>
                        <br /><br></br>
                        <ResumeDownload />
                    <br /><br></br>
                    <div style={styles.headerRow}>
                        <h3>UI Specialist & Developer</h3>
                        <b>
                            <p>Februrary 2023 ~ present</p>
                        </b>
                    </div>
                    <h4 style={{ fontWeight: 'normal' }}>The Danish Ministry of Taxation</h4>
                </div>
            </div>
            <div className="text-block">
                <ul>
                    <li>
                        <p>
                            
                        </p>
                    </li>
                    <li>
                        <p>
                            <b>Designed a fully automated solution for retrieving documents for case processing/information gathering from the Motor Vehicle Agency (Motorstyrelsen) and Traffic Authority (Færdselsstyrelsen),</b> impacting approximately 5000 cases annually with a 6% reduction in overall case processing time.
                        </p>
                    </li>
                    <li>
                        <p>
                            <b>Created user-friendly tax appeal forms available to 1.7 million Danish citizens,</b> informed by a deep understanding of the business process to streamline information capture and case processing.
                        </p>
                    </li>
                </ul>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
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


