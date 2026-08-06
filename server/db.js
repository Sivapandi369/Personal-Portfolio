/* ----------------------------------------------------------------
   DB  —  single JSON document over a pluggable store
   Filesystem locally, Vercel Blob on serverless (see ./store).

   The document is loaded into memory once per process (once per warm
   serverless instance) so route handlers can read it synchronously
   via get(). Writes go through save(), which must be awaited.
   ---------------------------------------------------------------- */

const bcrypt = require('bcryptjs');
const { defaultContent } = require('./defaults');
const { DB_FILE } = require('./paths');
const store = require('./store');

let state = null;
let loading = null;
let writing = null;
let pending = false;

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

/* Fill in anything a newer version of the app expects. */
function migrate(doc) {
    const blank = emptyState();
    for (const key of Object.keys(blank)) {
        if (doc[key] === undefined) doc[key] = blank[key];
    }
    const defs = defaultContent();
    doc.content = doc.content || {};
    for (const key of Object.keys(defs)) {
        if (doc.content[key] === undefined) doc.content[key] = defs[key];
    }
    return doc;
}

function seedAdmin(doc) {
    if (doc.admin) return false;

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

    doc.admin = {
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
    return true;
}

/* Load the document into memory. Safe to call repeatedly; concurrent
   callers share one in-flight load. */
function ready() {
    if (state) return Promise.resolve(state);
    if (loading) return loading;

    loading = (async () => {
        const doc = await store.readDoc();
        state = migrate(doc || emptyState());
        const seeded = seedAdmin(state);
        if (!doc || seeded) await persist();
        return state;
    })().finally(() => {
        loading = null;
    });

    return loading;
}

/* Synchronous accessor — valid only after ready() has resolved.
   The dbReady middleware guarantees that for every request. */
function get() {
    if (!state) {
        throw new Error('Database not loaded yet — await db.ready() first.');
    }
    return state;
}

async function persist() {
    if (!state) return;
    if (writing) {
        // coalesce: one more write after the current one finishes
        pending = true;
        return writing;
    }
    writing = (async () => {
        try {
            await store.writeDoc(state);
        } catch (err) {
            console.error('[db] write failed:', err.message);
        }
    })().finally(async () => {
        writing = null;
        if (pending) {
            pending = false;
            await persist();
        }
    });
    return writing;
}

/* Mark updated + persist. Await this in route handlers so serverless
   functions are not frozen mid-write. */
function save() {
    if (!state) return Promise.resolve();
    state.meta.updatedAt = new Date().toISOString();
    return persist();
}

/* Best-effort synchronous flush for process exit (filesystem only). */
function flush() {
    if (!state) return;
    try {
        if (typeof store.writeDocSync === 'function') store.writeDocSync(state);
    } catch (err) {
        console.error('[db] flush failed:', err.message);
    }
}

async function resetContent() {
    get().content = defaultContent();
    await save();
    return state.content;
}

/* Small audit trail shown on the admin dashboard. */
function logActivity(action, detail) {
    if (!state) return Promise.resolve();
    state.activity.unshift({ action, detail: detail || '', at: new Date().toISOString() });
    state.activity = state.activity.slice(0, 50);
    return save();
}

module.exports = { ready, get, save, flush, resetContent, logActivity, DB_FILE, store };
