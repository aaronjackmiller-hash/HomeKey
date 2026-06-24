'use strict';

/**
 * roommateListings.js (route)
 * path: backend/routes/roommateListings.js
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roommateListingsController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/stats',              ctrl.getStats);
router.get('/heatmap',            ctrl.getHeatmap);
router.get('/debug-expires-at',   ctrl.debugExpiresAt);
router.post('/demand',            ctrl.logDemand);
router.post('/admin/geocode-backfill', ctrl.geocodeBackfill);
router.get('/',                   ctrl.getListings);
router.get('/:id',                ctrl.getListing);

// Authenticated routes
router.post('/',                  ctrl.createListing);
router.patch('/:id',    protect,  ctrl.updateListing);
router.delete('/:id',   protect,  ctrl.deleteListing);

module.exports = router;
