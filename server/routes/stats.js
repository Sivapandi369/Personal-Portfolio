/* Visitor tracking + dashboard metrics. */

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const today = () => new Date().toISOString().slice(0, 10);

/* POST /api/track  { type: 'view' | 'resume' | 'zip' } */
router.post('/track', (req, res) => {
    const type = (req.body && req.body.type) || 'view';
    const state = db.get();

    if (type === 'resume') state.stats.resumeDownloads++;
    else if (type === 'zip') state.stats.zipDownloads++;
    else {
        state.stats.views++;
        const key = today();
        state.stats.daily[key] = (state.stats.daily[key] || 0) + 1;

        // keep only the last 60 days
        const keys = Object.keys(state.stats.daily).sort();
        if (keys.length > 60) {
            keys.slice(0, keys.length - 60).forEach((k) => delete state.stats.daily[k]);
        }
    }
    db.save();
    res.json({ ok: true });
});

/* GET /api/admin/stats */
router.get('/admin/stats', requireAuth, (req, res) => {
    const state = db.get();
    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, views: state.stats.daily[key] || 0 });
    }

    res.json({
        ok: true,
        stats: {
            views: state.stats.views,
            viewsToday: state.stats.daily[today()] || 0,
            resumeDownloads: state.stats.resumeDownloads || 0,
            zipDownloads: state.stats.zipDownloads || 0,
            messages: state.messages.length,
            unread: state.messages.filter((m) => !m.read).length,
            projects: (state.content.projects.items || []).length,
            skills: (state.content.skills.categories || []).reduce(
                (n, c) => n + (c.items || []).length,
                0
            ),
            experience: (state.content.experience.items || []).length,
            certifications: (state.content.education.certs || []).length,
            lastUpdated: state.meta.updatedAt,
            daily: days
        },
        activity: state.activity.slice(0, 12),
        recentMessages: state.messages.slice(0, 5).map((m) => ({
            id: m.id,
            name: m.name,
            subject: m.subject,
            read: m.read,
            createdAt: m.createdAt
        }))
    });
});

module.exports = router;
