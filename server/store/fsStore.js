/* ----------------------------------------------------------------
   FILESYSTEM STORE
   Used for local development and any host with a writable disk
   (Render + mounted disk, a VPS, Docker volume...).
   ---------------------------------------------------------------- */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { DATA_DIR, UPLOAD_DIR, DB_FILE, ensureDirs } = require('../paths');

const TMP_FILE = DB_FILE + '.tmp';

const name = 'filesystem';
const description = `${DATA_DIR} (database) + ${UPLOAD_DIR} (uploads)`;

async function readDoc() {
    ensureDirs();
    if (!fs.existsSync(DB_FILE)) return null;
    try {
        return JSON.parse(await fsp.readFile(DB_FILE, 'utf8'));
    } catch (err) {
        const backup = `${DB_FILE}.corrupt-${Date.now()}`;
        await fsp.copyFile(DB_FILE, backup);
        console.error(`[store] db.json unreadable, backed up to ${backup} and re-seeding.`);
        return null;
    }
}

/* Atomic: write to a temp file, then rename over the target. */
async function writeDoc(doc) {
    ensureDirs();
    await fsp.writeFile(TMP_FILE, JSON.stringify(doc, null, 2), 'utf8');
    await fsp.rename(TMP_FILE, DB_FILE);
}

function writeDocSync(doc) {
    ensureDirs();
    fs.writeFileSync(TMP_FILE, JSON.stringify(doc, null, 2), 'utf8');
    fs.renameSync(TMP_FILE, DB_FILE);
}

async function putFile(filename, buffer /*, contentType */) {
    ensureDirs();
    await fsp.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return { url: '/uploads/' + filename, pathname: filename };
}

async function listFiles() {
    ensureDirs();
    const names = await fsp.readdir(UPLOAD_DIR);
    const out = [];
    for (const file of names) {
        if (file.startsWith('.')) continue;
        const st = await fsp.stat(path.join(UPLOAD_DIR, file));
        if (!st.isFile()) continue;
        out.push({
            name: file,
            url: '/uploads/' + file,
            size: st.size,
            modified: st.mtime.toISOString()
        });
    }
    return out.sort((a, b) => b.modified.localeCompare(a.modified));
}

async function deleteFile(nameOrUrl) {
    const base = path.basename(String(nameOrUrl).split('?')[0]);
    const target = path.resolve(UPLOAD_DIR, base);
    if (!target.startsWith(path.resolve(UPLOAD_DIR)) || !fs.existsSync(target)) return false;
    await fsp.unlink(target);
    return true;
}

/* Returns { buffer, contentType } for a stored path, or null. */
async function readFile(storedPath) {
    const clean = String(storedPath || '').replace(/^\/+/, '');
    const isUpload = clean.startsWith('uploads/');
    const base = isUpload ? UPLOAD_DIR : require('../paths').PUBLIC_DIR;
    const rel = isUpload ? clean.slice('uploads/'.length) : clean;
    const file = path.resolve(base, rel);
    if (!file.startsWith(path.resolve(base)) || !fs.existsSync(file)) return null;
    return { buffer: await fsp.readFile(file), contentType: 'application/pdf' };
}

module.exports = {
    name,
    description,
    readDoc,
    writeDoc,
    writeDocSync,
    putFile,
    listFiles,
    deleteFile,
    readFile
};
