'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { interpretPropertySearch } = require('../controllers/searchController');

const router = express.Router();

const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    return next();
};

router.post(
    '/interpret',
    [
        body('prompt')
            .isString()
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage('Search prompt must be between 1 and 500 characters.'),
        body('language')
            .optional()
            .isIn(['en', 'he'])
            .withMessage('Language must be en or he.'),
    ],
    validateInput,
    interpretPropertySearch
);

module.exports = router;
