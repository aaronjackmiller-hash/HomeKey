'use strict';

require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(cors({
    origin: true,
    credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

const { runSeed } = require('./seed');
const { importYad2Listings } = require('./services/yad2ImportService');
const User = require('./models/User');

/**
 * Render environment groups can sometimes strip '+' from values entered manually,
 * turning "mongodb+srv://" into "mongodb://". Fix only that SRV-shaped case.
 *
 * IMPORTANT: Atlas "standard connection string" URIs with multiple hosts/ports
 * (mongodb://host1:27017,host2:27017,...) are valid and must remain unchanged.
 *
 * @param {string} uri
 * @returns {string}
 */
const normalizeMongoUri = (uri) => {
    if (typeof uri !== 'string' || uri.length === 0) return uri;
    if (!uri.startsWith('mongodb://') || !uri.includes('.mongodb.net')) return uri;

    const authority = uri.slice('mongodb://'.length).split('/')[0] || '';
    const hostSegment = authority.includes('@') ? authority.split('@').pop() : authority;
    const hasMultipleHosts = hostSegment.includes(',');
    const hasExplicitPort = /:\d+/.test(hostSegment);

    // Standard Atlas URI (multiple hosts and/or :27017) should stay mongodb://
    if (hasMultipleHosts || hasExplicitPort) return uri;

    // SRV-like Atlas URI accidentally missing '+'
    const withSrv = uri.replace(/^mongodb:\/\//, 'mongodb+srv://');
    console.warn('[startup] Normalized Atlas URI from mongodb:// to mongodb+srv:// format.');
    return withSrv;
};

const isAtlasMongoUri = (uri) => typeof uri === 'string' && uri.includes('.mongodb.net');

const hasQueryParam = (uri, key) => {
    if (typeof uri !== 'string') return false;
    const query = uri.includes('?') ? uri.split('?')[1] : '';
    const params = new URLSearchParams(query);
    return params.has(key);
};

const withQueryParam = (uri, key, value) => {
    if (typeof uri !== 'string') return uri;
    const [base, query = ''] = uri.split('?');
    const params = new URLSearchParams(query);
    params.set(key, value);
    return `${base}?${params.toString()}`;
};

const isAuthFailureError = (err) =>
    Boolean(err) && (
        err.code === 18 ||
        err.codeName === 'AuthenticationFailed' ||
        /authentication failed/i.test(err.message || '')
    );

const connectMongo = async (initialUri) => {
    const connectOptions = {
        serverSelectionTimeoutMS: 30000,
        bufferCommands: false,
    };
    try {
        await mongoose.connect(initialUri, connectOptions);
        return { usedAuthSourceFallback: false };
    } catch (err) {
        const shouldRetryWithAdminAuthSource =
            isAtlasMongoUri(initialUri) &&
            !hasQueryParam(initialUri, 'authSource') &&
            isAuthFailureError(err);

        if (!shouldRetryWithAdminAuthSource) throw err;

        const retryUri = withQueryParam(initialUri, 'authSource', 'admin');
        console.warn('[startup] Atlas authentication failed without authSource; retrying with authSource=admin.');
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(retryUri, connectOptions);
        return { usedAuthSourceFallback: true };
    }
};

// MongoDB connection
const MONGODB_URI = normalizeMongoUri(process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey');
const PORT = process.env.PORT || 5000;

const ensureJwtSecret = () => {
    if (typeof process.env.JWT_SECRET === 'string' && process.env.JWT_SECRET.trim().length > 0) {
        return;
    }
    // Keep auth endpoints operational in misconfigured environments.
    // Tokens signed with this ephemeral secret are invalidated on process restart.
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    console.warn('[startup] JWT_SECRET is missing. Generated an ephemeral fallback secret for this process.');
};

ensureJwtSecret();

if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set. Falling back to mongodb://localhost:27017/homekey');
}

// Start accepting HTTP connections immediately so the React frontend is always
// reachable — even during cold starts or while MongoDB is still connecting.
// API routes that need the database will return 503 until the connection is ready.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

connectMongo(MONGODB_URI)
    .then(async ({ usedAuthSourceFallback }) => {
        console.log('MongoDB connected');
        if (usedAuthSourceFallback) {
            console.log('[startup] Connected after applying authSource=admin fallback.');
        }
        // Auto-seed if the database is empty (no-op if data already exists)
        try {
            await runSeed(false);
            console.log('[startup] Seed check complete.');
        } catch (seedErr) {
            console.error('[startup] Seed failed - demo data not loaded. Use POST /api/admin/seed to retry:', seedErr.message);
        }
    })
    .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        if (isAuthFailureError(err)) {
            console.error('[startup] Atlas auth failed. Verify DB username/password and ensure authSource=admin when needed.');
        }
        console.error('[startup] Full error:', err);
        // Do not exit — keep the server running so the frontend remains accessible.
        // The /api/health endpoint will report the degraded state.
    });

// Readiness guard — return 503 for all API routes that need the database until
// MongoDB is connected. The /api/health endpoint is exempt so monitoring can
// always check the server state.
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Database not ready. Please try again shortly.' });
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/users', require('./routes/users'));
app.use('/api/agents', require('./routes/agents'));

// Admin seed endpoint — manually trigger seeding when auto-seed fails or is skipped.
// Protected by ADMIN_SECRET env var. If ADMIN_SECRET is not set, the endpoint is disabled.
// Usage: POST /api/admin/seed
//   Header: X-Admin-Secret: <value of ADMIN_SECRET>
//   Optional body: { "force": true }  — drops existing seed data and re-seeds
app.post('/api/admin/seed', async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
        return res.status(403).json({ success: false, message: 'Admin seed endpoint is disabled (ADMIN_SECRET not configured).' });
    }
    const provided = req.headers['x-admin-secret'];
    const secretBuf = Buffer.from(adminSecret);
    // Use a zero-filled dummy buffer so timingSafeEqual always runs,
    // preventing timing leaks regardless of whether `provided` is missing or wrong length.
    const providedBuf = Buffer.from(typeof provided === 'string' ? provided : '');
    const dummy = Buffer.alloc(secretBuf.length);
    const cmpBuf = providedBuf.length === secretBuf.length ? providedBuf : dummy;
    const match = crypto.timingSafeEqual(secretBuf, cmpBuf);
    if (!provided || !match) {
        return res.status(403).json({ success: false, message: 'Invalid or missing X-Admin-Secret header.' });
    }
    try {
        const force = req.body && req.body.force === true;
        console.log(`[admin/seed] Triggered via API (force=${force})`);
        await runSeed(force);
        res.json({ success: true, message: `Seed completed (force=${force}).` });
    } catch (err) {
        console.error('[admin/seed] Seed failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin import endpoint — bulk import listings from Yad2-like JSON payloads.
// Designed for additive imports: each batch is inserted, and rows with a known
// external ID are updated in-place (unless "upsert": false is provided).
// Authorization options:
// - ADMIN_IMPORT_SECRET via X-Admin-Import-Secret header
// - ADMIN_SECRET via X-Admin-Secret header
// - agent/admin JWT bearer token (for in-app imports)
// Usage: POST /api/admin/import/yad2
//   Header: X-Admin-Secret: <value of ADMIN_SECRET>
//   Body:
//     {
//       "items": [ ... ],       // or "listings": [ ... ]
//       "upsert": true,         // optional (default true)
//       "sourceTag": "yad2"     // optional label (recommended per batch/source)
//     }
app.post('/api/admin/import/yad2', async (req, res) => {
    const importSecret = process.env.ADMIN_IMPORT_SECRET;
    const adminSecret = process.env.ADMIN_SECRET;

    // Backward-compatible auth:
    // - Preferred: X-Admin-Import-Secret + ADMIN_IMPORT_SECRET
    // - Fallback:  X-Admin-Secret + ADMIN_SECRET
    // - Optional:  Authorization: Bearer <JWT> for logged-in users with
    //              role "agent" or "admin" (for in-app imports).
    const providedImport = req.headers['x-admin-import-secret'];
    const providedAdmin = req.headers['x-admin-secret'];

    const safeMatch = (expected, provided) => {
        if (typeof expected !== 'string' || expected.length === 0) return false;
        const expectedBuf = Buffer.from(expected);
        const providedBuf = Buffer.from(typeof provided === 'string' ? provided : '');
        const dummy = Buffer.alloc(expectedBuf.length);
        const cmpBuf = providedBuf.length === expectedBuf.length ? providedBuf : dummy;
        return crypto.timingSafeEqual(expectedBuf, cmpBuf);
    };

    const importAuthOk = safeMatch(importSecret, providedImport);
    const adminAuthOk = safeMatch(adminSecret, providedAdmin);
    let jwtAuthOk = false;
    if (!importAuthOk && !adminAuthOk) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('role');
                jwtAuthOk = Boolean(user && ['agent', 'admin'].includes(user.role));
            } catch (jwtErr) {
                jwtAuthOk = false;
            }
        }
    }

    if (!importAuthOk && !adminAuthOk && !jwtAuthOk) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized for import. Use X-Admin-Import-Secret, X-Admin-Secret, or an agent/admin bearer token.',
        });
    }

    try {
        const payload = req.body || {};
        const items = Array.isArray(payload)
            ? payload
            : (
                Array.isArray(payload.items)
                    ? payload.items
                    : (Array.isArray(payload.listings) ? payload.listings : null)
            );
        if (!items) {
            return res.status(400).json({
                success: false,
                message: 'Payload must be an array or an object with an "items" / "listings" array.',
            });
        }

        const result = await importYad2Listings({
            rows: items,
            upsert: payload.upsert !== false,
            sourceTag:
                typeof payload.sourceTag === 'string' && payload.sourceTag.trim()
                    ? payload.sourceTag.trim()
                    : (
                        typeof payload.source === 'string' && payload.source.trim()
                            ? payload.source.trim()
                            : 'yad2'
                    ),
        });

        res.json({
            success: true,
            message: 'Yad2 import completed.',
            ...result,
        });
    } catch (err) {
        console.error('[admin/import/yad2] Import failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    const dbReady = dbState === 1;
    if (!dbReady) {
        return res.status(503).json({ status: 'degraded', db: dbStatus });
    }
    res.json({ status: 'ok', db: dbStatus });
});

// API 404 handler
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
    if (!fs.existsSync(path.join(frontendBuild, 'index.html'))) {
        console.error(
            'ERROR: frontend/build/index.html not found. ' +
            'The React app was not built before starting the server. ' +
            'Ensure the build command ran successfully during deployment.'
        );
        process.exit(1);
    }
    app.use(generalLimiter);
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuild, 'index.html'));
    });
} else {
    app.use((req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});
