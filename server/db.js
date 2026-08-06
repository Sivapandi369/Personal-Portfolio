/* ----------------------------------------------------------------
   DB  —  zero-dependency JSON document store
   Single file (data/db.json) with atomic writes + debounced flush.
   Keeps the whole site content, messages, stats and admin account.
   ---------------------------------------------------------------- */

const fs = require('fs');
const bcrypt = require('bcryptjs');
const { defaultContent } = require('./defaults');
const { DATA_DIR, DB_FILE } = require('./paths');

const TMP_FILE = DB_FILE + '.tmp';

let state = null;
let flushTimer = null;
let writing = false;
let dirtyAgain = false;

function emptyState() {
    return {
        version: 2,
        admin: null,
        content: defaultContent(),
        messages: [],
        stats: { views: 0, daily: {}, resumeDownloads: 0, zipDownloads: 0 },
        activity: [],
        meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    };
}

function load() {
    if (state) return state;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (fs.existsSync(DB_FILE)) {
        try {
            state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (err) {
            const backup = DB_FILE + '.corrupt-' + Date.now();
            fs.copyFileSync(DB_FILE, backup);
            console.error(`[db] db.json unreadable, backed up to ${backup} and re-seeded.`);
            state = emptyState();
        }
    } else {
        state = emptyState();
    }

    // ---- migrations / self-healing -------------------------------
    const blank = emptyState();
    for (const key of Object.keys(blank)) {
        if (state[key] === undefined) state[key] = blank[key];
    }
    // Fill in any content section added by a newer version of the app.
    const defs = defaultContent();
    state.content = state.content || {};
    for (const key of Object.keys(defs)) {
        if (state.content[key] === undefined) state.content[key] = defs[key];
    }

    // ---- first-run admin account --------------------------------
    if (!state.admin) {
        const username = process.env.ADMIN_USERNAME || 'admin';
        /* The default below is documented publicly, so it is only acceptable for
           local development. In production without an explicit ADMIN_PASSWORD we
           generate a random one and print it once — never a guessable default on
           a publicly reachable deployment. */
        const generated =
            !process.env.ADMIN_PASSWORD && process.env.NODE_ENV === 'production'
                ? require('crypto').randomBytes(12).toString('base64url')
                : null;
        const password = process.env.ADMIN_PASSWORD || generated || 'Admin@123';
        state.admin = {
            username,
            passwordHash: bcrypt.hashSync(password, 10),
            email: process.env.ADMIN_EMAIL || 'sivapandi622004@gmail.com',
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        console.log('----------------------------------------------------');
        console.log(' First run: admin account created');
        console.log(`   username : ${username}`);
        console.log(`   password : ${password}`);
        if (generated) {
            console.log('');
            console.log(' ADMIN_PASSWORD was not set, so this password was');
            console.log(' generated randomly. Copy it now — it is shown only');
            console.log(' once. Then change it in Admin Panel → Account.');
        } else {
            console.log(' Change it from Admin Panel → Account.');
        }
        console.log('----------------------------------------------------');
        persistNow();
    }

    return state;
}

function get() {
    return load();
}

/* Mark the store dirty; the file is written at most once every 150ms. */
function save() {
    load();
    state.meta.updatedAt = new Date().toISOString();
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        persistNow();
    }, 150);
}

function persistNow() {
    if (!state) return;
    if (writing) {
        dirtyAgain = true;
        return;
    }
    writing = true;
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(TMP_FILE, DB_FILE); // atomic on the same volume
    } catch (err) {
        console.error('[db] write failed:', err.message);
    } finally {
        writing = false;
        if (dirtyAgain) {
            dirtyAgain = false;
            persistNow();
        }
    }
}

/* Flush pending writes synchronously (used on process exit). */
function flush() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    persistNow();
}

function resetContent() {
    load();
    state.content = defaultContent();
    save();
    return state.content;
}

/* Small audit trail shown on the admin dashboard. */
function logActivity(action, detail) {
    load();
    state.activity.unshift({ action, detail: detail || '', at: new Date().toISOString() });
    state.activity = state.activity.slice(0, 50);
    save();
}

module.exports = { get, save, flush, resetContent, logActivity, DB_FILE };
