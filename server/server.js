/* ----------------------------------------------------------------
   SIVAPANDI R — PORTFOLIO BACKEND
   Express API + static hosting for the public site and admin panel.
   ---------------------------------------------------------------- */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const { PUBLIC_DIR, UPLOAD_DIR, DATA_DIR, ensureDirs } = require('./paths');
const db = require('./db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const messageRoutes = require('./routes/messages');
const statsRoutes = require('./routes/stats');
const uploadRoutes = require('./routes/uploads');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

ensureDirs();
db.get(); // load / seed the database before serving traffic

app.set('trust proxy', 1);
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* Small security headers (no CSP: the site loads Google Fonts / Font Awesome / html2pdf from CDNs). */
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

/* ------------------------- API ------------------------- */
app.get('/api/health', (req, res) =>
    res.json({ ok: true, service: 'sivapandi-portfolio-api', uptime: process.uptime() })
);

app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', messageRoutes);
app.use('/api', statsRoutes);
app.use('/api', uploadRoutes);

app.use('/api', (req, res) =>
    res.status(404).json({ ok: false, error: `No API route for ${req.method} ${req.originalUrl}` })
);

/* --------------------- STATIC SITE --------------------- */
/* Registered before express.static so /admin does not 301 to /admin/. */
app.get(['/admin', '/admin/'], (req, res) =>
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'))
);

/* Uploads are served from UPLOAD_DIR, which may live outside PUBLIC_DIR
   when a persistent disk is mounted in production. */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h' }));

app.use(
    express.static(PUBLIC_DIR, {
        extensions: ['html'],
        setHeaders: (res, filePath) => {
            if (/\.(html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
        }
    })
);

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

/* Extension-less GETs fall back to the portfolio page; missing assets 404 as
   plain text so the browser never mistakes an error page for CSS/JS. */
app.use((req, res) => {
    if (req.method === 'GET' && !path.extname(req.path)) {
        return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    }
    res.status(404).type('txt').send('Not found');
});

/* ----------------------- ERRORS ------------------------ */
app.use((err, req, res, next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    if (status >= 500) console.error('[error]', err);
    res.status(status).json({ ok: false, error: err.message || 'Unexpected server error.' });
});

const server = app.listen(PORT, HOST, () => {
    const hasResume = fs.existsSync(path.join(PUBLIC_DIR, 'Resume.pdf'));
    console.log('');
    console.log('  Sivapandi R — Portfolio server running');
    console.log('  ─────────────────────────────────────────────');
    console.log(`  Website      : http://localhost:${PORT}/`);
    console.log(`  Admin panel  : http://localhost:${PORT}/admin`);
    console.log(`  API health   : http://localhost:${PORT}/api/health`);
    console.log(`  Database     : ${db.DB_FILE}`);
    console.log(`  Uploads      : ${UPLOAD_DIR}`);
    console.log(`  Resume.pdf   : ${hasResume ? 'found' : 'missing (upload one in the admin panel)'}`);
    if (process.env.NODE_ENV === 'production' && !process.env.DATA_DIR) {
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

module.exports = app;
