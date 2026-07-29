# Vendored Windows 98 programs

Static copies of the programs from **98.js** (<https://98.js.org>, by Isaiah
Odhner, MIT License). They are served as plain files — webpack never touches
them — and are opened in desktop windows by
`src/components/applications/ProgramFrame.tsx`, driven by the list in
`src/components/applications/win98Programs.ts`.

## Why the directory layout matters

Each program's page reaches back out of its own folder for shared code:

```html
<script src="../../lib/jquery.min.js"></script>
<script src="../../src/msgbox.js"></script>
<link href="../../images/icons/notepad-16x16.png" rel="icon">
```

So `lib/`, `src/`, `font/` and `images/` sit beside `programs/` exactly as they
do upstream. **Moving `programs/` up a level, or these folders down one, breaks
every program at once.** Add new ones as `programs/<name>/`.

## What was left out

The upstream repo is far larger than a portfolio needs, so the copies are
pruned of things nothing fetches at runtime:

- **jspaint** — `cypress/`, packaging and lint config, `discord-activity/`, and
  `lib/tracky-mouse/` (its script tags are commented out upstream). pdf.js keeps
  only what jspaint asks for: `build/pdf.js`, `build/pdf.worker.js` and
  `web/cmaps/`; its source maps and standalone viewer are gone.
- **calculator** — `mcalculator/engine/`, the C++ sources the engine is built
  from. Only `mcalculator/server/public/` is loaded at runtime.
- **winamp** — the unminified Webamp bundle and its source map.
- **pipes** — the README screencap GIF and packaging files.

## Local changes

Two files differ from upstream, both marked with a `PORTFOLIO` comment:

- `src/filesystem-setup.js` — points BrowserFS at `/98/` instead of the site
  root, since 98.js *is* its site and this one is not. Without it BrowserFS
  fails to configure and Notepad's and Sound Recorder's file handling throws.
- `programs/command/index.html` — dispatches `game-loaded` on its own frame once
  DOSBox has booted, so the window can drop its "Starting…" overlay. Pinball
  already did this; MS-DOS Prompt didn't.

`programs/winamp/index.html` is new. Upstream renders Webamp straight into the
desktop document, so there was no page to copy; this one hosts it in a frame and
posts up to the parent when Webamp's own close or minimize button is used.

## A hosting gotcha

`vercel.json` rewrites `/(.*)` to `/index.html` for client-side routing. That is
safe here because Vercel checks the filesystem *before* applying rewrites, so
these files win — same as `public/js-dos/` and the `.jsdos` bundles already do.

A host that rewrites first, or that strips `/index.html` from URLs, hands the
portfolio's own page back to the iframes instead, and every program window
renders a tiny copy of the desktop. (`npx serve -s build` does exactly this, so
don't use it to check a build — `npx serve build`, without `-s`, is fine.) If
that ever happens, exclude this folder from the rewrite:

```json
{ "source": "/((?!98/).*)", "destination": "/index.html" }
```

## External dependency

**MS-DOS Prompt** loads DOSBox from `https://js-dos.com/cdn/js-dos-api.js` at
runtime and takes a few seconds to boot. It is the only program here that needs
anything off this origin; if that CDN ever goes away, this is the one to fix.
(3D Pipes prefers a CDN copy of three.js but falls back to its bundled
`lib/three.min.js`.)
