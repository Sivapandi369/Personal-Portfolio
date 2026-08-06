/* Admin authentication: login, session check, profile + password update. */

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many login attempts. Please try again in 10 minutes.' }
});

/* POST /api/auth/login */
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, error: 'Username and password are required.' });
    }

    const state = db.get();
    const admin = state.admin;
    const userOk = username.trim().toLowerCase() === admin.username.toLowerCase();
    const passOk = await bcrypt.compare(password, admin.passwordHash);

    if (!userOk || !passOk) {
        return res.status(401).json({ ok: false, error: 'Invalid username or password.' });
    }

    admin.lastLogin = new Date().toISOString();
    await db.save();
    await db.logActivity('login', `Signed in as ${admin.username}`);

    res.json({
        ok: true,
        token: sign({ sub: admin.username, role: 'admin' }),
        user: {
            username: admin.username,
            email: admin.email,
            mustChangePassword: !!admin.mustChangePassword,
            lastLogin: admin.lastLogin
        }
    });
});

/* GET /api/auth/me — validate a stored token on admin panel boot */
router.get('/me', requireAuth, (req, res) => {
    const admin = db.get().admin;
    res.json({
        ok: true,
        user: {
            username: admin.username,
            email: admin.email,
            mustChangePassword: !!admin.mustChangePassword,
            lastLogin: admin.lastLogin
        }
    });
});

/* PUT /api/auth/account — change username / email / password */
router.put('/account', requireAuth, async (req, res) => {
    const { currentPassword, username, email, newPassword } = req.body || {};
    const admin = db.get().admin;

    if (!currentPassword || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
        return res.status(401).json({ ok: false, error: 'Current password is incorrect.' });
    }
    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters.' });
    }

    if (username && username.trim()) admin.username = username.trim();
    if (typeof email === 'string') admin.email = email.trim();
    if (newPassword) {
        admin.passwordHash = await bcrypt.hash(newPassword, 10);
        admin.mustChangePassword = false;
    }
    await db.save();
    await db.logActivity('account', 'Account details updated');

    res.json({
        ok: true,
        message: 'Account updated successfully.',
        token: sign({ sub: admin.username, role: 'admin' }),
        user: { username: admin.username, email: admin.email, mustChangePassword: !!admin.mustChangePassword }
    });
});

module.exports = router;
