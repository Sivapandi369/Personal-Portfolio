/* JWT auth guard for every /api/admin/* route. */

const jwt = require('jsonwebtoken');

const SECRET =
    process.env.JWT_SECRET ||
    'sivapandi-portfolio-dev-secret-change-me-in-dotenv';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function sign(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;

    if (!token) {
        return res.status(401).json({ ok: false, error: 'Authentication required.' });
    }
    try {
        req.admin = jwt.verify(token, SECRET);
        next();
    } catch (err) {
        const expired = err.name === 'TokenExpiredError';
        res.status(401).json({
            ok: false,
            expired,
            error: expired ? 'Session expired, please sign in again.' : 'Invalid session token.'
        });
    }
}

module.exports = { sign, requireAuth, SECRET };
