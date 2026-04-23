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

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

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

// MongoDB connection
const MONGODB_URI = normalizeMongoUri(process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey');
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set. Falling back to mongodb://localhost:27017/homekey');
}

// Start accepting HTTP connections immediately so the React frontend is always
// reachable — even during cold starts or while MongoDB is still connecting.
// API routes that need the database will return 503 until the connection is ready.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

mongoose
    .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        bufferCommands: false,
    })
    .then(async () => {
        console.log('MongoDB connected');
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
