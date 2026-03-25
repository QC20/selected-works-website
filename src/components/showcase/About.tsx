/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import me from "../../assets/pictures/workingAtComputer.jpg";
import meNow from "../../assets/pictures/currentme1.jpg";
import { Link } from "react-router-dom";
import ResumeDownload from "./ResumeDownload";
import sparkles from "../../assets//pictures/sparkles.gif";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LineSplit from "../showcase/LineSplit";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import computerPassion from "./../../assets/pictures/computerPassion.gif";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Cherry from "./../../assets/pictures/Cherry.gif";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ComputerIcons from "./../../assets/pictures/ComputerIcons.gif";

export interface AboutProps {}

const About: React.FC<AboutProps> = (props) => {
  return (
    // add on resize listener
    <div className="site-page-content">
      {/* <img src={me} style={styles.topImage} alt="" /> */}
      <h1 style={{ marginLeft: -16 }}>Welcome to my digital self</h1>
      <h3>
        <img src={sparkles} width="4%" alt="" /> Hi there, I'm Jonas 👋{" "}
        <img src={sparkles} width="4%" alt="" />
      </h3>
      <br />
      <div className="text-block">
      <p>
  I started out fascinated by how computers work — the raw mechanics of software, systems, and the science behind the technology we build.
  That foundation gradually pulled me toward a deeper question: how do people actually interact with these systems? That question led me into
  Human-Computer Interaction, where I spent years studying usability, running user studies, and learning to understand technology not just as
  something engineered, but as something practiced — shaped by the people, contexts, and organisations that use it.
</p>
<p>
  That perspective — of technology as it is actually performed and understood in its natural habitat — turned out to be the through-line
  of everything I do. It’s what eventually drew me to my current work: a PhD investigating how artificial intelligence is reshaping managerial
  work and well-being in organisations. It’s a natural next step. My deep background in AI and computing lets me understand what these systems
  actually do, while my training in user studies and a combined qualitative and quantitative methods toolbox lets me study how managers
  experience, adapt to, and are affected by them — from multiple angles at once.
</p>
<p>
  Alright, I guess that covers the elevator pitch. Now, let’s get real. I’ve designed this website in direct opposition to most
  contemporary design conventions because I believe it creates a more engaging user experience. While other sites rush to deliver
  everything within 5 seconds and under 2 clicks, this site will reward those who are curious enough to explore.
</p>
</div>
<ResumeDownload />
<div className="text-block">
  <h3>Getting to know me</h3>
  <br />
  <p>
    Let me give you a quick look into who I am. From my passions to my personal journey, I hope to give you a better sense of the person behind the screen. I'm driven by a constant desire for self-improvement. I feel most alive when I'm stepping into something completely new, where I'm a total beginner, and I can witness my own growth as I develop new skills and competencies. In most areas of my life, this is what drives me—the innate desire to create and build. I definitely have a 'creator gene' that constantly pushes me to make, tinker, and experiment. But it’s not just about creating; it has to have purpose. Whenever possible, it should serve as an improvement, spark a provocation, or offer a fresh perspective.
  </p>

        <br />
        <div className="captioned-image">
          <img
            src={me}
            style={styles.image}
            title="My haircut tends to vary with the seasons"
            alt="Jonas Kjeldmand Jensen"
          />
          <p>
            <sub>
              <b>Image 1:</b> Me hard at work at UCPH's creative maker space :)
            </sub>
          </p>
        </div>

        <p>
          When I’m not using the computer to create, I like to stay active and
          keep my body moving. I practice both yoga and karate. My philosophy is
          that you can’t have yin without yang, and this applies to everything
          in life. In order to be a complete human being, you need to embrace
          and access both sides: the softness and flexibility of the yin, but
          also the strength to push and perservere through challenges and
          hardships when needed.
        </p>
        <br />
        <p>
          To nourish my mind, I also participate in a weekly political debate
          club, where we discuss current events and explore classic texts to
          educate each other and gain a deeper understanding of the world around
          us. Beyond learning and helping others do the same, this also sharpens
          my argumentative and public speaking skills. You haven’t truly
          defended your viewpoints until you’ve debated someone with decades of
          experience. While I don’t win every argument, I make sure to learn
          from my mistakes each time.
        </p>
        <br />
        <p>
          And outside of the pure software domain, I have a range of projects
          and hobbies that I enjoy exploring in my spare time, allowing me to
          express my creativity and keep my mind engaged. Among the more
          tangible things I do, I tinker with{" "}
          <Link to="/projects/art">physical computing</Link>, as well as{" "}
          <Link to="/projects/music">music & art</Link>. But yeah, even in my
          spare time, I can't help but find myself drawn to{" "}
          <Link to="/projects/software">software programming</Link>, a passion
          that extends beyond my professional life. It's a skill I've learned
          that allows me to create and build beyond just what's necessary for
          daily living. You can explore each of these areas in more detail under
          the '<Link to="/projects">Projects</Link>' tab on my website.
        </p>
        <br />

        <br />
        <div style={{}}>
          <div
            style={{
              flex: 1,
              textAlign: "justify",
              alignSelf: "center",
              flexDirection: "column",
            }}
          >
            <h3>
              <img src={ComputerIcons} width="9%"></img> My academic passions
            </h3>
            <br />

            <br />
            <p>
              My journey into the world of information technology started early.
              I remember spending countless hours on social sites, enhancing my
              bio with HTML coding. The ability to make screens interactive and
              visually engaging fascinated me, setting the stage for my passion
              for technology. Upon carrying out my Bachelors in{" "}
              <Link
                to="https://studier.ku.dk/kandidat/kommunikation-og-it/"
                target="_blank"
              >
                Communication & IT
              </Link>
              , I was first time radicalized into the banner of Human-Computer
              Interaction (HCI) and introduction to{" "}
              <Link
                to="https://di.ku.dk/english/research/groups/cscw/"
                target="_blank"
              >
                CSCW
              </Link>{" "}
              through the supervision and co-authoring with{" "}
              <Link
                to="https://di.ku.dk/english/news/2024/professor-pernille-bjoern-recognized-as-distinguished-member-of-acm/"
                target="_blank"
              >
                Pernille Bjørn
              </Link>{" "}
              and my tenure at the .
              <Link
                to="https://di.ku.dk/english/research/human-centred-computing/"
                target="_blank"
              >
                Human-Centred Computing section
              </Link>{" "}
              at{" "}
              <Link to="https://di.ku.dk/" target="_blank">
                DIKU
              </Link>
              . During this initial engagement with academia I was a part of{" "}
              <Link to="https://www.femtech.dk/" target="_blank">
                Femtech
              </Link>
              , which is a pioneering initiative focused on fostering diversity
              and inclusion in technology. From here I was introduced to HCI and
              interaction design, discovering the intricate balance between
              technology and human needs. Exploring topics such as user
              experience, usability, and interface design, I became passionate
              about creating technology that enhances human capabilities and
              enriches lives. To further hone my technical skills and feed my
              interests, I pursued a M.Sc. in{" "}
              <Link
                to="https://studies.ku.dk/masters/it-and-cognition/profile-and-career/"
                target="_blank"
              >
                IT & Cognition
              </Link>{" "}
              to deepen my knowledge of language, vision, and cognition, and to
              design information and communication technology that works with —
              rather than against — human cognitive processes. The programme
              sharpened my technical understanding of machine learning and AI
              while keeping questions of human experience and usability at the
              centre.
            </p>
            <p>
              <br />
              That combination pointed somewhere specific. If I understand how
              AI systems are built <i>and</i> how people actually experience
              them in practice, the most pressing place to apply that is where
              these systems are landing with the most force: in organisations,
              and particularly in the daily work of managers. My PhD at the{" "}
              <Link to="https://www.cbs.dk/" target="_blank">
                Copenhagen Business School
              </Link>{" "}
              follows that thread directly — investigating how AI is
              restructuring managerial work, what it does to well-being and
              decision-making, and how organisations can navigate that
              transition thoughtfully. It lets me bring everything together: a
              technical literacy in AI, a grounding in how technology is
              actually used and understood in context, and a methods repertoire
              that spans qualitative fieldwork and quantitative analysis — so
              the problem can be approached from more than one angle at once.{" "}
            </p>
          </div>
          <div style={styles.verticalImage}>
            <img
              src={meNow}
              style={styles.image}
              alt="Jonas Kjeldmand Jensen"
            />
            <p>
              <sub>
                <b>Image 2:</b> Me not working particularly hard, April 2024
              </sub>
            </p>
          </div>
        </div>
        <br />
        <h3>About this site</h3>
        <br />
        <p>
          So yeah, that wraps up the 'about me' section for now. Now, feel free
          to explore the rest of the website and discover all it has to offer.
          I've included interactive elements, moving images, GIFs, redirects,
          and games for your enjoyment. So, please take the time to learn
          something new and get inspired. Everything on here is shared through{" "}
          <a href="https://www.linkedin.com/in/jonas-kjeldmand/">open source</a>{" "}
          and is 100% reproducible, should you get the urge to try some of the
          designs yourself. Happy exploring! Don't forget to try some of the
          other app shortcuts on the desktop as well. I've made the website to
          emulate the classic MS95 OS as much as possible, meaning that all
          element you see are interactive and all buttons work. Go ahead and see
          for yourself. If you like it, feel free to let me know. Good luck and
          have fun!
        </p>
        <br />
        <p>
          If you have any questions, I would love to hear them. You can ask them{" "}
          <Link to="/contact">here</Link>, or send me an email at{" "}
          <a href="mailto:jkj@di.ku.dk">jkj@di.ku.dk</a>. Should you spot
          potential for collaboration or if you could use some assistance with
          your own project, feel free to continue the conversation on{" "}
          <Link
            to="https://www.linkedin.com/in/jonas-kjeldmand/"
            target="_blank"
          >
            Linkedin
          </Link>
          .{" "}
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
    height: "auto",
    width: "100%",
  },
  topImage: {
    height: "auto",
    width: "100%",
    marginBottom: 32,
  },
  verticalImage: {
    alignSelf: "center",
    // width: '80%',
    marginLeft: 32,
    flex: 0.8,

    alignItems: "center",
    // marginBottom: 32,
    textAlign: "center",
    flexDirection: "column",
  },
};

export default About;
