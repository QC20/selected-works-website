/**
 * The real DJ sets, handed to Winamp.
 * ------------------------------------
 * The same four recordings the Music showcase project plays through its own
 * `MusicPlayer`, imported again here rather than re-exported from there: a
 * webpack asset import resolves to a URL string, and importing the same file
 * twice costs nothing extra on disk or in the bundle — both call sites get
 * the identical content-hashed file webpack already emits once.
 *
 * Durations are read directly off each file with ffprobe rather than
 * guessed, since Webamp's playlist and progress bar both trust whatever
 * number they're given up front.
 */

import quantumSession from '../../assets/audio/NChainsQuantumSession.mp3';
import soundCafeSession from '../../assets/audio/NChainzSoundCafeSession.mp3';
import byensRadioMix from '../../assets/audio/ProaktiveSelektorByensRadioradiorip.mp3';
import tellThem from '../../assets/audio/TellThem.mp3';

export interface DjTrack {
    metaData: { artist: string; title: string };
    url: string;
    duration: number;
}

export const DJ_SETS: DjTrack[] = [
    {
        metaData: { artist: 'N-Chainz', title: 'Live DJ Set @ Quantum II' },
        url: quantumSession,
        duration: 3517.224,
    },
    {
        metaData: {
            artist: 'N-Chainz',
            title: 'Live Vinyl DJ Set @ Soundtrack Cafe',
        },
        url: soundCafeSession,
        duration: 5380.206,
    },
    {
        metaData: {
            artist: 'Proaktiv Selektor',
            title: "Byens Radio Pirate Radio Rip (c. 2013)",
        },
        url: byensRadioMix,
        duration: 4174.211,
    },
    {
        metaData: { artist: 'N-Chainz', title: 'Tell Them' },
        url: tellThem,
        duration: 150.047,
    },
];
