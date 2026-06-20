'use strict';

/**
 * geocode.js (routes)
 *
 * Mounted at /api/geocode in server.js.
 *
 * POST /api/geocode — public, used by the roommate wizard to auto-derive
 * neighborhood + coordinates from a street + city the lister types.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/geocodeController');

router.post('/', ctrl.geocodeAddress);

module.exports = router;
