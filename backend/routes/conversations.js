'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
    listConversations,
    getConversationMessages,
    sendConversationMessage,
    ensureConversationForProperty,
} = require('../controllers/conversationController');

const router = express.Router();

const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    return next();
};

router.use(protect);

router.get('/', listConversations);
router.get('/:id/messages', getConversationMessages);

router.post(
    '/property/:propertyId',
    ensureConversationForProperty
);

router.post(
    '/:id/messages',
    body('content')
        .isString()
        .withMessage('Message content must be text')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message must be between 1 and 2000 characters'),
    validateInput,
    sendConversationMessage
);

module.exports = router;
