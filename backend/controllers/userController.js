'use strict';

const User = require('../models/User');

const ALLOWED_ROLES = ['buyer', 'seller', 'agent', 'admin'];

// GET /api/users
const getAllUsers = async (req, res) => {
    try {
        const filter = {};
        if (req.query.role && ALLOWED_ROLES.includes(req.query.role)) {
            filter.role = req.query.role;
        }

        const users = await User.find(filter).select('-__v').sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-__v')
            .populate('listings', 'title price type status');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// POST /api/users
const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// Allowed fields for user updates
const USER_UPDATE_FIELDS = ['name', 'email', 'phone', 'role', 'agency', 'bio', 'listings'];

// PUT /api/users/:id
const updateUser = async (req, res) => {
    try {
        const updateData = {};
        USER_UPDATE_FIELDS.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updateData[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).select('-__v');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
