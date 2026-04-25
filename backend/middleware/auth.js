'use strict';

const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    return typeof secret === 'string' && secret.trim().length > 0 ? secret : null;
};

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        return res.status(503).json({
            success: false,
            message: 'Authentication is temporarily unavailable. Server JWT configuration is missing.',
            code: 'AUTH_CONFIG_MISSING',
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }
};

module.exports = { protect };
