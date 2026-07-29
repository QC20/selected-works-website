declare module '*.pdf';

/**
 * Create React App types images but not media, so audio and video imports have
 * historically needed a `@ts-ignore` above each one. Declaring them here means
 * webpack's URL is typed as the string it actually is.
 */
declare module '*.mp3' {
    const src: string;
    export default src;
}

declare module '*.wav' {
    const src: string;
    export default src;
}

declare module '*.mp4' {
    const src: string;
    export default src;
}
