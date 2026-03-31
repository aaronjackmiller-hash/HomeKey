const { body, validationResult } = require('express-validator');

// Input validation for properties
const validatePropertyInput = [
    body('price')
        .isFloat({ gt: 0 }).withMessage('Price must be greater than 0.').notEmpty().withMessage('Price is required.'),
    body('bedrooms')
        .isInt({ gt: 0 }).withMessage('Bedrooms must be greater than 0.').notEmpty().withMessage('Bedrooms are required.'),
    body('bathrooms')
        .isInt({ gt: 0 }).withMessage('Bathrooms must be greater than 0.').notEmpty().withMessage('Bathrooms are required.'),
    body('size')
        .isFloat({ gt: 0 }).withMessage('Size must be greater than 0.').notEmpty().withMessage('Size is required.'),
    body('floorNumber')
        .isInt({ gt: 0 }).withMessage('Floor number must be greater than 0.').notEmpty().withMessage('Floor number is required.'),
    body('totalMonthlyPayment')
        .isFloat({ gt: 0 }).withMessage('Total monthly payment must be greater than 0.').notEmpty().withMessage('Total monthly payment is required.'),
    body('vaadAmount')
        .isFloat({ gt: 0 }).withMessage('Vaad amount must be greater than 0.').notEmpty().withMessage('Vaad amount is required.'),
    body('cityTaxes')
        .isFloat({ gt: 0 }).withMessage('City taxes must be greater than 0.').notEmpty().withMessage('City taxes are required.'),
    body('agent')
        .optional()
        .isMongoId().withMessage('Agent ID must be a valid ObjectId.')
];

// Middleware to validate input
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = { validatePropertyInput, validateInput };