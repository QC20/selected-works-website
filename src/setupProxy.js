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

module.exports = function (app) {
    app.use('/api/stock', (req, res) => {
        Promise.resolve(stock(req, res)).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('[api/stock]', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Local API handler failed.' });
            }
        });
    });
    app.use('/api/feed', (req, res) => {
        Promise.resolve(feed(req, res)).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('[api/feed]', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Local API handler failed.' });
            }
        });
    });
};
