'use strict';

/**
 * roommateListings.js (route)
 * path: backend/routes/roommateListings.js
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roommateListingsController');
const { protect } = require('../middleware/auth');

// Specific named routes MUST come before /:id to avoid the wildcard catching them
router.get('/stats',                      ctrl.getStats);
router.get('/heatmap',                    ctrl.getHeatmap);
router.get('/debug-expires-at',           ctrl.debugExpiresAt);
router.post('/demand',                    ctrl.logDemand);
router.post('/admin/geocode-backfill',    ctrl.geocodeBackfill);

// Generic CRUD routes
router.get('/',          ctrl.getListings);
router.post('/',         ctrl.createListing);
router.get('/:id',       ctrl.getListing);
router.patch('/:id',     protect, ctrl.updateListing);
router.delete('/:id',    protect, ctrl.deleteListing);

module.exports = router;
