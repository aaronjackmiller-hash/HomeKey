'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');
const {
    getMyInstantAlerts,
    updateMyInstantAlertSettings,
    upsertMyInstantAlertSearch,
    deleteMyInstantAlertSearch,
    getMyInstantAlertInbox,
    markMyInstantAlertReadState,
} = require('../controllers/alertController');

const router = express.Router();

router.use(protect);

// GET /api/alerts
router.get('/', getMyInstantAlerts);

// PUT /api/alerts/settings
router.put('/settings', updateMyInstantAlertSettings);

// POST /api/alerts/searches
router.post('/searches', upsertMyInstantAlertSearch);

// DELETE /api/alerts/searches/:searchId
router.delete('/searches/:searchId', deleteMyInstantAlertSearch);

// GET /api/alerts/inbox
router.get('/inbox', getMyInstantAlertInbox);

// PUT /api/alerts/inbox/:alertId/read
router.put('/inbox/:alertId/read', markMyInstantAlertReadState);

module.exports = router;
