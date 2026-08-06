/* Picks the storage backend. Vercel Blob when its token is present
   (i.e. running on Vercel with a Blob store attached), otherwise the
   local filesystem. Override explicitly with STORAGE=blob|fs. */

const explicit = (process.env.STORAGE || '').toLowerCase();
const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

let store;
if (explicit === 'blob' || (explicit !== 'fs' && hasBlobToken)) {
    store = require('./blobStore');
} else {
    store = require('./fsStore');
}

module.exports = store;
