/* ----------------------------------------------------------------
   SIVAPANDI R — PORTFOLIO APP
   Builds the Express app (API + static hosting) and exports it.
   server.js listens on a port; api/index.js wraps it for Vercel.
   ---------------------------------------------------------------- */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const { PUBLIC_DIR, UPLOAD_DIR } = require('./paths');
const store = require('./store');
const db = require('./db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const messageRoutes = require('./routes/messages');
const statsRoutes = require('./routes/stats');
const uploadRoutes = require('./routes/uploads');

const app = express();

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

/* The document must be in memory before any handler calls db.get().
   On serverless this resolves instantly for warm instances. */
app.use('/api', async (req, res, next) => {
    try {
        await db.ready();
        next();
    } catch (err) {
        next(err);
    }
});

/* ------------------------- API ------------------------- */
app.get('/api/health', (req, res) =>
    res.json({
        ok: true,
        service: 'sivapandi-portfolio-api',
        store: store.name,
        uptime: process.uptime()
    })
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

/* Uploads are served from UPLOAD_DIR on filesystem installs. With Vercel Blob
   the stored URLs are absolute CDN links, so this route is simply unused. */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h', fallthrough: true }));

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

module.exports = app;
