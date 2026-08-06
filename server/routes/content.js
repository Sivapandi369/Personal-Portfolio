/* Portfolio content: public read + authenticated write (the CMS core). */

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { defaultContent } = require('../defaults');

const router = express.Router();

const SECTIONS = Object.keys(defaultContent());

/* ---------------- PUBLIC ---------------- */

/* GET /api/content — everything the front-end needs to render itself. */
router.get('/content', (req, res) => {
    const state = db.get();
    res.set('Cache-Control', 'no-store');
    res.json({
        ok: true,
        updatedAt: state.meta.updatedAt,
        content: state.content
    });
});

/* GET /api/content/:section */
router.get('/content/:section', (req, res) => {
    const section = req.params.section;
    const content = db.get().content;
    if (!(section in content)) {
        return res.status(404).json({ ok: false, error: `Unknown section "${section}".` });
    }
    res.json({ ok: true, section, data: content[section] });
});

/* ---------------- ADMIN ---------------- */

/* PUT /api/admin/content — replace the whole document (used by Import). */
router.put('/admin/content', requireAuth, (req, res) => {
    const incoming = req.body && req.body.content;
    if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ ok: false, error: 'A "content" object is required.' });
    }
    const state = db.get();
    const merged = { ...defaultContent() };
    for (const key of SECTIONS) {
        if (incoming[key] !== undefined) merged[key] = incoming[key];
    }
    state.content = merged;
    db.save();
    db.logActivity('content', 'Full content document replaced');
    res.json({ ok: true, message: 'All content saved.', content: state.content });
});

/* PUT /api/admin/content/:section — save one section (normal admin save). */
router.put('/admin/content/:section', requireAuth, (req, res) => {
    const section = req.params.section;
    if (!SECTIONS.includes(section)) {
        return res.status(404).json({ ok: false, error: `Unknown section "${section}".` });
    }
    const data = req.body && req.body.data;
    if (data === undefined) {
        return res.status(400).json({ ok: false, error: 'A "data" payload is required.' });
    }

    const state = db.get();
    state.content[section] = data;
    db.save();
    db.logActivity('content', `Section "${section}" updated`);
    res.json({ ok: true, message: `${section} saved — refresh the site to see it live.`, data });
});

/* POST /api/admin/content/reset — back to the original portfolio content. */
router.post('/admin/content/reset', requireAuth, (req, res) => {
    const section = req.body && req.body.section;
    if (section) {
        if (!SECTIONS.includes(section)) {
            return res.status(404).json({ ok: false, error: `Unknown section "${section}".` });
        }
        const state = db.get();
        state.content[section] = defaultContent()[section];
        db.save();
        db.logActivity('reset', `Section "${section}" reset to defaults`);
        return res.json({ ok: true, message: `${section} reset to defaults.`, data: state.content[section] });
    }
    const content = db.resetContent();
    db.logActivity('reset', 'All content reset to defaults');
    res.json({ ok: true, message: 'All content reset to defaults.', content });
});

module.exports = router;
