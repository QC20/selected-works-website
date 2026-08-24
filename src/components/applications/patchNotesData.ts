/**
 * What Patch Notes shows.
 *
 * Newest first. Each entry is one area of the desktop and the dates are the real
 * ones from the project's history, so this reads as a change log rather than
 * decoration. Add to the top when you ship something.
 *
 * Modelled on `patchNotes.js` in Yute's Windows95 Portfolio, which is where the
 * idea of shipping the change log as an app in the Utility folder comes from.
 *
 * The entries themselves live in `src/data/patchNotes.json`, not here — that's
 * what lets `api/feed.js` (the RSS feed, plain CommonJS, outside webpack) read
 * the exact same list a `require()` away instead of a second copy quietly
 * drifting out of sync with this one. Edit the JSON file when shipping
 * something; this file is just the typed view of it.
 */

import patchNotesJson from '../../data/patchNotes.json';

export interface PatchNote {
    /** The area of the desktop this batch of work touched. */
    head: string;
    /** ISO date, shown as-is. */
    date: string;
    /** One or two sentences on why this got built, not just what shipped. */
    why?: string;
    notes: string[];
}

const patchNotes: PatchNote[] = patchNotesJson;

export default patchNotes;
