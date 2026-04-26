'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    createPropertyInquiry,
    registerShowingAttendee,
    getPropertyEngagement,
} = require('../controllers/propertyController');

// Input validation for properties
const validatePropertyInput = [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('type').isIn(['sale', 'rental']).withMessage('Type must be "sale" or "rental"'),
    body('price')
        .isFloat({ gt: 0 }).withMessage('Price must be greater than 0')
        .notEmpty().withMessage('Price is required'),
    body('bedrooms')
        .isInt({ min: 0 }).withMessage('Bedrooms must be greater than or equal to 0')
        .notEmpty().withMessage('Bedrooms are required'),
    body('bathrooms')
        .isInt({ min: 0 }).withMessage('Bathrooms must be greater than or equal to 0')
        .notEmpty().withMessage('Bathrooms are required'),
    body('size')
        .isFloat({ gt: 0 }).withMessage('Size must be greater than 0')
        .notEmpty().withMessage('Size is required'),
    body('floorNumber').optional().isInt({ min: 0 }).withMessage('Floor number must be greater than or equal to 0'),
    body('financialDetails.totalMonthlyPayment')
        .optional()
        .isFloat({ min: 0 }).withMessage('Total monthly payment must be >= 0'),
    body('financialDetails.vaadAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Vaad amount must be >= 0'),
    body('financialDetails.cityTaxes')
        .optional()
        .isFloat({ min: 0 }).withMessage('City taxes must be >= 0'),
    body('agent').optional().isMongoId().withMessage('Agent ID must be a valid ObjectId'),
];

// Middleware to validate input
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/properties
router.get('/', getAllProperties);

// GET /api/properties/:id
router.get('/:id', getPropertyById);

// POST /api/properties/:id/inquiries
router.post('/:id/inquiries', createPropertyInquiry);

// POST /api/properties/:id/showings/:showingId/attendees
router.post('/:id/showings/:showingId/attendees', registerShowingAttendee);

// GET /api/properties/:id/engagement
router.get('/:id/engagement', protect, getPropertyEngagement);

// POST /api/properties
router.post('/', protect, validatePropertyInput, validateInput, createProperty);

// PUT /api/properties/:id
router.put('/:id', protect, validatePropertyInput, validateInput, updateProperty);

// DELETE /api/properties/:id
router.delete('/:id', protect, deleteProperty);

module.exports = router;