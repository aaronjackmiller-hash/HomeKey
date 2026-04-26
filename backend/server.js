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
const { createYad2Scheduler } = require('./services/yad2SchedulerService');
const { featuredYad2ListingsIL } = require('./data/featuredYad2ListingsIL');
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

const safeHeaderSecretMatch = (expected, provided) => {
    if (typeof expected !== 'string' || expected.length === 0) return false;
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(typeof provided === 'string' ? provided : '');
    const dummy = Buffer.alloc(expectedBuf.length);
    const cmpBuf = providedBuf.length === expectedBuf.length ? providedBuf : dummy;
    return crypto.timingSafeEqual(expectedBuf, cmpBuf);
};

const isYad2ImportAuthorized = async (req) => {
    const importSecret = process.env.ADMIN_IMPORT_SECRET;
    const adminSecret = process.env.ADMIN_SECRET;
    const providedImport = req.headers['x-admin-import-secret'];
    const providedAdmin = req.headers['x-admin-secret'];
    const importAuthOk = safeHeaderSecretMatch(importSecret, providedImport);
    const adminAuthOk = safeHeaderSecretMatch(adminSecret, providedAdmin);
    if (importAuthOk || adminAuthOk) return true;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role');
        return Boolean(user && ['agent', 'admin'].includes(user.role));
    } catch (jwtErr) {
        return false;
    }
};

const toOptionalNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeSyncMessage = (value) => {
    if (typeof value !== 'string') return null;
    return value
        .replace(/https?:\/\/\S+/gi, '[redacted-url]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
};

const summarizeSyncResult = (lastResult) => {
    if (!lastResult || typeof lastResult !== 'object') return null;
    return {
        skipped: Boolean(lastResult.skipped),
        reason: sanitizeSyncMessage(lastResult.reason),
        trigger: typeof lastResult.trigger === 'string' ? lastResult.trigger : null,
        sourceTag: typeof lastResult.sourceTag === 'string' ? lastResult.sourceTag : null,
        fetched: toOptionalNumber(lastResult.fetched),
        processed: toOptionalNumber(lastResult.processed),
        created: toOptionalNumber(lastResult.created),
        updated: toOptionalNumber(lastResult.updated),
        failed: toOptionalNumber(lastResult.failed),
        pruned: toOptionalNumber(lastResult.pruned),
    };
};

const deriveUnavailableReason = (status, summarizedResult) => {
    if (!status.enabled) return 'Live Yad2 sync is disabled on the server.';
    if (!status.feedUrlConfigured && !status.scrapeFallbackEnabled) {
        return 'Live feed URL is not configured on the server.';
    }
    if (!status.feedUrlConfigured && status.scrapeFallbackEnabled && status.lastError) {
        return `Scrape fallback failed: ${sanitizeSyncMessage(status.lastError)}.`;
    }
    if (!status.feedUrlConfigured && status.scrapeFallbackEnabled && !status.lastFinishedAt) {
        return 'Scrape fallback is enabled but has not completed a sync yet.';
    }
    if (status.inFlight) return 'A live Yad2 sync is currently in progress.';
    if (status.lastError) return `Last sync failed: ${sanitizeSyncMessage(status.lastError)}.`;
    if (summarizedResult && summarizedResult.skipped) {
        return `Last sync was skipped: ${summarizedResult.reason || 'Unknown reason'}.`;
    }
    if (!status.lastFinishedAt) return 'A live Yad2 sync has not completed yet.';
    if (summarizedResult && summarizedResult.fetched === 0) {
        return 'Last sync returned zero listings from the feed.';
    }
    return null;
};

const getPublicYad2SyncStatus = () => {
    const status = yad2Scheduler.getStatus();
    const summarizedResult = summarizeSyncResult(status.lastResult);
    return {
        enabled: Boolean(status.enabled),
        sourceTag: status.sourceTag,
        syncMinutes: status.syncMinutes,
        feedUrlConfigured: Boolean(status.feedUrlConfigured),
        scrapeFallbackEnabled: Boolean(status.scrapeFallbackEnabled),
        mirrorDeletesEnabled: Boolean(status.mirrorDeletesEnabled),
        timerActive: Boolean(status.timerActive),
        inFlight: Boolean(status.inFlight),
        lastStartedAt: status.lastStartedAt || null,
        lastFinishedAt: status.lastFinishedAt || null,
        lastTrigger: status.lastTrigger || null,
        lastError: sanitizeSyncMessage(status.lastError),
        lastResult: summarizedResult,
        unavailableReason: deriveUnavailableReason(status, summarizedResult),
    };
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

const yad2Scheduler = createYad2Scheduler(console);

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
        const enableFeaturedSeed = process.env.ENABLE_FEATURED_YAD2_SEED === 'true';
        if (enableFeaturedSeed) {
            // Optional curated seed data (disabled by default when running live sync-only mode).
            try {
                const curatedImport = await importYad2Listings({
                    rows: featuredYad2ListingsIL,
                    upsert: true,
                    sourceTag: 'yad2-featured-il',
                });
                console.log(
                    `[startup] Featured Yad2 listings sync complete (created=${curatedImport.created}, updated=${curatedImport.updated}, skipped=${curatedImport.skipped}).`
                );
            } catch (curatedErr) {
                console.error('[startup] Featured Yad2 listings sync failed:', curatedErr.message);
            }
        } else {
            console.log('[startup] Featured Yad2 seed is disabled (ENABLE_FEATURED_YAD2_SEED != true).');
        }

        yad2Scheduler.start();
        try {
            const initialSync = await yad2Scheduler.runSyncOnce('startup');
            if (initialSync.skipped) {
                console.log(`[yad2-sync] Startup run skipped: ${initialSync.reason}`);
            } else {
                console.log(
                    `[yad2-sync] Startup sync complete (fetched=${initialSync.fetched}, created=${initialSync.created}, updated=${initialSync.updated}, skipped=${initialSync.skipped}).`
                );
            }
        } catch (syncErr) {
            console.error('[yad2-sync] Startup sync failed:', syncErr.message);
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
    if (!(await isYad2ImportAuthorized(req))) {
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

// Admin endpoint — trigger Yad2 scheduled sync manually.
// Uses the same authorization as /api/admin/import/yad2.
// Usage: POST /api/admin/sync/yad2
app.post('/api/admin/sync/yad2', async (req, res) => {
    if (!(await isYad2ImportAuthorized(req))) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized for sync. Use X-Admin-Import-Secret, X-Admin-Secret, or an agent/admin bearer token.',
        });
    }
    try {
        const result = await yad2Scheduler.runSyncOnce('admin-api');
        if (result.skipped) {
            return res.json({
                success: true,
                message: `Yad2 sync skipped: ${result.reason}.`,
                ...result,
            });
        }
        return res.json({
            success: true,
            message: 'Yad2 sync completed.',
            ...result,
        });
    } catch (err) {
        console.error('[admin/sync/yad2] Sync failed:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin endpoint — view Yad2 sync status/health.
// Uses the same authorization as /api/admin/import/yad2.
// Usage: GET /api/admin/sync/yad2/status
app.get('/api/admin/sync/yad2/status', async (req, res) => {
    if (!(await isYad2ImportAuthorized(req))) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized for sync status. Use X-Admin-Import-Secret, X-Admin-Secret, or an agent/admin bearer token.',
        });
    }
    const status = yad2Scheduler.getStatus();
    return res.json({
        success: true,
        ...status,
    });
});

// Public endpoint — read-only live Yad2 sync status for frontend diagnostics.
// Usage: GET /api/sync/yad2/status
app.get('/api/sync/yad2/status', (req, res) => {
    res.json({
        success: true,
        status: getPublicYad2SyncStatus(),
    });
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
