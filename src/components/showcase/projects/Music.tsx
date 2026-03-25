/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect, useCallback } from "react";
// @ts-ignore
import house from "../../../assets/audio/agressive_phonk.mp3";
// @ts-ignore
//import SoundCafeSessions from '../../../assets/audio/NChainzSoundCafeSession.mp3';
import SoundCafeSessions from "../../../../src/assets/audio/NChainzSoundCafeSession.mp3";
// @ts-ignore
//import QuantumSessions from '../../../assets/audio/NChainsQuantumSession.mp3';
import QuantumSessions from "../../../../src/assets/audio/NChainsQuantumSession.mp3";
// @ts-ignore
import ByensRadioMix from "../../../../src/assets/audio/ProaktiveSelektorByensRadioradiorip.mp3";
// @ts-ignore
import tellThem from "../../../../src/assets/audio/TellThem.mp3";
// @ts-ignore
import meDJing from "../../../assets/pictures/projects/art/MePlaying.mp4";
// @ts-ignore
import MinenParty from "../../../../src/assets/pictures/CROPPED-2014-11-09-01-37.mp4";
// @ts-ignore
import asciiMe from "../../../assets/audio/1-5mb.mp4";
// @ts-ignore
import PaintingPallets from "../../../assets/pictures/projects/art/PaintingPallets.mp4";

import Painting1 from "../../../../src/assets/pictures/projects/art/Painting1.jpg";
import Painting2 from "../../../../src/assets/pictures/projects/art/Painting2.jpg";
import Painting3 from "../../../../src/assets/pictures/projects/art/Painting3.jpg";

import meDJing2 from "../../../../src/assets/pictures/meDJing2.jpg";
// @ts-ignore
import lifeJourney from "../../../assets/pictures/projects/art/lifes-journey.mp4";

import MusicNote from "../../../assets/icons/MusicNote.gif";
import cdSpin from "../../../assets/pictures/cdSpin.gif";
import paintBrush from "../../../assets/pictures/projects/art/paint-brush.gif";

import { Link, MusicPlayer } from "../../general";
import { styles } from "../../os/DragIndicator";
import LineSplit from "../LineSplit";
import ResumeDownload from "../ResumeDownload";
import VideoAsset from "../../general/VideoAsset";

import Window from "../../os/Window";
import shortcut from "../../../../src/assets/pictures/projects/audio/shortcut.gif";

interface MusicProjectsProps {}

// Detect platform for interaction hints
const getIsMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
};

const getIsTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

const MusicProjects: React.FC<MusicProjectsProps> = () => {
  const [currentSong, setCurrentSong] = useState("");
  const [iframeActive, setIframeActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMac = getIsMac();
  const isTouchDevice = getIsTouchDevice();

  useEffect(() => {
    const handleKeyDown = (event: MessageEvent) => {
      if (
        event.data.type === "keydown" &&
        (event.data.key === "ArrowUp" ||
          event.data.key === "ArrowDown" ||
          event.data.key === "ArrowLeft" ||
          event.data.key === "ArrowRight")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("message", handleKeyDown);

    return () => {
      window.removeEventListener("message", handleKeyDown);
    };
  }, []);

  // Deactivate iframe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        iframeContainerRef.current &&
        !iframeContainerRef.current.contains(e.target as Node)
      ) {
        setIframeActive(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Escape to deactivate and exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          setIframeActive(false);
        }
      }
    };

    const handleFullscreenChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement;
      if (!fsEl) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, [isFullscreen]);

  const activateIframe = useCallback(() => {
    setIframeActive(true);
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    const container = iframeContainerRef.current;
    if (!container) return;

    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if ((container as any).webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen();
    }
    setIsFullscreen(true);
    setIframeActive(true);
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  return (
    <div className="site-page-content">
      <h1>Arts & Design</h1>
      <h3>My creations - for the sake of just because..</h3>
      <br />

      <div className="text-block">
        <p>
          I have dedicated this section to my artistic endeavors, where I
          explore the realms of music, sound, and visual arts. I am deeply
          engrossed in having artistic outlets, whether they are analog or
          digital. I don't want to limit myself to any one canvas. This
          perspective has inspired me to explore a variety of instruments. For
          instance, I deeply appreciate the tactile experience and rich color
          spectrum achievable through oil painting, as well as the flexibility
          of the medium. I can leave my painting for three days, and when I
          resume working on it, it's as if I was never away.{" "}
        </p>
        <p>
          In a similar fashion, the computer screen presents itself as the
          canvas we collectively spend the most time looking at in our lives.
          Therefore, experimenting with this interface is a natural progression,
          especially because it allows for entirely new ways of incorporating
          responsive elements and exploring interaction design.{" "}
        </p>
        <br />
      </div>
      <ResumeDownload />
      <br />
      <h2>
        <img src={MusicNote} width="4%"></img> My Musical Passions
        <img src={MusicNote} width="4%"></img>
      </h2>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, marginRight: 32 }}>
          <p>
            Music has always been my passion. From the melodies to the lyrics,
            and from the intricate production techniques to the cultural impact
            it carries, every aspect fascinates me. My journey began at the age
            of 15 when I purchased my first set of{" "}
            <a
              href="https://www.technics.com/global/home/sl1200.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              Technics 1210
            </a>{" "}
            turntables.
            <p>
              This marked the beginning of my fascination with physical media
              and my exploration into DJing, music production, and exhibiting it
              to people at venues. By the time I was 19, I had joined the DJ
              collective,{" "}
              <a
                href="https://www.facebook.com/dubkultur"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dubkultur
              </a>
              , and for about 5 years, we organized and performed at events
              across Copenhagen. This experience kept me constantly engaged with
              the latest sounds and developments in the music scene. It also
              sparked my interest in music production, as I sought to capture
              the raw, DIY essence by creating, producing, publishing, and
              performing my own tracks.{" "}
            </p>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "-10px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <img src={meDJing2} style={{ width: "100%" }} alt="" />
          </div>
          {/* Adjusted width */}
          <p>
            <sub>
              <b>Image 1:</b> Me turning knobs at Bolsjefabrikken, Copenhagen.{" "}
            </sub>
          </p>
        </div>
      </div>

      <p>
        Music and sound immerse me in joy and thrills. Through this passion,
        I've delved into a multitude of digital audio workstations (DAWs),
        exploring the realms of{" "}
        <a
          href="https://www.reasonstudios.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Reason
        </a>
        ,{" "}
        <a
          href="https://www.apple.com/logic-pro/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Logic
        </a>
        , and{" "}
        <a
          href="https://www.ableton.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ableton
        </a>
        . But it doesn't stop there – it led me to experiment with visual art
        expressions and graphic design, expanding my creative horizons even
        further.
      </p>
      <p>
        From a young age, I've learned the intricacies of organizing memorable
        events and leading teams of activists. It's more than just a hobby; it's
        a lifestyle that continually shapes and enriches my journey.
      </p>

      <br />
      <p>
        As my musical taste takes many twists and turns, I prefer sharing the
        type of records I'm listening to rather than naming specific genres. If
        you're interested, feel free to have a look at my{" "}
        <a
          href="https://www.discogs.com/user/JonasKjeldmand/collection"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discogs record collection
        </a>
        .{" "}
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
      <h2>
        Recorded Mixes <img src={cdSpin} width="4%"></img>
      </h2>
      <br />
      <p>
        Besides spinning tunes and creating beats, I still make appearances on
        stage from time to time, although not as frequently as previously. Not
        to worry though, I've prepared a small selection of live mixes for your
        pleasure.{" "}
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
      <div className="captioned-image" style={{ width: "90%" }}>
        <VideoAsset src={meDJing} />
        <p style={styles.caption}>
          <sub>
            <b>Image 2: </b>
            Me spinning records at Soundtrack Cafe (Balders Plads, Copenhagen).
            Watch the entire recording{" "}
            <a
              href="https://www.youtube.com/watch?v=I8lCJ542q6s&t"
              target="_blank"
              rel="noopener noreferrer"
            >
              here.
            </a>
          </sub>
        </p>
      </div>

      <p>
        If you've found this section interesting and would like to learn more,
        collaborate, or simply chat about records, feel free to reach out.{" "}
      </p>

      <br />
      <LineSplit />
      <br />
      <br />
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "right",
        }}
      >
        Interactive ASCII Visionarium
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row-reverse",
        }}
      >
        <div style={{ flex: 1, marginLeft: 32 }}>
          <p>
            AsciiVision is a captivating creative coding venture that blends
            interaction design with some type of artistic retro vibe. Drawing on
            your gullibility to give me access to your device's webcam via the
            Camera API, AsciiVision seamlessly transforms the tangible into the
            digital. Using JavaScript some wizardry, it transforms each pixel's
            luminosity into a unique{" "}
            <a
              href="https://en.wikipedia.org/wiki/ASCII"
              target="_blank"
              rel="noopener noreferrer"
            >
              ASCII
            </a>{" "}
            character, providing a dynamic interpretation of the live video
            feed. I invite my users to experience this immersive and
            exhilarating journey delivered by this fusion of interactive
            computing and creative coding. You can even invert the colors. Have
            fun playing around :-){" "}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginRight: "-82px",
            marginTop: "-20px",
          }}
        >
          <div
            style={{ textAlign: "center", width: "85%", marginLeft: "-75px" }}
          >
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
                <b>Live Website</b> - go check out the live demo!{" "}
              </p>
            </a>
          </p>
        </li>
      </ul>
      <br />

      <LineSplit />
      <br />
      <div className="text-block">
        <h2>Cellular ASCIImata</h2>
        <br />
        <p>
          There is something quietly mesmerizing about watching complexity
          emerge from nothing. Cellular ASCIImata is a generative art piece
          that takes{" "}
          <a
            href="https://en.wikipedia.org/wiki/Cellular_automaton"
            target="_blank"
            rel="noopener noreferrer"
          >
            cellular automata
          </a>{" "}
          and renders their evolving states entirely through ASCII characters,
          producing a living grid of typography that mutates and reorganizes
          itself in real time. The underlying computation runs on WebGL
          fragment shaders using a modified{" "}
          <a
            href="https://en.wikipedia.org/wiki/Von_Neumann_neighborhood"
            target="_blank"
            rel="noopener noreferrer"
          >
            von Neumann neighborhood
          </a>
          , but none of that scaffolding is visible to the eye. What you
          actually see is pure emergence: characters blooming and decaying
          across the grid, shaped by nothing more than their immediate
          neighbors and a set of deterministic rules that somehow produce
          results that feel deeply organic.
        </p>
        <p>
          What draws me to this kind of work is the tension between rigid
          mathematical systems and the unpredictable visual complexity they
          produce. The piece is built on top of{" "}
          <a
            href="https://p5js.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            p5.js
          </a>{" "}
          and the{" "}
          <a
            href="https://github.com/humanbydefinition/p5.asciify"
            target="_blank"
            rel="noopener noreferrer"
          >
            p5.asciify
          </a>{" "}
          library, keeping it deliberately dependency-light. Interactivity is
          baked in from the ground up: you can switch character sets, toggle
          kaleidoscope mirroring, invert the display, or just let it run and
          watch the system settle into its own rhythm. No two resets produce
          the same result. I encourage you to click into the window below and
          play around for a while.
        </p>
        <br />

        {/* Interactive iframe container with click-to-activate and fullscreen */}
        <div
          ref={iframeContainerRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "100%",
            margin: "0 auto",
            borderRadius: isFullscreen ? 0 : 4,
            overflow: "hidden",
            backgroundColor: "#222323",
            ...(isFullscreen
              ? {
                  position: "fixed" as const,
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100vw",
                  height: "100vh",
                  maxWidth: "100vw",
                  zIndex: 99999,
                }
              : {}),
          }}
        >
          {/* The iframe itself */}
          <iframe
            ref={iframeRef}
            src="https://qc20.github.io/Cellular-Asciimata/"
            title="Cellular ASCIImata"
            allow="fullscreen"
            style={{
              width: "100%",
              height: isFullscreen ? "100vh" : "600px",
              border: "none",
              display: "block",
              pointerEvents: iframeActive ? "auto" : "none",
            }}
            tabIndex={0}
          />

          {/* Click-to-activate overlay (shown when iframe is not active) */}
          {!iframeActive && (
            <div
              onClick={activateIframe}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
                transition: "opacity 0.25s ease",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "#f0f6f0",
                  fontFamily: "monospace",
                  userSelect: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    marginBottom: 8,
                    letterSpacing: 2,
                    fontWeight: 700,
                    textShadow: "0 2px 16px rgba(0,0,0,0.6)",
                  }}
                >
                  {isTouchDevice ? "Tap to interact" : "Click to interact"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                    textShadow: "0 1px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  {isTouchDevice
                    ? "Swipe to pan · Double-tap to resize"
                    : "Click outside the frame to release"}
                </div>
              </div>
            </div>
          )}

          {/* Control bar at the bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
              pointerEvents: "auto",
              opacity: iframeActive ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            {/* Keyboard hints (left side) */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {!isTouchDevice && (
                <>
                  {[
                    { key: "WASD", label: "Move" },
                    { key: "Space", label: "Pause" },
                    { key: "R", label: "Reset" },
                    { key: "K", label: "Kaleidoscope" },
                    { key: "C", label: "Colors" },
                    { key: "+/-", label: "Font size" },
                  ].map((hint) => (
                    <span
                      key={hint.key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "rgba(240,246,240,0.65)",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#f0f6f0",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {hint.key}
                      </span>
                      {hint.label}
                    </span>
                  ))}
                </>
              )}
              {isTouchDevice && (
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(240,246,240,0.65)",
                    fontFamily: "monospace",
                  }}
                >
                  Swipe to pan · Double-tap to resize
                </span>
              )}
            </div>

            {/* Right side buttons */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Deactivate button */}
              {iframeActive && !isFullscreen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIframeActive(false);
                  }}
                  title="Release focus (Esc)"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 4,
                    color: "#f0f6f0",
                    fontSize: 11,
                    fontFamily: "monospace",
                    padding: "4px 10px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.22)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.12)")
                  }
                >
                  {isMac ? "Esc" : "Esc"} · Release
                </button>
              )}

              {/* Fullscreen button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFullscreen) {
                    exitFullscreen();
                  } else {
                    enterFullscreen();
                  }
                }}
                title={
                  isFullscreen
                    ? "Exit fullscreen (Esc)"
                    : "Enter fullscreen"
                }
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  color: "#f0f6f0",
                  fontSize: 13,
                  padding: "4px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255,255,255,0.22)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255,255,255,0.12)")
                }
              >
                {isFullscreen ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    Exit
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    Fullscreen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 8 }}>
          <sub>
            <b>Image 3:</b> Live{" "}
            <a
              href="https://qc20.github.io/Cellular-Asciimata/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cellular ASCIImata
            </a>{" "}
            running in real time. {isTouchDevice
              ? "Tap the frame to interact, swipe to navigate the automaton space."
              : "Click into the frame to interact, click outside or press Esc to release."
            }
          </sub>
        </p>

        <br />
        <h3>Link to Project:</h3>
        <ul>
          <li>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href="https://github.com/QC20/Cellular-Asciimata"
            >
              <p>
                <b>Cellular ASCIImata</b> - Source code on GitHub{" "}
              </p>
            </a>
          </li>
        </ul>
      </div>
      <LineSplit />
      <br />
      <div className="text-block">
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "right",
          }}
        >
          <img src={paintBrush} width="15%" style={{ marginRight: "40px" }} />{" "}
          My Oil Paintings{" "}
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "row-reverse",
          }}
        >
          <div style={{ flex: 1, marginLeft: 32 }}>
            <p>
              A more recent activity I've been picking up is oil painting.
              What really excites me about this endeavor is that I have no
              prior experience whatsoever. Actually, growing up left-handed
              and with handwriting that was more or less intelligible, I guess
              I was somewhat deterred from drawing, painting, or doing
              anything by hand. <br />
              <br></br>
              However, in 2021, I started to pick up my first supplies and
              first clean canvas. Having no idea what I was doing or how to
              even begin learning, I decided to just throw myself into it and
              hope something beautiful would spawn out of it. Moreover, I
              think it was a deliberate decision of mine to not seek any type
              of help or teaching about techniques or styles. The reason for
              this was purely based on the idea that I wanted to see what I
              would be able to create purely based on my own intuition and
              creativity. <br /> <br></br>
              What excites and inspires me when conceptualizing a new canvas
              is starting from an initial feeling, exploring uncharted
              techniques, experimenting with new texture designs, or using
              paint products I haven't tried before. I persist until something
              I like emerges, and then I continue from there. Overall, a
              significant takeaway from oil painting is the opportunity to
              refine and practice skills I initially lacked proficiency or
              experience in. <br /> <br></br>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: "0px",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    width: "50%",
                    marginRight: "10px",
                  }}
                >
                  <img src={Painting2} style={{ width: "100%" }} alt="" />
                </div>
                <div
                  style={{
                    textAlign: "center",
                    width: "50%",
                    marginLeft: "10px",
                  }}
                >
                  <img src={Painting3} style={{ width: "100%" }} alt="" />
                </div>
              </div>
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginRight: "-82px",
              marginTop: "-85px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                width: "85%",
                marginLeft: "-75px",
              }}
            >
              <VideoAsset src={PaintingPallets} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicProjects;
