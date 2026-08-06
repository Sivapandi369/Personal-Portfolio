/* ----------------------------------------------------------------
   STORAGE PATHS
   Local dev keeps everything inside the project folder. In hosting
   environments with an ephemeral filesystem (Render, Heroku, Fly…)
   point DATA_DIR and UPLOAD_DIR at a mounted persistent disk so the
   database and uploads survive deploys and restarts.
   ---------------------------------------------------------------- */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const resolve = (envValue, fallback) =>
    envValue && envValue.trim() ? path.resolve(envValue.trim()) : fallback;

const DATA_DIR = resolve(process.env.DATA_DIR, path.join(ROOT, 'data'));
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR, path.join(PUBLIC_DIR, 'uploads'));
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDirs() {
    [DATA_DIR, UPLOAD_DIR].forEach((dir) => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

module.exports = { ROOT, PUBLIC_DIR, DATA_DIR, UPLOAD_DIR, DB_FILE, ensureDirs };
