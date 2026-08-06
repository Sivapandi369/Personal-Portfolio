/* File uploads (resume PDF + images) and public downloads (resume, source zip).
   All file IO goes through the store so this works on both a real
   filesystem and Vercel Blob. */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../db');
const store = require('../store');
const { requireAuth } = require('../middleware/auth');
const { ROOT } = require('../paths');

const router = express.Router();

const ALLOWED = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
};

/* Buffer in memory, then hand the bytes to the store — a disk path is
   not available on serverless. */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED[file.mimetype]) return cb(null, true);
        cb(new Error('Only PDF, PNG, JPG, WEBP, GIF or SVG files are allowed.'));
    }
});

function safeName(originalname, mimetype) {
    const ext = ALLOWED[mimetype] || path.extname(originalname).toLowerCase();
    const base =
        path
            .basename(originalname, path.extname(originalname))
            .replace(/[^a-z0-9_-]+/gi, '-')
            .slice(0, 40)
            .toLowerCase() || 'file';
    return `${base}-${Date.now()}${ext}`;
}

/* ---------------- ADMIN ---------------- */

/* POST /api/admin/upload/resume — replaces the downloadable resume PDF. */
router.post('/admin/upload/resume', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file received.' });
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ ok: false, error: 'The resume must be a PDF file.' });
    }

    const saved = await store.putFile(
        safeName(req.file.originalname, req.file.mimetype),
        req.file.buffer,
        req.file.mimetype
    );

    const state = db.get();
    state.content.resume.uploadedFile = saved.url;
    state.content.resume.mode = 'file';
    await db.save();
    await db.logActivity('upload', `Resume PDF replaced (${req.file.originalname})`);

    res.json({
        ok: true,
        message: 'Resume uploaded. Download mode switched to "Uploaded PDF".',
        url: saved.url
    });
});

/* POST /api/admin/upload/image — for project covers / avatar. */
router.post('/admin/upload/image', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file received.' });
    if (req.file.mimetype === 'application/pdf') {
        return res.status(400).json({ ok: false, error: 'Please upload an image file.' });
    }

    const saved = await store.putFile(
        safeName(req.file.originalname, req.file.mimetype),
        req.file.buffer,
        req.file.mimetype
    );
    await db.logActivity('upload', `Image uploaded (${req.file.originalname})`);

    res.json({ ok: true, message: 'Image uploaded.', url: saved.url });
});

/* GET /api/admin/uploads — list stored files so they can be reused/removed. */
router.get('/admin/uploads', requireAuth, async (req, res) => {
    res.json({ ok: true, files: await store.listFiles() });
});

/* DELETE /api/admin/uploads/:name */
router.delete('/admin/uploads/:name', requireAuth, async (req, res) => {
    const removed = await store.deleteFile(req.params.name);
    if (!removed) return res.status(404).json({ ok: false, error: 'File not found.' });
    res.json({ ok: true, message: 'File deleted.' });
});

/* GET /api/admin/backup — download the whole content document as JSON. */
router.get('/admin/backup', requireAuth, (req, res) => {
    const state = db.get();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), content: state.content }, null, 2));
});

/* ---------------- PUBLIC DOWNLOADS ---------------- */

/* GET /api/resume — serves the uploaded PDF (used when mode === 'file'). */
router.get('/resume', async (req, res) => {
    const state = db.get();
    const stored = state.content.resume.uploadedFile || '/Resume.pdf';
    const file = await store.readFile(stored);

    if (!file) return res.status(404).json({ ok: false, error: 'No resume file available.' });

    state.stats.resumeDownloads = (state.stats.resumeDownloads || 0) + 1;
    await db.save();

    const filename = state.content.resume.fileName || 'Resume.pdf';
    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    res.send(file.buffer);
});

/* GET /api/download/source — streams the website source as a .zip */
router.get('/download/source', async (req, res) => {
    const state = db.get();
    state.stats.zipDownloads = (state.stats.zipDownloads || 0) + 1;
    await db.save();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="sivapandi_portfolio.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
        console.error('[zip]', err.message);
        res.destroy();
    });
    archive.pipe(res);

    ['public/index.html', 'public/style.css', 'public/script.js', 'public/content.js', 'README.md'].forEach(
        (rel) => {
            const abs = path.join(ROOT, rel);
            if (fs.existsSync(abs)) archive.file(abs, { name: path.basename(rel) });
        }
    );
    archive.finalize();
});

module.exports = router;
