'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const {
    register,
    login,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');

const validateRegister = [
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Email must be valid').notEmpty().withMessage('Email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long').notEmpty().withMessage('Password is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number'),
    body('role').optional().isIn(['buyer', 'seller', 'agent', 'admin']).withMessage('Invalid role'),
];

const validateLogin = [
    body('email').isEmail().withMessage('Email must be valid').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const validateForgotPassword = [
    body('email').isEmail().withMessage('Email must be valid').notEmpty().withMessage('Email is required'),
];

const validateResetPassword = [
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .notEmpty()
        .withMessage('New password is required'),
];

const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// POST /api/auth/register
router.post('/register', validateRegister, validateInput, register);

// POST /api/auth/login
router.post('/login', validateLogin, validateInput, login);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateForgotPassword, validateInput, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateResetPassword, validateInput, resetPassword);

module.exports = router;
