/* npm run reset-db — wipes data/db.json so the next start re-seeds defaults. */

require('dotenv').config();
const fs = require('fs');
const { DB_FILE } = require('./paths');

if (fs.existsSync(DB_FILE)) {
    const backup = DB_FILE + '.bak-' + Date.now();
    fs.copyFileSync(DB_FILE, backup);
    fs.unlinkSync(DB_FILE);
    console.log(`Database removed. Backup kept at:\n  ${backup}`);
} else {
    console.log('No database file found — nothing to reset.');
}
console.log('Run "npm start" to re-seed the default portfolio content.');
