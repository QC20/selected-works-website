import React from "react";
import ResumeDownload from "./ResumeDownload";
import LineSplit from "../showcase/LineSplit";
import { Link } from "react-router-dom";

export interface ExperienceProps {}

const Experience: React.FC<ExperienceProps> = (props) => {
  return (
    <div className="site-page-content">
      <ResumeDownload />
      {/* First Education Section */}
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h1>Work Experience</h1>
          </div>
          <br />
          <br />
          <br></br>
          <div style={styles.headerRow}>
            <h3>PhD Researcher</h3>
            <b>
              <p>February 2025 ~ Present</p>
            </b>
          </div>
          <h4 style={{ fontWeight: "normal" }}>Technical University of Denmark (DTU)</h4>
          <div className="text-block">
            <ul>
              <li>
                <p>
                  <b>Research Focus: </b> Artificial Intelligence's Impact on Managment and Managerial Work
                </p>
              </li>
              <li>
                <p>
                  <b>Key Contributions: </b>
                  <ul>
                    <li>Conducted original research on the impact of AI and algorithmic systems on managerial roles and well-being.</li>
                    <li>Developed and tested hypotheses on managerial perception, role adaptation, and decision-making autonomy in AI-integrated workplaces.</li>
                    <li>Disseminated findings through peer-reviewed publications, public commentary, and expert appearances in media.</li>
                  </ul>
                </p>
              </li>
              <li>
                <p>
                  <b>Publications & Conferences: </b> 
                </p>
              </li>
            </ul>
          </div>
          <br></br>
          <div style={styles.headerRow}>
            <h3>AI & Automation Developer</h3>

            <b>
              <p>Februrary 2023 ~ February 2025</p>
            </b>
          </div>
          <h4 style={{ fontWeight: "normal" }}>
            The Danish Ministry of Taxation
          </h4>
          <div style={{ display: "flex", flexDirection: "column" }}></div>
        </div>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>
                Developed a customer satisfaction survey system operating
                spanning across multiple platforms and software applications,{" "}
              </b>
              facilitating the resolution of approximately 16,000 complaint
              cases annually.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>
                Designed a fully automated solution for retrieving documents for
                case processing/information gathering from the Motor Vehicle
                Agency (Motorstyrelsen) and Traffic Authority
                (Færdselsstyrelsen),{" "}
              </b>
              impacting approximately 5000 cases annually with a 6% reduction in
              overall case processing time.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>
                Created user-friendly tax appeal forms available to 1.7 million
                Danish citizens,{" "}
              </b>
              informed by a deep understanding of the business process to
              streamline information capture and case processing.{" "}
            </p>
          </li>
        </ul>
      </div>
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>UX Developer</h3>

            <b>
              <p>June 2022 ~ January 2023</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>Odeno A/S</h4>
      </div>

      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>Led agile feedback-driven development, </b>
              conducting usability testing, fostering cross-functional
              collaboration, and utilizing user insights to enhance the
              platform's user experience. Collaborated across technical,
              commercial, and managerial stakeholders to prioritize objectives
              and streamline development tasks.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Utilized data analysis and visualization </b>
              to derive actionable insights from user behavior, feedback, and
              financial metrics. Informed design decisions and product
              enhancements, contributing to platform performance and user
              satisfaction.{" "}
            </p>
          </li>
        </ul>
      </div>

      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>HCI M.Sc. Researcher</h3>

            <b>
              <p>December 2020 ~ June 2022</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>Human-Centered Computing Research Section, DIKU</h4>
      </div>

      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>
                Led empirical data collection of over a 100 participants for a
                high-impact research paper,{" "}
              </b>
              conducting extensive remote interviews to explore phone usage and
              app preferences, thus shaping an upcoming CHI paper. Integral to
              research direction and insight generation, demonstrating a
              commitment to thorough analysis.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Applied NLP and ML techniques on large datasets, </b>
              conducting sentiment analysis, topic modeling, and named entity
              recognition on extensive text data. Utilized machine learning
              algorithms to extract key themes, sentiment patterns, and identify
              important entities, providing actionable insights for
              decision-making and strategic planning.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>
                Co-authored usability study on novice users' use of 3D CAD
                software.{" "}
              </b>
              Conducted thorough quasi-qualitative analysis as part of an
              in-depth study, aimed at uncovering the intricate challenges
              novice users encounter in current 3D fabrication design practices.{" "}
            </p>
          </li>
        </ul>
      </div>
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>UX/UI Designer</h3>

            <b>
              <p>January 2017 ~ November 2020</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>Yngre Læger, Lægeforeningen</h4>
      </div>

      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>
                Led the iterative design process for a newly implemented
                chatbot,{" "}
              </b>
              conducting user evaluations and in-depth analysis of user
              feedback. Iteratively refined the chatbot's Natural Language
              Understanding (NLU) capabilities based on user insights to enhance
              user experience and usability.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>
                Crafted seamless user experiences across various touchpoints{" "}
              </b>
              by designing and implementing new website components and UI
              elements, harmonizing them with our brand's visual identity.
              Integrated these enhancements into our CMS and CRM systems to
              elevate the user journey for our 16,000 weekly users, fostering a
              unified and user-centric digital ecosystem.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Facilitate and analyze group interviews </b>
              with doctors to learn and co-create prototypes and digital
              products.{" "}
            </p>
          </li>
        </ul>
      </div>

      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>HCI B.A. Student Researcher</h3>

            <b>
              <p>May 2018 2017 ~ November 2018</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>Human-Centered Computing Research Section, DIKU</h4>
      </div>

      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>
                Developed interactive software and embedded systems solutions,{" "}
              </b>
              such as interactive IQ tests, 3D CAD designs, and sensor &
              actuator physical setups, to support PhD students in their
              research projects.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Contributed to a CSCW study, </b>
              contributing to a research project exploring the start-up tech
              landscape in occupied regions of Palestine. Additionally,
              facilitated on-campus workshops with visiting professors to gather
              insights and foster collaboration.{" "}
            </p>
          </li>
        </ul>
      </div>

      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>Student Video & Graphic Designer</h3>

            <b>
              <p>January 2015 ~ August 2017</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>DIS, Study Abroad in Scandinavia</h4>
      </div>

      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>Collaborated with senior UX designers </b>
              to create wireframes, prototypes, and visual designs.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Conducted design reviews </b>
              to refine and improve new and existing design solutions.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Produced video tutorials </b>
              and content to assist study abroad students in Copenhagen.{" "}
            </p>
          </li>
        </ul>
      </div>

      {/* Second Education Section */}
      <LineSplit />
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h1>Education</h1>
          </div>
          <br />
          <LineSplit />
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h1>Education</h1>
          </div>
          <br />
          <br></br>
          <div style={styles.headerRow}>
            <h3>Doctor of Philosophy (PhD) in Strategy and Leadership</h3>
            <b>
              <p>2025 ~ 2028</p>
            </b>
          </div>
          <h4 style={{ fontWeight: "normal" }}>Technical University of Denmark (DTU)</h4>
          <div className="text-block">
            <ul>
              <li>
                <p>
                  <b>Research Area: </b> [Insert research area or specialization]
                </p>
              </li>
              <li>
                <p>
                  <b>Supervisors: </b> [Insert supervisor names, if applicable]
                </p>
              </li>
              <li>
                <p>
                  <b>Key Courses: </b> [Insert relevant coursework]
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
          <br></br>
          <div style={styles.headerRow}>
            <h3>Master of Science in IT & Cognition</h3>

            <b>
              <p>2019 ~ 2022</p>
            </b>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontWeight: "normal",
        }}
      >
        <h4>University of Copenhagen</h4>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              The MSc programme in{" "}
              <a
                rel="noreferrer"
                target="_blank"
                href="https://studies.ku.dk/masters/it-and-cognition/profile-and-career/"
              >
                IT and Cognition
              </a>{" "}
              is a very exclusive program for a small group of talented and
              focused students who wish to excel in developing advanced
              cognitive technologies.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Courses: </b>
              <i>
                {" "}
                Artificial Intelligence & Cognitive Modelling; Scientific
                Programming; Vision & Image Programming; Natural Language
                Processing; Data Science; Machine Learning & Deep learning;
                Advanced Human-Centred Computing{" "}
              </i>
            </p>
          </li>
        </ul>
      </div>
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>Bachelor of Arts in Communication & IT</h3>

            <b>
              <p>2014 ~ 2018</p>
            </b>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontWeight: "" }}>
        <h4>University of Copenhagen</h4>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              The bachelor program{" "}
              <a
                rel="noreferrer"
                target="_blank"
                href="https://studier.ku.dk/kandidat/kommunikation-og-it/faglig-profil-og-job/"
              >
                Communication & IT
              </a>{" "}
              equips you for roles in IT implementation, concept development,
              analysis, design, and leadership within organizations. Combining
              technical expertise with insights into user impact, the program
              stands out through its focus on advanced technical skills, concept
              development, programming, and empirical analysis of digital
              communication in organizational and societal contexts.{" "}
            </p>
          </li>
          <li>
            <p>
              <b>Courses: </b>
              <i>
                {" "}
                Computer Science; Communication Theory; Empirical Research
                Methods; Interaction Design; Digital Innovation; Analysis,
                Design & Regulation of IT-Infrastructure; IT Project Management
                & Requirement Specification{" "}
              </i>
            </p>
          </li>
        </ul>
      </div>
      <div style={{ ...styles.headerContainer, marginBottom: 20 }}>
        {" "}
        {/* Add margin-bottom here */}
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h2>Elective Courses at other Institutions</h2>
          </div>
        </div>
      </div>
      {/* University of Copenhagen */}
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>IT University of Copenhagen</h3>

            <b>
              <p>2019 and 2022</p>
            </b>
          </div>
        </div>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>Courses: </b>
              <i>
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://learnit.itu.dk/local/coursebase/view.php?ciid=897"
                >
                  Co-Design
                </a>
                ,{" "}
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://learnit.itu.dk/local/coursebase/view.php?ciid=1352"
                >
                  Designing Interactions{" "}
                </a>
              </i>
            </p>
          </li>
        </ul>
      </div>
      {/* University of Copenhagen */}
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>Copenhagen Business School (CBS)</h3>
            <b>
              <p>2021 and 2022</p>
            </b>
          </div>
        </div>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>Courses: </b>
              <i>
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://kursuskatalog.cbs.dk/2021-2022/KAN-CBUSV2022U.aspx"
                >
                  Digital Entreperneurship
                </a>
                ,{" "}
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://kursuskatalog.cbs.dk/2023-2024/KAN-CDSCO2004U.aspx"
                >
                  Machine Learning and Deep Learning{" "}
                </a>
              </i>
            </p>
          </li>
        </ul>
      </div>
      {/* University of Copenhagen */}
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h3>University of Amsterdam (UvA)</h3>
            <b>
              <p>2015 ~ 2016</p>
            </b>
          </div>
        </div>
      </div>
      <div className="text-block">
        <ul>
          <li>
            <p>
              <b>Courses: </b>
              <i>
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://staff.science.uva.nl/r.dehaan/complexity2024/"
                >
                  Computational Complexity
                </a>
                , Communication Science (II & III),{" "}
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://www.uva.nl/shared-content/programmas/en/masters/urban-and-regional-planning/urban-and-regional-planning.html"
                >
                  Urban Planning Studies{" "}
                </a>
              </i>
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
};

const styles: StyleSheetCSS = {
  header: {
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
  },
  skillRow: {
    flex: 1,
    justifyContent: "space-between",
  },
  skillName: {
    minWidth: 56,
  },
  skill: {
    flex: 1,
    padding: 8,
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    background: "red",
    marginLeft: 8,
    height: 8,
  },
  hoverLogo: {
    height: 32,
    marginBottom: 16,
  },
  headerContainer: {
    alignItems: "flex-end",
    width: "100%",
    justifyContent: "center",
  },
  hoverText: {
    marginBottom: 8,
  },
  indent: {
    marginLeft: 24,
  },
  headerRow: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
  },
};

export default Experience;
