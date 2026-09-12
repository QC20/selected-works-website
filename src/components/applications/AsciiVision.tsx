/**
 * Dead file. Kept only so the deletion is a deliberate decision rather than
 * an accident, and neutered so it cannot do any harm while it sits here.
 * ---------------------------------------------------------------------
 * This is not a desktop application, despite living in `applications/` and
 * carrying a `.tsx` extension. It is a Chrome extension content script that
 * ended up in the repository by mistake — its first line still says
 * `contentScript.js`. It has never been imported by anything: the AsciiVision
 * references elsewhere in this codebase (`githubProjects.ts`, the Music
 * showcase page) are to the *project* of that name, which lives on GitHub
 * Pages and is reached through Internet Explorer like every other side
 * project.
 *
 * What it used to do, at module scope, was append a fixed blue "dr.dk" button
 * to `document.body` and wire it to `window.location.href = 'https://www.dr.dk/'`.
 * Because that call sat at the top level rather than inside a component, the
 * first `import` of this path from anywhere would have put a navigation-away
 * button on the desktop with no further action required — a landmine with a
 * ten-year fuse in a folder every new app gets added to.
 *
 * The body has been removed. Deleting the file is the right end state; it is
 * left in place, inert, so that is somebody's decision rather than a diff
 * nobody noticed.
 */

export {};
