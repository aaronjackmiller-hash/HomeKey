'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// POST endpoint to create agents
router.post('/agents', [
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long.'),
    body('email').isEmail().withMessage('Email must be a valid email address.').notEmpty().withMessage('Email is required.'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number.'),
    body('agency').optional(),
    body('bio').optional(),
], (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, agency, bio } = req.body;
    // Logic to create an agent would go here
    res.status(201).json({
        message: 'Agent created successfully',
        data: { name, email, phone, agency, bio }
    });
});

module.exports = router;