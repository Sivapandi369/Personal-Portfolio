/* ----------------------------------------------------------------
   VERCEL BLOB STORE
   Vercel's filesystem is read-only (only /tmp is writable, and it is
   per-instance and ephemeral), so the database document and all
   uploads live in Vercel Blob instead.

   Activated automatically when BLOB_READ_WRITE_TOKEN is present —
   Vercel injects that variable once you create a Blob store in the
   project dashboard.
   ---------------------------------------------------------------- */

const { put, list, del } = require('@vercel/blob');

const DB_KEY = 'portfolio/db.json';
const UPLOAD_PREFIX = 'portfolio/uploads/';

const name = 'vercel-blob';
const description = 'Vercel Blob (portfolio/db.json + portfolio/uploads/*)';

/* Blob is eventually consistent on listing but strongly consistent on
   direct URL reads, so we remember the exact URL we last wrote. */
let cachedDbUrl = null;

async function findDbUrl() {
    if (cachedDbUrl) return cachedDbUrl;
    const { blobs } = await list({ prefix: DB_KEY, limit: 1 });
    cachedDbUrl = blobs.length ? blobs[0].url : null;
    return cachedDbUrl;
}

async function readDoc() {
    const url = await findDbUrl();
    if (!url) return null;
    try {
        // cache-bust so we never read a stale CDN copy after a write
        const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error('[store] could not read db.json from Blob:', err.message);
        return null;
    }
}

async function writeDoc(doc) {
    const result = await put(DB_KEY, JSON.stringify(doc, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0
    });
    cachedDbUrl = result.url;
}

/* No synchronous path exists for a network store; the shutdown hook
   falls back to the async writer. */
function writeDocSync() {
    return false;
}

async function putFile(filename, buffer, contentType) {
    const result = await put(UPLOAD_PREFIX + filename, buffer, {
        access: 'public',
        contentType: contentType || 'application/octet-stream',
        addRandomSuffix: false,
        allowOverwrite: true
    });
    return { url: result.url, pathname: result.pathname };
}

async function listFiles() {
    const { blobs } = await list({ prefix: UPLOAD_PREFIX });
    return blobs
        .map((b) => ({
            name: b.pathname.replace(UPLOAD_PREFIX, ''),
            url: b.url,
            size: b.size,
            modified: new Date(b.uploadedAt).toISOString()
        }))
        .sort((a, b) => b.modified.localeCompare(a.modified));
}

async function deleteFile(nameOrUrl) {
    const value = String(nameOrUrl || '');
    const target = /^https?:/i.test(value) ? value : UPLOAD_PREFIX + value;
    try {
        await del(target);
        return true;
    } catch (err) {
        console.error('[store] blob delete failed:', err.message);
        return false;
    }
}

async function readFile(storedPath) {
    if (!storedPath) return null;
    const url = /^https?:/i.test(storedPath)
        ? storedPath
        : (await listFiles()).find((f) => storedPath.endsWith(f.name))?.url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return {
        buffer: Buffer.from(await res.arrayBuffer()),
        contentType: res.headers.get('content-type') || 'application/pdf'
    };
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
