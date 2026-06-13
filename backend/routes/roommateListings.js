'use strict';

/**
 * roommateListings.js (routes)
 *
 * All routes for the roommate listings feature.
 * Mounted at /api/roommates in server.js.
 *
 * Public routes (no auth required):
 *   GET    /api/roommates           — browse listings
 *   GET    /api/roommates/stats     — stats banner counts
 *   GET    /api/roommates/heatmap   — demand heatmap data
 *   GET    /api/roommates/:id       — single listing
 *   POST   /api/roommates           — create listing (anonymous allowed)
 *   POST   /api/roommates/demand    — log demand signal (fire-and-forget)
 *
 * Authenticated routes (require Bearer token):
 *   PATCH  /api/roommates/:id       — update own listing
 *   DELETE /api/roommates/:id       — delete own listing
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roommateListingsController');
const { protect } = require('../middleware/auth');

// ── Optional auth middleware ──────────────────────────────────────────────────
// Attaches req.user if a valid Bearer token is present, but never blocks the
// request. Used for create — anonymous listers are welcome, but logged-in
// users get their owner ID attached to the listing automatically.
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, secret);
    } catch (_err) {
        // Invalid token — treat as anonymous, don't block
    }
    return next();
};

// ── Public routes ─────────────────────────────────────────────────────────────
// stats, heatmap, and demand must be defined BEFORE /:id to avoid conflicts

router.get('/stats', ctrl.getStats);
router.get('/heatmap', ctrl.getHeatmap);
router.post('/demand', ctrl.logDemand);

router.get('/', ctrl.getListings);
router.get('/:id', ctrl.getListing);
router.post('/', optionalAuth, ctrl.createListing);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.patch('/:id', protect, ctrl.updateListing);
router.delete('/:id', protect, ctrl.deleteListing);

module.exports = router;
