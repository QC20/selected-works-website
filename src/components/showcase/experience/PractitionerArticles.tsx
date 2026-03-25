/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Link } from 'react-router-dom';
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
                                rel="noreferrer noopener"
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
                        This popular science article, published in{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://www.lederne.dk">LEDERNE</a>
                        's practitioner magazine{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://www.lederstof.dk">Lederstof</a>
                        , distils the core findings of my ongoing{' '}
                        <Link to="/experience/papers">PhD research</Link>
                        {' '}for a leadership audience. It introduces the concept of the <i>efficiency trap</i>: the paradox by which{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Automation">AI automation</a>
                        {' '}of routine managerial tasks does not simply free up time, but removes the low-intensity cognitive work that
                        serves as a hidden source of recovery and reflective thinking during the workday. Drawing on{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Focus_group">focus group interviews</a>
                        {' '}with 24{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Middle_management">Danish middle managers</a>
                        , the article argues that the gradual elimination of these{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Job_demands-resources_model"><i>protective demands</i></a>
                        {' '}produces a compressed, unbroken stream of high-intensity{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Decision-making">decision-making</a>
                        {' '}that many managers experience as{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Cognitive_load">cognitively</a>
                        {' '}exhausting rather than liberating.
                    </p>
                    <br />
                    <p>
                        The piece also offers a practical framework for leaders and{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Human_resources">HR professionals</a>
                        {' '}who are evaluating{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Artificial_intelligence">AI</a>
                        {' '}adoption: four assessment criteria that organizations can apply to identify which routine tasks perform a protective function before
                        deciding to automate them. The goal is to help practitioners distinguish between tasks that are merely time-consuming
                        and tasks that are{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Attention_restoration_theory">cognitively restorative</a>
                        , a distinction that standard{' '}
                        <a rel="noreferrer noopener" target="_blank" href="https://en.wikipedia.org/wiki/Efficiency">efficiency metrics</a>
                        {' '}systematically obscure.
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

            {/* ── Workshops Section ── */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Workshops & Practitioner Sessions</h1>
                    </div>
                    <br />
                    <p>
                        Alongside written output, I design and facilitate workshops for managers and organizational practitioners
                        that bring research on AI and leadership directly into the room. These sessions are built around the
                        premise that middle managers occupy a structurally distinct position in the AI transition: unlike
                        knowledge-worker employees, managers must simultaneously navigate AI as a personal productivity tool,
                        as an object of governance they are responsible for, and as a force reshaping the relational and
                        coordinative work that defines their role. The workshops create space for managers to examine these
                        tensions collectively — surfacing the particular affordances and challenges that AI integration holds
                        for their group, and developing shared language for what is genuinely novel about their situation.
                    </p>
                    <br /><br />
                </div>
            </div>

            {/* ── Workshop 1: Lab25 ── */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h3>
                            AI og fremtidens ledelse &ndash; potentialer og udfordringer for mellemledere
                        </h3>
                    </div>
                    <div>
                        <h4>Jonas Kjeldmand Jensen</h4>
                    </div>
                    <div>
                        <h5>
                            Lab25 &ndash; Arbejdsmiljøkonferencen, Dansk Industri (2025).{' '}
                            <a
                                rel="noreferrer noopener"
                                target="_blank"
                                href="https://www.danskindustri.dk/arrangementer/soeg/arrangementer/arsmode/lab25-arbejdsmiljo/"
                            >
                                lab25-arbejdsmiljo
                            </a>
                            .
                        </h5>
                    </div>
                </div>
            </div>

            <div className="text-block">
                <ul>
                    <p><b>Description</b></p>
                    <p>
                        This practitioner workshop, held at Dansk Industri's annual work environment conference at Nyborg Strand,
                        invited a group of managers to investigate what the accelerating integration of AI means specifically for
                        middle management — and why that question cannot simply be answered by extrapolating from the employee
                        experience. The session opened with a short provocation grounded in my PhD research: that managers are
                        confronted with AI not just as users, but as the layer of the organization expected to absorb, translate,
                        and govern its consequences for others.
                    </p>
                    <br />
                    <p>
                        Participants worked in facilitated groups to map which parts of their managerial work AI is already
                        touching, which they expect it to reach next, and where they sense the greatest tension between
                        efficiency gains and the relational and contextual judgment that management requires. The workshop
                        surfaced recurring themes: the risk of decision-compression as AI handles routine tasks, the erosion
                        of informal visibility into team dynamics, and the question of where accountability sits when
                        algorithmic recommendations are embedded in everyday workflows.
                    </p>
                </ul>

                <br />
                <p>
                    <i>
                        <b>Keywords:{' '}</b>
                        AI and middle management, managerial work, organizational AI adoption, work environment, leadership
                        and technology, decision-making
                    </i>
                </p>
            </div>

            {/* ── Workshop 2: lab26 ── */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h3>
                            Hvad gør AI ved lederskabet? Mellemlederens særlige vilkår i den teknologiske transition
                        </h3>
                    </div>
                    <div>
                        <h4>Jonas Kjeldmand Jensen</h4>
                    </div>
                    <div>
                        <h5>
                            lab26 &ndash; Arbejdsmiljøkonference, Arbejdsmiljørådgiverne / BAMR (2026).{' '}
                            <a
                                rel="noreferrer noopener"
                                target="_blank"
                                href="https://bamr.dk/konferencen/"
                            >
                                bamr.dk/konferencen
                            </a>
                            .
                        </h5>
                    </div>
                </div>
            </div>

            <div className="text-block">
                <ul>
                    <p><b>Description</b></p>
                    <p>
                        This workshop, delivered at BAMR's annual work environment conference, continued the line of inquiry
                        from Lab25 with a sharper focus on the psychological and organizational conditions that make the
                        manager's encounter with AI distinct. The session was designed around the observation that
                        much public and organizational discourse about AI and work is framed from the perspective of
                        the individual knowledge worker — and that middle managers, as a group with particular structural
                        responsibilities, tend to be rendered invisible in that framing.
                    </p>
                    <br />
                    <p>
                        Participants explored three interrelated questions: What routine tasks are quietly disappearing from
                        their workday — and what cognitive and relational functions did those tasks serve? How does AI
                        change the nature of the managerial role when the informational and coordinative scaffolding
                        of that role is increasingly automated? And how might organizations design AI adoption processes
                        that take the well-being and specific working conditions of managers seriously, rather than
                        treating them solely as agents of implementation. The workshop drew directly on findings from
                        my focus group research with Danish middle managers.
                    </p>
                </ul>

                <br />
                <p>
                    <i>
                        <b>Keywords:{' '}</b>
                        AI and middle management, managerial well-being, role erosion, organizational technology adoption,
                        leadership development, work environment
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
