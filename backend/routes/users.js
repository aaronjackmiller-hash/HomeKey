'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
} = require('../controllers/userController');

// Input validation for users
const validateUserInput = [
    body('name')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long')
        .notEmpty().withMessage('Name is required'),
    body('email')
        .isEmail().withMessage('Email must be a valid email address')
        .notEmpty().withMessage('Email is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number'),
    body('role')
        .optional()
        .isIn(['buyer', 'seller', 'agent', 'admin']).withMessage('Role must be buyer, seller, agent, or admin'),
    body('agency').optional().trim(),
    body('bio').optional().trim(),
];

// Middleware to validate input
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/users
router.get('/', getAllUsers);

// GET /api/users/:id
router.get('/:id', getUserById);

// POST /api/users
router.post('/', protect, validateUserInput, validateInput, createUser);

// PUT /api/users/:id
router.put('/:id', protect, validateUserInput, validateInput, updateUser);

// DELETE /api/users/:id
router.delete('/:id', protect, deleteUser);

module.exports = router;
