'use strict';

/**
 * seekerProfiles.js (route)
 * path: backend/routes/seekerProfiles.js
 *
 * Mounted at /api/seekers in server.js
 */

const express = require('express');
const router = express.Router();
const {
    createSeekerProfile,
    getSeekerProfiles,
    deactivateSeekerProfile,
} = require('../controllers/seekerProfilesController');

// GET  /api/seekers          — list active seeker profiles (for room listers to browse)
// POST /api/seekers          — create a new seeker profile
// PATCH /api/seekers/:id/deactivate — seeker marks themselves as found/inactive

router.get('/', getSeekerProfiles);
router.post('/', createSeekerProfile);
router.patch('/:id/deactivate', deactivateSeekerProfile);

module.exports = router;
