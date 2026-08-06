/* Contact form submissions (public POST) + admin inbox. */

const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many messages sent. Please try again later.' }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    console.log('[mail] SMTP forwarding enabled →', process.env.SMTP_HOST);
}

async function forwardByEmail(msg) {
    if (!transporter) return;
    const to = process.env.CONTACT_TO || db.get().admin.email;
    if (!to) return;
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            replyTo: msg.email,
            subject: `[Portfolio] ${msg.subject}`,
            text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`
        });
    } catch (err) {
        console.error('[mail] forward failed:', err.message);
    }
}

/* ---------------- PUBLIC ---------------- */

/* POST /api/messages */
router.post('/messages', contactLimiter, async (req, res) => {
    const name = clean(req.body?.name, 120);
    const email = clean(req.body?.email, 160);
    const subject = clean(req.body?.subject, 200) || 'No subject';
    const message = clean(req.body?.message, 5000);

    if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'Name, email and message are required.' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const state = db.get();
    const entry = {
        id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        email,
        subject,
        message,
        read: false,
        starred: false,
        createdAt: new Date().toISOString(),
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
        userAgent: clean(req.headers['user-agent'], 250)
    };
    state.messages.unshift(entry);
    state.messages = state.messages.slice(0, 2000);
    db.save();
    db.logActivity('message', `New message from ${name}`);

    forwardByEmail(entry); // fire and forget

    res.status(201).json({ ok: true, message: 'Message received. Thank you!', id: entry.id });
});

/* ---------------- ADMIN ---------------- */

/* GET /api/admin/messages?filter=unread|starred|all&q=… */
router.get('/admin/messages', requireAuth, (req, res) => {
    const { filter = 'all', q = '' } = req.query;
    let list = db.get().messages;

    if (filter === 'unread') list = list.filter((m) => !m.read);
    if (filter === 'starred') list = list.filter((m) => m.starred);

    const needle = String(q).trim().toLowerCase();
    if (needle) {
        list = list.filter((m) =>
            [m.name, m.email, m.subject, m.message].join(' ').toLowerCase().includes(needle)
        );
    }

    const all = db.get().messages;
    res.json({
        ok: true,
        messages: list,
        counts: {
            total: all.length,
            unread: all.filter((m) => !m.read).length,
            starred: all.filter((m) => m.starred).length
        }
    });
});

/* PATCH /api/admin/messages/:id  { read?, starred? } */
router.patch('/admin/messages/:id', requireAuth, (req, res) => {
    const msg = db.get().messages.find((m) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ ok: false, error: 'Message not found.' });

    if (typeof req.body?.read === 'boolean') msg.read = req.body.read;
    if (typeof req.body?.starred === 'boolean') msg.starred = req.body.starred;
    db.save();
    res.json({ ok: true, message: msg });
});

/* POST /api/admin/messages/read-all */
router.post('/admin/messages/read-all', requireAuth, (req, res) => {
    const state = db.get();
    state.messages.forEach((m) => (m.read = true));
    db.save();
    res.json({ ok: true, message: 'All messages marked as read.' });
});

/* DELETE /api/admin/messages/:id */
router.delete('/admin/messages/:id', requireAuth, (req, res) => {
    const state = db.get();
    const before = state.messages.length;
    state.messages = state.messages.filter((m) => m.id !== req.params.id);
    if (state.messages.length === before) {
        return res.status(404).json({ ok: false, error: 'Message not found.' });
    }
    db.save();
    db.logActivity('message', 'Message deleted');
    res.json({ ok: true, message: 'Message deleted.' });
});

module.exports = router;
