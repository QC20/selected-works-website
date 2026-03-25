/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import ResumeDownload from '../ResumeDownload';

interface PractitionerArticlesProps {}

const PractitionerArticles: React.FC<PractitionerArticlesProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Practitioner Writing & Articles</h1>
                    </div>
                    <br />
                    <p>
                        Alongside my peer-reviewed academic work, I contribute to practitioner-facing publications that translate research findings into
                        actionable insights for organizational leaders and managers. These pieces bridge the gap between empirical scholarship and
                        everyday professional practice, making complex ideas about AI, leadership, and well-being accessible to the people most
                        affected by them.
                    </p>
                    <br />
                    <p>
                        The articles collected here have appeared in Danish leadership media, professional journals, and public commentary venues.
                        Each piece is grounded in my ongoing research but written with practitioners as the primary audience.
                    </p>
                    <br /><br />
                    <ResumeDownload />
                    <br /><br />

                    {/* ── Article 1 ── */}
                    <div style={styles.headerRow}>
                        <h3>
                            Når AI effektiviserer sig selv til at skade ledernes trivsel
                        </h3>
                    </div>
                    <div>
                        <h4>Jonas Kjeldmand Jensen</h4>
                    </div>
                    <div>
                        <h5>
                            Lederstof &ndash; LEDERNE (2025).{' '}
                            <a
                                rel="noreferrer"
                                target="_blank"
                                href="https://www.lederstof.dk"
                            >
                                lederstof.dk
                            </a>
                            .
                        </h5>
                    </div>
                </div>
            </div>

            <div className="text-block">
                <ul>
                    <p><b>Summary</b></p>
                    <p>
                        This popular science article, published in LEDERNE's practitioner magazine, distils the core findings of my ongoing PhD
                        research for a leadership audience. It introduces the concept of the <i>efficiency trap</i>: the paradox by which AI
                        automation of routine managerial tasks does not simply free up time, but removes the low-intensity cognitive work that
                        serves as a hidden source of recovery and reflective thinking during the workday. Drawing on focus group interviews with
                        24 Danish middle managers, the article argues that the gradual elimination of these <i>protective demands</i> produces a
                        compressed, unbroken stream of high-intensity decision-making that many managers experience as cognitively exhausting
                        rather than liberating.
                    </p>
                    <br />
                    <p>
                        The piece also offers a practical framework for leaders and HR professionals who are evaluating AI adoption: four
                        assessment criteria that organizations can apply to identify which routine tasks perform a protective function before
                        deciding to automate them. The goal is to help practitioners distinguish between tasks that are merely time-consuming
                        and tasks that are cognitively restorative, a distinction that standard efficiency metrics systematically obscure.
                    </p>
                </ul>

                <br />
                <p>
                    <i>
                        <b>Keywords:{' '}</b>
                        AI and managerial well-being, efficiency trap, protective demands, latent recovery, work intensification,
                        leadership and technology
                    </i>
                </p>
            </div>

            {/* ── Placeholder for future articles ── */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h3>More articles coming soon</h3>
                    </div>
                    <div>
                        <h4>Jonas Kjeldmand Jensen</h4>
                    </div>
                    <div className="text-block">
                        <p>
                            Additional practitioner articles, expert commentaries, and public scholarship are in preparation. Check back for
                            updates, or reach out directly if you are interested in collaboration or commentary for a leadership publication.
                        </p>
                    </div>
                </div>
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

export default PractitionerArticles;
