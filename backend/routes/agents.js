'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Input validation for agents
const validateAgentInput = [
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long.'),
    body('email').isEmail().withMessage('Email must be a valid email address.').notEmpty().withMessage('Email is required.'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number.'),
    body('agency').optional(),
    body('bio').optional(),
];

// Middleware to validate input
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/agents - list all agents
router.get('/', (req, res, next) => {
    req.query.role = 'agent';
    next();
}, getAllUsers);

// GET /api/agents/:id
router.get('/:id', getUserById);

// POST /api/agents - create agent
router.post('/', validateAgentInput, validateInput, (req, res, next) => {
    req.body.role = 'agent';
    next();
}, createUser);

// PUT /api/agents/:id
router.put('/:id', validateAgentInput, validateInput, updateUser);

// DELETE /api/agents/:id
router.delete('/:id', deleteUser);

module.exports = router;