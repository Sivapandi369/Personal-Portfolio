/* Vercel serverless entry point — every request is rewritten here by
   vercel.json and handled by the same Express app used locally. */

module.exports = require('../server/app');
