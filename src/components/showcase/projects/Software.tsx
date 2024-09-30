/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/jsx-no-comment-textnodes */
import React, { useCallback, useEffect, useState } from "react";
// @ts-ignore
// @ts-ignore
import computer from "../../../assets/pictures/projects/software/computer.mp4";
// @ts-ignore
import black from "../../../assets/pictures/projects/software/black.png";
import circle from "../../../assets/pictures/projects/software/circle.png";
import ResumeDownload from "../ResumeDownload";
import LineSplit from "../../showcase/LineSplit";
import VideoAsset from "../../general/VideoAsset";

import rasPiCase from "../../../assets/pictures/projects/software/rasPiCase.jpg";
import imAlwaysThisKind from "../../../assets/pictures/projects/software/imAlwaysThisKind.gif";
import rasPiHat from "../../../assets/pictures/projects/software/rasPiHat.jpg";
import eyeTrackingStudy from "../../../assets/pictures/eyeTrackingSetup.jpeg";
import { Link } from "react-router-dom";
import EffectsOfMusicOnReading from "../../../assets/documents/EffectsOfMusicOnReading.pdf";

import eyeTracking2 from "../../../assets/pictures/projects/software/eyetracking2.gif";
import eyeTracking1 from "../../../assets/pictures/projects/software/eyetracking3.gif";
import eyeTracking3 from "../../../assets/pictures/projects/software/eyetracking4.gif";

import blimp from "../../../assets/pictures/projects/software/Blimps.jpg";

export interface SoftwareProjectsProps {}
export interface DesktopProps {}

const SoftwareProjects: React.FC<SoftwareProjectsProps> = (props) => {
  return (
    <div className="site-page-content">
      <h1>Coding and Programming</h1>
      <h3>Projets</h3>
      <br />
      <p>
        Welcome to my projects section, where you'll discover a range of
        endeavors I've undertaken. What ties them all together? They're
        exclusively PC-based, ensuring you can effortlessly run them on your own
        device. Embracing the ethos of open-source software, everything
        showcased here is accessible for you to explore and recreate at your
        leisure.
      </p>
      <br />
      <p>
        These projects reflect my diverse programming interests, encompassing
        everything from data science and machine learning to creative coding,
        web development, and UX/UI design. While I also delve into physical
        computing, you'll find those projects in a{" "}
        <a href="/projects/art">dedicated section</a>. Immerse yourself and
        explore the intersection of technology and creativity!
      </p>
      <br />
      <ResumeDownload />

      <div className="text-block">
        <br />
        <h2>
          <img
            src={imAlwaysThisKind}
            width="18%"
            alt="Jonas Kjeldmand Jensen"
          ></img>{" "}
          VoiceWhiz{" "}
        </h2>
        <br />
        <p>
          VoiceWhiz, your standalone voice user interface powered by a Raspberry
          Pi, revolutionizes your interactions with its advanced capabilities.
          As a voice-controlled device, VoiceWhiz allows you to effortlessly
          engage in conversations, providing intelligent responses to your
          inquiries and tasks. Utilizing OpenAI's state-of-the-art language
          model, it serves as your personal assistant, offering assistance with
          questions, information retrieval, suggestions, jokes, and
          storytelling.
          <br />
          With seamless transitions between spoken and written responses,
          VoiceWhiz adapts to your device's display capabilities, ensuring a
          smooth user experience.
        </p>
        <br />
        <div className="captioned-image">
          <img
            src={rasPiCase}
            style={{ width: "75%" }}
            alt="Jonas Kjeldmand Jensen Voice User Interface (VUI / CUI)ß"
          />

          <p>
            <sub>
              <b>Image 1:</b> Image of{" "}
              <a
                href="https://github.com/QC20/VoiceWhiz"
                target="_blank"
                rel="noopener noreferrer"
              >
                VoiceWhiz'
              </a>{" "}
              sleek design in its round 3D printed case.
            </sub>
          </p>
        </div>
        <p>
          The VoiceWhiz design centers around a Raspberry Pi serving as the core
          single-board computer. This compact yet powerful device facilitates
          seamless operation. Sound input is captured through a USB-driven
          microphone connected to the Pi, while audio output is facilitated by a
          speaker attached via the 1/8 audio jack.
          <br />
          The implementation of VoiceWhiz's functionality is executed in Python.
          Presently, VoiceWhiz is equipped with a local LLM (Mistral-7B),
          resulting in slight response delays due to the Pi4's 1.6 GHz CPU
          limitation.{" "}
        </p>
        <p>
          Next step in the project is to change out the microphone to a{" "}
          <Link
            to="https://files.seeedstudio.com/wiki/ReSpeaker_6-Mics_Circular_Array_kit_for_Raspberry_Pi/img/6-mic.jpg"
            target="_blank"
          >
            6-Way Circular hat
          </Link>{" "}
          to be able to pick up voice prompts even better.{" "}
        </p>
        <br />
        <h3>Link to Project:</h3>
        <ul>
          <li>
            <a
              rel="noreferrer"
              target="_blank"
              href="https://github.com/QC20/VoiceWhiz"
            >
              <p>
                <b>Rasberry Pi Voice User Interface</b> - VoiceWhiz{" "}
              </p>
            </a>
          </li>
        </ul>
      </div>
      <LineSplit />

      <div className="text-block">
        <br />
        <h2>How do music and sound influence normal reading?</h2>
        <h3>- using eye-tracking and data science</h3>
        <br />

        <div
          style={{
            display: "flex",
            alignItems: "right",
            flexDirection: "row-reverse",
          }}
        >
          <div style={{ flex: 1, marginLeft: "-170px" }}>
            <p>
              Ever wondered how music or white/pink noise shapes your reading
              experience? Imagine yourself diving into news articles or delving
              into deep work, seeking to enter the zone. You reach for your
              special concentration playlist, believing in the transformative
              power of these sounds to enhance your reading speed and
              comprehension. But what if those assumptions were put to the test?
              In this exploration, we sought to challenge the notion that
              background sounds offer a positive boost to reading. With 12
              participants in our lab, we set out to understand how sound
              influences reading. Using eye-tracking technology, we captured
              reactions to different auditory stimuli. Then, leveraging data
              science and machine learning, we uncovered insights from the data.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "-15px" }}>
              <img
                src={eyeTracking2}
                style={{ width: "60%" }}
                alt="Jonas Kjeldmand Jensen"
              />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "right" }}>
                <img
                  src={eyeTracking1}
                  style={{ width: "140%" }}
                  alt="Jonas Kjeldmand Jensen"
                />
              </div>
            </div>
          </div>
        </div>

        <br />
        <p>
          {" "}
          Intrigued? Explore the{" "}
          <a
            href="https://colab.research.google.com/drive/18uAhdDBVRdKZpIJBxoPDzkJRYyyWtue3?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
          >
            code implementation
          </a>{" "}
          for a deeper dive into our findings. Looking to freshen up on your
          eye-tracking tech know-how? Check out{" "}
          <a
            href="https://imotions.com/blog/learning/best-practice/eye-tracking/"
            target="_blank"
            rel="noopener noreferrer"
          >
            this site
          </a>{" "}
          for all the basics you need to know – it's a solid recommendation to
          level up your understanding.{" "}
        </p>
        <br />
        <div className="captioned-image">
          <img src={eyeTrackingStudy} style={{ width: "75%" }} alt="" />

          <p>
            <sub>
              <b>Image 2:</b> Overview of the eye-tracking setup and its functionality, highlighting the equipment and process used for tracking eye movements.
            </sub>
          </p>
        </div>
        <p>
          Surprisingly, our findings revealed a different tune. Whether it's
          music or white/pink noise, none exhibited a positive impact on reading
          speed or comprehension compared to blissful silence. However, there's
          a noteworthy twist. Sounds brimming with high-pitched elements, such
          as snares, proved more disruptive to your reading flow. Moreover, in
          noisy environments like bustling cafes, specific types of sounds might
          offer a refuge from the ambient clamor. So, while the melody of your
          surroundings may not propel you forward in your reading journey, it
          can certainly alter the rhythm of your literary expedition. Ready to
          decipher the symphony hidden within your next read?{" "}
        </p>

        <br />
        <h3>Link to Project:</h3>
        <ul>
          <li>
            <p>
              <a
                rel="noreferrer"
                target="_blank"
                download
                href={EffectsOfMusicOnReading}
              >
                <p>
                  <b>Research Article</b> - Download the the study right here!{" "}
                </p>
              </a>
            </p>
          </li>
          <li>
            <a
              rel="noreferrer"
              target="_blank"
              href="https://github.com/QC20/eye-tracking-study-music-effect"
            >
              <p>
                <b>Study Repo</b> - The Effects of Arousing Music on Normal
                Reading{" "}
              </p>
            </a>
          </li>
        </ul>
      </div>
      <LineSplit />
      <div className="text-block">
        <h2>Generate 3D models with Python</h2>
        <br />
        <p>
          This project showcases the generation of a visually captivating
          blimp-like 3D figure using a Python script. Rather than relying on
          traditional computer-aided design (CAD) software or using an
          in-between software like OpenCAD, the figure is constructed entirely
          through code, providing a novel and challenging approach to 3D
          modeling. Enjoy!{" "}
        </p>
        <br />
        <div className="captioned-image">
          <img src={blimp} style={{ width: "80%" }} alt="" />
          <p style={styles.caption}>
            <sub>
              <b>Image 1:</b> 3D model of the model in two different sizes.
            </sub>
          </p>
        </div>
        <p>
          Explore the exciting world of 3D figure creation with our
          unconventional twist {"-"} a Python script that crafts a
          blimp-inspired shape, breaking away from conventional CAD software.
          This project boldly ventures into the frontier of computational
          modeling, showcasing the endless possibilities of code-driven
          creativity. Immerse yourself in the captivating fusion of mathematics,
          computer science, and imagination as you run this script. Witness the
          emergence of a mesmerizing blimp-like figure, a testament to the
          boundless exploration in the world of computational 3D modeling.{" "}
        </p>
        <br />
        <h3>Links:</h3>
        <ul>
          <li>
            <a
              rel="noreferrer"
              target="_blank"
              href="https://github.com/QC20/3D-Blimp"
            >
              <p>
                <b>GitHub Repo</b> - Blimp-Like 3D Figure Generation with Python
                Script
              </p>
            </a>
          </li>
        </ul>
      </div>

      <ResumeDownload />
    </div>
  );
};

const styles: StyleSheetCSS = {
  video: {
    width: "100%",
    padding: 12,
  },
  caption: {
    width: "80%",
  },
};

export default SoftwareProjects;
