'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const assertJwtSecretConfigured = () => {
    if (typeof process.env.JWT_SECRET !== 'string' || process.env.JWT_SECRET.trim().length === 0) {
        const err = new Error('Authentication is temporarily unavailable: server JWT configuration is missing.');
        err.code = 'JWT_CONFIG_MISSING';
        throw err;
    }
};

const generateToken = (id) => {
    assertJwtSecretConfigured();
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// POST /api/auth/register
const register = async (req, res) => {
    const { name, email, password, phone, role, agency, bio } = req.body;
    try {
        const existing = await User.findOne({ email: String(email) });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashed, phone, role, agency, bio });

        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        if (err.code === 'JWT_CONFIG_MISSING') {
            return res.status(503).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    try {
        const user = await User.findOne({ email: String(email) }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        res.json({
            success: true,
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        if (err.code === 'JWT_CONFIG_MISSING') {
            return res.status(503).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = { register, login };
