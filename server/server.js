/* ----------------------------------------------------------------
   Local / long-running server entry point.
   (On Vercel the app is imported by api/index.js instead.)
   ---------------------------------------------------------------- */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const app = require('./app');
const db = require('./db');
const store = require('./store');
const { PUBLIC_DIR, UPLOAD_DIR, ensureDirs } = require('./paths');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
    if (store.name === 'filesystem') ensureDirs();
    await db.ready(); // load / seed before accepting traffic

    const server = app.listen(PORT, HOST, () => {
        const hasResume = fs.existsSync(path.join(PUBLIC_DIR, 'Resume.pdf'));
        console.log('');
        console.log('  Sivapandi R — Portfolio server running');
        console.log('  ─────────────────────────────────────────────');
        console.log(`  Website      : http://localhost:${PORT}/`);
        console.log(`  Admin panel  : http://localhost:${PORT}/admin`);
        console.log(`  API health   : http://localhost:${PORT}/api/health`);
        console.log(`  Storage      : ${store.name} — ${store.description}`);
        if (store.name === 'filesystem') {
            console.log(`  Database     : ${db.DB_FILE}`);
            console.log(`  Uploads      : ${UPLOAD_DIR}`);
        }
        console.log(`  Resume.pdf   : ${hasResume ? 'found' : 'missing (upload one in the admin panel)'}`);
        if (
            process.env.NODE_ENV === 'production' &&
            store.name === 'filesystem' &&
            !process.env.DATA_DIR
        ) {
            console.warn(
                '  WARNING      : DATA_DIR is not set. On hosts with an ephemeral\n' +
                '                 filesystem your admin edits and messages will be\n' +
                '                 lost on every restart. Mount a disk and set DATA_DIR.'
            );
        }
        console.log('');
    });

    /* Make sure pending writes hit the disk on shutdown. */
    function shutdown(signal) {
        console.log(`\n[server] ${signal} received — flushing database…`);
        db.flush();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 2000);
    }
    ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
    process.on('exit', () => db.flush());
}

main().catch((err) => {
    console.error('[server] failed to start:', err);
    process.exit(1);
});
