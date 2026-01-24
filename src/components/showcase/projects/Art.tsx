import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import diyArduinoController from "../../../assets/pictures/projects/art/diyArduinoController.gif";
import diyArduinoSetup1 from "../../../assets/pictures/projects/art/diyArduinoSetup1.jpeg";
import diyArduinoSetup2 from "../../../assets/pictures/projects/art/diyArduinoSetup2.jpeg";
import githubWindows from "../../../assets/pictures/projects/art/githubWindows.png";
import ResumeDownload from "../ResumeDownload";
import LineSplit from "../LineSplit";

import HapNavDemo from "../../../../src/assets/pictures/projects/software/HavNapDemo.gif";
// @ts-ignore
import screenDemo from "../../../assets/pictures/projects/art/Screen_Demo-(v.3).mp4";
// @ts-ignore
import PrototypeDemoVideo from "../../../assets/pictures/projects/art/PrototypeDemo.mp4";
import prototype from "../../../assets/pictures/projects/art/Prototype.jpg";
import prototype1 from "../../../assets/pictures/projects/art/Prototype1.jpg";
import prototype2 from "../../../assets/pictures/projects/art/Prototype2.jpg";
import prototype3 from "../../../assets/pictures/projects/art/Prototype3.jpg";
// @ts-ignore
import LDRParticleSim from "../../../assets/pictures/projects/art/LDRParticleSimulation.mp4";

import ThisComputerApp from "../../applications/ThisComputer";
// @ts-ignore
import TromnoStartScreen from "../../../assets/pictures/projects/software/Tromino_StartScreen1.jpg";
// @ts-ignore
import TromnoStartScreen2 from "../../../assets/pictures/projects/software/Tromino_StartScreen2.jpg";
// @ts-ignore
import TromnoInGame from "../../../assets/pictures/projects/software/Tromino_InGame.jpg";
// @ts-ignore
import TromnoGameOver from "../../../assets/pictures/projects/software/Tromino_GameOver.jpg";
// @ts-ignore
import TrominoVidDemo from "../../../assets/pictures/projects/software/Tromino-In-Game(Compressed).mp4";

import { styles } from "../../os/DragIndicator";
import VideoAsset from "../../general/VideoAsset";

export interface ArtProjectsProps {}

const ArtProjects: React.FC<ArtProjectsProps> = (props) => {
  return (
    <div className="site-page-content">
      <h1 style={{ marginLeft: -9 }}>Physical and Embedded Computing</h1>
      <h3>Making Interaction Design Tangible</h3>
      <br />
      <div className="text-block">
        <p>
          Welcome to the world of physical computing! Here, you'll engage with
          projects that merge hardware and software, bringing digital creations
          to life in the tangible world. Whether it's tinkering with
          microcontrollers, sensors, or actuators, each project in this section
          embodies the fusion of electronics and programming. Just like the
          software projects, everything showcased here is open for exploration
          and replication, adhering to the spirit of open-source hardware.
        </p>
        <br />
        <p>
          Explore a world where circuits come alive, where sensors detect the
          environment, and where code interacts with the physical environment.
          From robotics and automation to interactive installations, these
          projects showcase my passion for bridging the gap between bits and
          atoms. While the projects here may involve wires and circuits instead
          of pixels and code, they are equally immersive and captivating. So
          roll up your sleeves, grab your soldering iron, and join me on an
          adventure into the fascinating world of physical computing!
        </p>
      </div>
      <ResumeDownload />
      <br></br>

      <h2>HapNav: Haptic game for the blind</h2>
      <br />

      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, marginRight: 32 }}>
          <p>
            HapNav challenges players to navigate a pre-defined map entirely by
            touch and intuition. Equipped with a joystick module, players rely
            on a vibration motor for feedback. The primary aim of the game is to
            successfully conquer the intricate maze-like level design, all while
            relying solely on tactile cues and without any visual assistance.
            The player's progress is determined by the absence of vibrations in
            the controller. Whenever the player veers off the intended path, the
            vibration motor responds with varying intensity, offering real-time
            feedback about their proximity to the desired route that constitutes
            the map's level design. Upon reaching the end of the level, a
            triumphant vibration sequence will mark their victory.{" "}
            <p>
              <br />
              HapNav empowers visually impaired players to navigate complex
              maps, fostering a detailed mental model and enhancing spatial
              understanding. By actively 'seeing' the map through touch, users
              develop a unique two-dimensional perception of the virtual
              environment.{" "}
            </p>
            <br />
            <p>
              Utilizing analogical metaphors, HapNav immerses players in a
              stylized world, encouraging intuitive navigation and mental
              imagery. This approach enhances spatial intuition, offering a
              novel gaming experience where players construct mental maps and
              maneuver seamlessly through digital landscapes.{" "}
            </p>
            <br></br>
            <br />
            <div className="captioned-image">
              <img src={prototype} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 1:</b> Top view of the DIY setup.{" "}
                  <a
                    href={
                      "https://github.com/QC20/Haptic-Game-For-The-Blind/tree/master/Controller-Designs"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Click here
                  </a>{" "}
                  to see schematic.
                </sub>
              </p>
            </div>
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginRight: "0px",
            marginTop: "-75px",
          }}
        >
          <div style={{ textAlign: "center", width: "85%", marginLeft: "0px" }}>
            <VideoAsset src={screenDemo} />
          </div>
          <p>
            <sub>
              <b>Image 2:</b> Dev board showing the movement in the maze in
              real-time.{" "}
            </sub>
          </p>
        </div>
      </div>

      <h3
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "right",
        }}
      >
        {" "}
        Skillful Navigation & Freedom to Explore{" "}
      </h3>
      <br />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row-reverse",
        }}
      >
        <div style={{ flex: 1, marginLeft: "64px" }}>
          <p>
            At the heart of HapNav's gameplay lies a unique trial-and-error
            approach. As players initiate the game, they must decipher the
            shapes, bends, and twists of the map, progressively forming an
            intuitive and detailed mental image of the map.{" "}
            <p>
              <br />
              Unlike many traditional games, HapNav liberates players from
              health systems, time limits, or other inhibiting factors. The
              game's core intention is to offer a platform for unrestricted
              exploration and learning within its two-dimensional world. Rely
              solely on your mind's image of the map, fostering a sense of
              freedom as you navigate the virtual landscape.{" "}
            </p>
            <br></br>
            <br />
            <div className="captioned-image">
              <img src={HapNavDemo} style={{ width: "90%" }} alt="" />
              <p>
                <sub>
                  <b>Image 3:</b> Go ahead and check out a{" "}
                  <a
                    href={"https://wokwi.com/projects/380777984099163137"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    live demo
                  </a>{" "}
                  of the game right here in your computer.{" "}
                </sub>
              </p>
            </div>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginRight: "-82px",
          }}
        >
          <div
            style={{ textAlign: "center", width: "85%", marginLeft: "-75px" }}
          >
            <VideoAsset src={PrototypeDemoVideo} />
          </div>
          <div
            style={{ width: "85%", marginLeft: "-75px", textAlign: "center" }}
          >
            <p style={{ margin: "auto" }}>
              <sub>
                An early iteration of the prototype on an ILI9341 screen.
              </sub>
            </p>
          </div>
        </div>
      </div>

      <div className="text-block">
        <p>
          In addition to the functioning code for the latest prototype version,
          my project repository boasts an array of valuable resources. You'll
          find detailed 3D CAD files for crafting the game controller, a
          selection of diverse musical patterns for enriching haptic feedback,
          and a variety of captivating map designs to suit your preferences.
          I've tailored designs to accommodate both standard ESP-32s and popular
          devboard ESP-32s like the LiLyGo TTGO T-Display 16 MB ESP32.
        </p>
        <br />
        <p>
          Furthermore, for those considering adding a screen down the road, I've
          included code for seamlessly integrating either an ST7789 or ILI9341
          LCD component. And that's not all! My repository also features a
          comprehensive list of all the necessary parts required to recreate
          HapNav from scratch.
        </p>
        <br />
        <p>
          I wholeheartedly encourage anyone intrigued by HapNav to dive in,
          explore, and embark on their own journey of building, expanding, and
          sharing this innovative project.{" "}
        </p>
        <br />

        <div style={{ display: "flex" }}>
          {/* First Instance */}
          <div style={{ flex: 1, marginRight: 16 }}>
            <div className="captioned-image">
              <img src={prototype1} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 5:</b> Fully enclosed Hapnav controller.{" "}
                </sub>
              </p>
            </div>
          </div>

          {/* Second Instance */}
          <div style={{ flex: 1, marginRight: 16 }}>
            <div className="captioned-image">
              <img src={prototype2} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 6:</b> Insides views of Hapnav controller.{" "}
                </sub>
              </p>
            </div>
          </div>

          {/* Third Instance */}
          <div style={{ flex: 1 }}>
            <div className="captioned-image">
              <img src={prototype3} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 7:</b> This is the minimal component version.{" "}
                </sub>
              </p>
            </div>
          </div>
        </div>

        <h3>Link to Project:</h3>
        <ul>
          <li>
            <p>
              <a
                rel="noreferrer"
                target="_blank"
                href="https://github.com/QC20/Haptic-Game-For-The-Blind"
              >
                <p>
                  <b>Link to github repo</b>
                </p>
              </a>
            </p>
          </li>
          <li>
            <a
              rel="noreferrer"
              target="_blank"
              href="https://github.com/QC20/Haptic-Game-For-The-Blind/tree/master/Controller-Designs"
            >
              <p>
                <b>Controller designs</b>
              </p>
            </a>
          </li>
        </ul>

        <LineSplit />
        {/* Tromino STARTS HERE */}
        <br></br>

        <h2>Tromino: A Tetris-like game run on a LCD1602 screen</h2>
        <br />

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, marginRight: 8 }}>
            <p>
              Taking something that wasn't supposed to be fun and hacking a game
              onto it to give it a new function not originally intended is a
              great pleasure of mine. In this project, I've taken the humble{" "}
              
              <a
                  href={"http://wiki.sunfounder.cc/index.php?title=LCD1602_Module"}
                  target="_blank"
                  rel="noopener nreferrer noreferrer"
                >
                   LCD1602 screen
                </a>
              {" "}- a display you'll usually encounter as a clock or
              as an interface for controlling some mundane machine - and
              transformed it into a pocket-sized gaming device. By hooking it up
              to an Arduino Uno microcontroller, I've enabled this simple
              display to host a captivating game you can play using its onboard
              buttons.{" "}
              <p>
                <br />
                This game, which I've dubbed "Tromino," is a unique twist on the
                classic Tetris. Instead of the familiar four-block{" "}
                <a
                  href={"https://en.wikipedia.org/wiki/Tetromino"}
                  target="_blank"
                  rel="noopener nreferrer noreferrer"
                >
                  tetrominos
                </a>
                ,{" "}
                <a
                  href={"https://en.wikipedia.org/wiki/Tromino"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tromino
                </a>{" "}
                uses three-block pieces called trominos. These L-shaped or
                straight-line shapes add an interesting challenge to the
                gameplay, forcing players to think differently about how they
                fit pieces together. The game logic follows the core principles
                of Tetris but with some adaptations to suit the limited 16x2
                display. Trominos fall from the top of the screen, and players
                must rotate and position them to create solid lines across the
                bottom. When a line is completed, it disappears, and the player
                scores points. The game progressively speeds up as you play,
                increasing the challenge and excitement.{" "}
              </p>
              <br />
              <p>
                What makes this project particularly intriguing is how it pushes
                the boundaries of what's possible with such limited hardware.
                The 16x2 LCD screen, typically used for simple text displays,
                now becomes a dynamic playground. The onboard buttons, usually
                meant for menu navigation, are repurposed as game controls. It's
                a testament to the idea that with a bit of creativity and
                coding, you can breathe new life into seemingly basic
                electronics. This project not only showcases the versatility of
                Arduino and LCD screens but also demonstrates how we can
                reimagine and repurpose everyday technology. It's a perfect
                blend of nostalgia for classic games and the maker spirit of
                creating something unique and unexpected.{" "}
              </p>
              <br />
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginRight: "0px",
              marginTop: "-75px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                width: "85%",
                marginLeft: "0px",
                marginTop: "20%",
              }}
            >
              <VideoAsset src={TrominoVidDemo} />
            </div>
            <p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div>
                  <b>Image 8: </b> Top view of the Tromino case showing
                  {/* Add a space after the colon */}
                </div>
                <div style={{ marginLeft: "4.5em" }}>
                  the game run in real-time.
                </div>
              </div>
              <br />
            </p>
          </div>
        </div>
        <br />
        <div style={{ display: "flex" }}>
          {/* First Tromino image */}
          <div style={{ flex: 1, marginRight: 16 }}>
            <div className="captioned-image">
              <img src={TromnoStartScreen2} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 9:</b> Zoomed-out Tromino controller.{" "}
                </sub>
              </p>
            </div>
          </div>

          {/* Second Tromino image */}
          <div style={{ flex: 1, marginRight: 16 }}>
            <div className="captioned-image">
              <img src={TromnoInGame} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 10:</b> Tromino Gameplay window.{" "}
                </sub>
              </p>
            </div>
          </div>

          {/* Third Tromino image */}
          <div style={{ flex: 1 }}>
            <div className="captioned-image">
              <img src={TromnoGameOver} style={{ width: "100%" }} alt="" />
              <p>
                <sub>
                  <b>Image 11:</b> Tromino 'Game Over' and score window.{" "}
                </sub>
              </p>
            </div>
          </div>
        </div>

        <h3>Link to Project:</h3>
        <ul>
          <li>
            <p>
              <a
                rel="noreferrer"
                target="_blank"
                href="https://github.com/QC20/Tromino"
              >
                <p>
                  <b>Link to github repo</b>
                </p>
              </a>
            </p>
          </li>
          <li>
            <a
              rel="noreferrer"
              target="_blank"
              href="https://github.com/QC20/Tromino/tree/main/STL"
            >
              <p>
                <b>Controller designs</b>
              </p>
            </a>
          </li>
        </ul>

        <LineSplit />
        <br />

        <div className="text-block">
          <h2>DIY Arduino UNO Controller</h2>

          <p>
            The DIY Arduino Board project is designed for electronics experts,
            offering a versatile and adaptable microcontroller platform.
            Originally, the Arduino platform was created to reduce the cost of
            microcontrollers in educational settings and make electronics and
            programming accessible to users with varying levels of technical
            expertise.
          </p>
          <br />
          <p>
            This project provides a DIY Arduino board that closely resembles the
            classic Arduino Uno but with a slimmer profile and enhanced hardware
            flexibility.
          </p>
          <br />
          <div style={{ display: "flex" }}>
            <div
              style={{
                flex: 1,
                textAlign: "justify",
                alignSelf: "center",
                flexDirection: "column",
                marginRight: 32,
              }}
            >
              <h3>Usage and Applications</h3>
              <p>
                The DIY Arduino board's adaptability and low power consumption
                make it ideal for a wide range of applications, including but
                not limited to:
              </p>
              <br />
              <p>
                <b>Internet of Things (IoT) Networks:</b> Build low-power IoT
                devices that can operate for extended periods.
              </p>
              <p>
                <b>Portable Sensors:</b>Create battery-operated sensors for data
                collection in remote or mobile applications.
              </p>
              <p>
                <b>Wireless Device Controllers:</b>Design custom wireless
                controllers for various devices and systems.
              </p>
              <br />
              <br />
              <br />
              <br />
              <br />
              <div style={{ textAlign: "right", marginLeft: 75 }}>
                <p> Click the icon to learn more.</p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: "flex-end",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <img
                    src={githubWindows}
                    style={{ width: "100%", marginTop: -130, marginLeft: -10 }}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <img
                  src={diyArduinoController}
                  style={{ width: "100%" }}
                  alt=""
                />
              </div>
              {/* Adjusted width */}
              <p>
                <sub>
                  <b>Image 12:</b> RGB light circling through its colors. Find
                  other code examples{" "}
                  <a
                    href="https://github.com/QC20/DIY-Arduino-Controller/tree/main/Code%20Examples"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    here.
                  </a>
                </sub>
              </p>
            </div>
          </div>
          <p></p>
          <br />
          <div className="captioned-image">
            <img src={diyArduinoSetup2} style={{ width: "100%" }} alt="" />
            <p>
              <sub>
                <b>Image 13:</b> Top view of the DIY setup.
                <a
                  href={
                    "https://github.com/QC20/DIY-Arduino-Controller/blob/main/Upload/img/DIY_arduino_wiring_with_legend.png"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here
                </a>{" "}
                to see schematic.
              </sub>
            </p>
          </div>
          <h3>Link to Project:</h3>
          <ul>
            <li>
              <p>
                <a
                  rel="noreferrer"
                  target="_blank"
                  href="https://github.com/QC20/DIY-Arduino-Controller/tree/main"
                >
                  <p>
                    <b>Link to github repo</b>
                  </p>
                </a>
              </p>
            </li>
          </ul>
          <LineSplit />
          <br />
          <div className="text-block">
            <br />
            <h2> Light Sensitive Interactive Particle Simulator </h2>
            <br />
            <p>
              Explore the mesmerizing world of particle simulation with this
              interactive application built using the{" "}
              <Link to="https://processing.org/" target="_blank">
                Processing framework
              </Link>
              , mouse-input, and a{" "}
              <Link
                to="https://diyodemag.com/education/classroom_how_light_dependent_resistors_ldr_work_with_arduino_raspberry_pi"
                target="_blank"
              >
                light dependent resistor
              </Link>{" "}
              (LDR). Watch as particles dance across the screen, their movements
              dictated by both your mouse's position and real-world sensor data
              handled through an Arduino board. In this demonstration, an LDR
              sensor takes center stage, but the possibilities are endless – you
              can seamlessly integrate various sensor inputs and tweak the code
              to suit your creative vision.
            </p>
            <br />
            <div className="captioned-image">
              <VideoAsset src={LDRParticleSim} />

              <p>
                <sub>
                  <b>Image 14:</b> Live demo of the{" "}
                  <a
                    href="https://github.com/QC20/Screensaver-LDR"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LDR interactive screensaver
                  </a>{" "}
                  reacting to the mouse placement and the sorrounding light.
                </sub>
              </p>
            </div>
            <p>
              In this project, deliberate user input, like mouse interactions,
              merges with the dynamic influence of ambient light. It's about
              blending control with environmental responsiveness, creating an
              interactive experience that blurs the line between user agency and
              natural influence. While we start with mouse and light, the
              project encourages exploration: How might we utilize gyroscopic
              positioning as user input? Instead of reacting to light, what if
              it responded to variations in sound intensity, or dynamically
              reacted to specific spoken words? These uncontrolled elements hold
              the potential to transform the user's journey, opening doors to
              new realms of exploration and creativity.{" "}
            </p>
          </div>
          <LineSplit />
        </div>
      </div>
    </div>
  );
};

export default ArtProjects;
