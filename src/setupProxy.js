/**
 * Dev-server wiring for the serverless functions in `/api`.
 *
 * On Vercel those files are deployed as functions and `/api/stock` just works.
 * `npm start` only serves the CRA bundle, so without this the Market Watch app
 * would 404 in development and work in production — the worst way round.
 *
 * Create React App hands us the dev server's Express app here, so the same
 * handler module is mounted at the same path. It's the function itself, not a
 * proxy to a running copy of it, which is why the two behave identically.
 *
 * This file is only ever read by the dev server; it isn't part of the build.
 */

const stock = require('../api/stock');
const feed = require('../api/feed');
const obsidian = require('../api/obsidian');
const zotero = require('../api/zotero');

/**
 * All four behave the same way and only differ by name, so they're mounted
 * from one list rather than four near-identical blocks.
 */
const handlers = {
    '/api/stock': stock,
    '/api/feed': feed,
    '/api/obsidian': obsidian,
    '/api/zotero': zotero,
};

module.exports = function (app) {
    Object.keys(handlers).forEach((path) => {
        app.use(path, (req, res) => {
            Promise.resolve(handlers[path](req, res)).catch((error) => {
                // eslint-disable-next-line no-console
                console.error(`[${path.slice(1)}]`, error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Local API handler failed.' });
                }
            });
        });
    });
};
