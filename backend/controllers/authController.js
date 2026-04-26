'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const buildPasswordResetToken = () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
};

const getResetCookieOptions = (minutes) => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: minutes * 60 * 1000,
});

// POST /api/auth/register
const parsePreferredContactMethod = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['email', 'whatsapp', 'phone'].includes(normalized)) return normalized;
    return 'email';
};

const register = async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        whatsapp,
        preferredContactMethod,
        role,
        agency,
        bio,
    } = req.body;
    try {
        const existing = await User.findOne({ email: String(email) });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({
            name,
            email,
            password: hashed,
            phone,
            whatsapp,
            preferredContactMethod: parsePreferredContactMethod(preferredContactMethod),
            role,
            agency,
            bio,
        });

        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                whatsapp: user.whatsapp,
                preferredContactMethod: user.preferredContactMethod,
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
        const preferredContactMethod = parsePreferredContactMethod(user.preferredContactMethod);
        res.json({
            success: true,
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                whatsapp: user.whatsapp,
                preferredContactMethod,
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

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        const resetMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
        const resetCookieOptions = getResetCookieOptions(resetMinutes);

        if (!user) {
            return res.json({
                success: true,
                message: 'If an account with that email exists, password reset is now ready. Continue to Reset Password.',
            });
        }

        const { rawToken, tokenHash } = buildPasswordResetToken();
        const expiresAt = new Date(Date.now() + (resetMinutes * 60 * 1000));

        user.resetPasswordTokenHash = tokenHash;
        user.resetPasswordExpiresAt = expiresAt;
        await user.save();

        // Keep the reset token out of public UI by storing it in an httpOnly cookie.
        res.cookie('homekey_reset_token', rawToken, resetCookieOptions);
        res.cookie('homekey_reset_email', normalizedEmail, resetCookieOptions);
        return res.json({
            success: true,
            message: 'Password reset is ready. Continue to the Reset Password page within 30 minutes.',
            expiresAt,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    const parsedCookies = req.cookies || {};
    const email = String(req.body.email || parsedCookies.homekey_reset_email || '').toLowerCase().trim();
    const token = String(req.body.token || parsedCookies.homekey_reset_token || '').trim();
    const newPassword = String(req.body.newPassword || req.body.password || '');
    const resetMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
    const resetCookieOptions = getResetCookieOptions(resetMinutes);
    if (!email || !token || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Reset session is missing or expired. Please request a new password reset.',
        });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.',
        });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
        const user = await User.findOne({
            email: String(email).toLowerCase().trim(),
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: { $gt: new Date() },
        }).select('+password');

        if (!user) {
            res.clearCookie('homekey_reset_token', resetCookieOptions);
            res.clearCookie('homekey_reset_email', resetCookieOptions);
            return res.status(400).json({
                success: false,
                message: 'Reset token is invalid or expired.',
            });
        }

        user.password = await bcrypt.hash(String(newPassword), 12);
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();
        res.clearCookie('homekey_reset_token', resetCookieOptions);
        res.clearCookie('homekey_reset_email', resetCookieOptions);

        return res.json({
            success: true,
            message: 'Password reset successful. You can now sign in with the new password.',
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = { register, login, forgotPassword, resetPassword };
