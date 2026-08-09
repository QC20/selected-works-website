/**
 * Screen furniture the whole desktop has to agree about.
 *
 * The taskbar's height is not only the taskbar's business: the icon grid stops
 * above it, a maximized window stops above it, and Clippy and the first-run
 * balloon sit on top of it. Those four used to carry their own copies of the
 * number and drift apart whenever it changed, so it lives here instead.
 */

/**
 * How tall the grey bar along the bottom is, in desktop (scaled) pixels.
 *
 * It was 32 for a long time, which is what Windows 95 used on a 640x480 CRT
 * viewed from a foot away. On a phone or an iPad held at arm's length that bar
 * is easy to miss entirely, so it's a little taller now — enough to notice and
 * to hit with a thumb, not enough to stop looking like Windows 95.
 */
export const TASKBAR_HEIGHT = 36;

/**
 * Clearance kept below the icon grid. A shortcut is taller than its slot once
 * you count the label, so it needs a few pixels more than the bar itself.
 */
export const TASKBAR_CLEARANCE = TASKBAR_HEIGHT + 8;
