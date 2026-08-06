/* File uploads (resume PDF + images) and public downloads (resume, source zip). */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const { PUBLIC_DIR, UPLOAD_DIR } = require('../paths');

const ALLOWED = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase();
        const base = path
            .basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-z0-9_-]+/gi, '-')
            .slice(0, 40)
            .toLowerCase() || 'file';
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED[file.mimetype]) return cb(null, true);
        cb(new Error('Only PDF, PNG, JPG, WEBP, GIF or SVG files are allowed.'));
    }
});

/* ---------------- ADMIN ---------------- */

/* POST /api/admin/upload/resume — replaces the downloadable resume PDF. */
router.post('/admin/upload/resume', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file received.' });
    if (req.file.mimetype !== 'application/pdf') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ ok: false, error: 'The resume must be a PDF file.' });
    }
    const state = db.get();
    const url = '/uploads/' + req.file.filename;
    state.content.resume.uploadedFile = url;
    state.content.resume.mode = 'file';
    db.save();
    db.logActivity('upload', `Resume PDF replaced (${req.file.originalname})`);
    res.json({ ok: true, message: 'Resume uploaded. Download mode switched to "Uploaded PDF".', url });
});

/* POST /api/admin/upload/image — for project covers / avatar. */
router.post('/admin/upload/image', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file received.' });
    if (req.file.mimetype === 'application/pdf') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ ok: false, error: 'Please upload an image file.' });
    }
    db.logActivity('upload', `Image uploaded (${req.file.originalname})`);
    res.json({ ok: true, message: 'Image uploaded.', url: '/uploads/' + req.file.filename });
});

/* GET /api/admin/uploads — list what is on disk so files can be reused/removed. */
router.get('/admin/uploads', requireAuth, (req, res) => {
    const files = fs
        .readdirSync(UPLOAD_DIR)
        .filter((f) => !f.startsWith('.'))
        .map((f) => {
            const st = fs.statSync(path.join(UPLOAD_DIR, f));
            return { name: f, url: '/uploads/' + f, size: st.size, modified: st.mtime.toISOString() };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));
    res.json({ ok: true, files });
});

/* DELETE /api/admin/uploads/:name */
router.delete('/admin/uploads/:name', requireAuth, (req, res) => {
    const name = path.basename(req.params.name);
    const target = path.join(UPLOAD_DIR, name);
    if (!target.startsWith(UPLOAD_DIR) || !fs.existsSync(target)) {
        return res.status(404).json({ ok: false, error: 'File not found.' });
    }
    fs.unlinkSync(target);
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

/* Maps a stored "/uploads/x.pdf" or "/Resume.pdf" path to a file on disk.
   /uploads lives in UPLOAD_DIR, which may sit outside PUBLIC_DIR on a
   hosting platform with a mounted persistent disk. */
function resolvePublicPath(rel) {
    const clean = String(rel || '').replace(/^\/+/, '');
    const base = clean.startsWith('uploads/') ? UPLOAD_DIR : PUBLIC_DIR;
    const relative = clean.startsWith('uploads/') ? clean.slice('uploads/'.length) : clean;
    const file = path.resolve(base, relative);
    return file.startsWith(path.resolve(base)) ? file : null; // block path traversal
}

/* GET /api/resume — serves the uploaded PDF (used when mode === 'file'). */
router.get('/resume', (req, res) => {
    const state = db.get();
    const file = resolvePublicPath(state.content.resume.uploadedFile || '/Resume.pdf');

    if (!file || !fs.existsSync(file)) {
        return res.status(404).json({ ok: false, error: 'No resume file available.' });
    }
    state.stats.resumeDownloads = (state.stats.resumeDownloads || 0) + 1;
    db.save();
    res.download(file, state.content.resume.fileName || 'Resume.pdf');
});

/* GET /api/download/source — streams the website source as a .zip */
router.get('/download/source', (req, res) => {
    const state = db.get();
    state.stats.zipDownloads = (state.stats.zipDownloads || 0) + 1;
    db.save();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="sivapandi_portfolio.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
        console.error('[zip]', err.message);
        res.destroy();
    });
    archive.pipe(res);

    const root = path.join(__dirname, '..', '..');
    ['public/index.html', 'public/style.css', 'public/script.js', 'public/content.js', 'README.md'].forEach(
        (rel) => {
            const abs = path.join(root, rel);
            if (fs.existsSync(abs)) archive.file(abs, { name: path.basename(rel) });
        }
    );
    archive.finalize();
});

module.exports = router;
