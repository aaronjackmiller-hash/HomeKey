'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    register,
    login,
    getOAuthConfig,
    loginWithGoogle,
    loginWithApple,
    getPasskeyRegistrationOptions,
    verifyPasskeyRegistration,
    getPasskeyAuthenticationOptions,
    verifyPasskeyAuthentication,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');

const validateRegister = [
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Email must be valid').notEmpty().withMessage('Email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long').notEmpty().withMessage('Password is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number'),
    body('whatsapp').optional().isMobilePhone('any').withMessage('WhatsApp must be a valid mobile number'),
    body('moveInDate').optional({ checkFalsy: true }).isISO8601().withMessage('Move-in date must be a valid date'),
    body('preferredContactMethod').optional().isIn(['email', 'whatsapp', 'phone']).withMessage('Invalid preferred contact method'),
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

const validateOAuthGoogle = [
    body().custom((_, { req }) => {
        if (typeof req.body?.idToken === 'string' || typeof req.body?.credential === 'string') {
            return true;
        }
        throw new Error('Google credential is required');
    }),
    body('idToken')
        .optional()
        .isString()
        .withMessage('Google idToken must be a string'),
    body('credential')
        .optional()
        .isString()
        .withMessage('Google credential must be a string'),
];

const validateOAuthApple = [
    body('idToken')
        .isString()
        .withMessage('Apple idToken is required')
        .notEmpty()
        .withMessage('Apple idToken is required'),
];

const validatePasskeyAuthOptions = [
    body('email')
        .isEmail()
        .withMessage('Email must be valid')
        .notEmpty()
        .withMessage('Email is required'),
];

const validatePasskeyVerify = [
    body('email')
        .isEmail()
        .withMessage('Email must be valid')
        .notEmpty()
        .withMessage('Email is required'),
    body('credential')
        .isObject()
        .withMessage('Credential payload is required'),
];

const validatePasskeyRegisterVerify = [
    body('credential')
        .isObject()
        .withMessage('Credential payload is required'),
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

// POST /api/auth/oauth/google
router.post('/oauth/google', validateOAuthGoogle, validateInput, loginWithGoogle);

// GET /api/auth/oauth/config
router.get('/oauth/config', getOAuthConfig);

// POST /api/auth/oauth/apple
router.post('/oauth/apple', validateOAuthApple, validateInput, loginWithApple);

// POST /api/auth/passkeys/register/options
router.post('/passkeys/register/options', protect, getPasskeyRegistrationOptions);

// POST /api/auth/passkeys/register/verify
router.post('/passkeys/register/verify', protect, validatePasskeyRegisterVerify, validateInput, verifyPasskeyRegistration);

// POST /api/auth/passkeys/authenticate/options
router.post('/passkeys/authenticate/options', validatePasskeyAuthOptions, validateInput, getPasskeyAuthenticationOptions);

// POST /api/auth/passkeys/authenticate/verify
router.post('/passkeys/authenticate/verify', validatePasskeyVerify, validateInput, verifyPasskeyAuthentication);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateForgotPassword, validateInput, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateResetPassword, validateInput, resetPassword);

module.exports = router;
