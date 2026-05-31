'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} = require('@simplewebauthn/server');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');
let appleJwksResolver = null;

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

const parsePreferredContactMethod = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['email', 'whatsapp', 'phone', 'sms'].includes(normalized)) return normalized;
    return 'email';
};

const parseOptionalMoveInDate = (value) => {
    if (value == null || value === '') return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
};

const normalizeEmail = (value) => String(value || '').toLowerCase().trim();

const toSafeAuthData = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    moveInDate: user.moveInDate || null,
    preferredContactMethod: parsePreferredContactMethod(user.preferredContactMethod),
    role: user.role,
    hasPasskey: Array.isArray(user.passkeys) && user.passkeys.length > 0,
});

const buildAuthSuccessResponse = (user) => {
    const token = generateToken(user._id);
    return {
        success: true,
        token,
        data: toSafeAuthData(user),
    };
};

const parsePasskeyOrigins = () => {
    const raw = String(process.env.PASSKEY_ORIGIN || '').trim();
    if (!raw) return ['http://localhost:3000'];
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

const getPasskeyRpId = () => String(process.env.PASSKEY_RP_ID || 'localhost').trim();

const getPasskeyRpName = () => String(process.env.PASSKEY_RP_NAME || 'HomeKey').trim();

const setPasskeyChallenge = (user, challenge) => {
    user.passkeyChallenge = String(challenge);
    user.passkeyChallengeExpiresAt = new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS);
};

const clearPasskeyChallenge = (user) => {
    user.passkeyChallenge = undefined;
    user.passkeyChallengeExpiresAt = undefined;
};

const isPasskeyChallengeValid = (user) => {
    if (!user || !user.passkeyChallenge || !user.passkeyChallengeExpiresAt) return false;
    return new Date(user.passkeyChallengeExpiresAt).getTime() > Date.now();
};

const parseGoogleClientIds = (...values) => {
    const seen = new Set();
    return values
        .flatMap((value) => String(value || '').split(','))
        .map((value) => value.trim())
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        });
};

const getGoogleBrowserClientId = () => (
    parseGoogleClientIds(process.env.REACT_APP_GOOGLE_CLIENT_ID)[0]
    || parseGoogleClientIds(process.env.GOOGLE_CLIENT_ID)[0]
    || ''
);

const getGoogleAudienceClientIds = () => parseGoogleClientIds(
    process.env.REACT_APP_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID
);

const getAppleClientId = () => String(process.env.APPLE_CLIENT_ID || '').trim();

const getAppleRedirectUri = () => String(process.env.APPLE_REDIRECT_URI || '').trim();

const getJoseModule = async () => import('jose');

const getAppleJwks = async () => {
    if (appleJwksResolver) return appleJwksResolver;
    const { createRemoteJWKSet } = await getJoseModule();
    appleJwksResolver = createRemoteJWKSet(APPLE_JWKS_URL);
    return appleJwksResolver;
};

const upsertOAuthUser = async ({ provider, providerSub, email, name }) => {
    const providerField = provider === 'google' ? 'googleSub' : 'appleSub';
    const normalizedEmail = normalizeEmail(email);
    let user = await User.findOne({ [providerField]: providerSub });

    if (!user && normalizedEmail) {
        user = await User.findOne({ email: normalizedEmail });
    }

    if (!user) {
        if (!normalizedEmail) {
            const err = new Error(`No ${provider} email was provided for account creation.`);
            err.code = 'OAUTH_EMAIL_REQUIRED';
            throw err;
        }
        const randomPassword = crypto.randomBytes(48).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);
        user = await User.create({
            name: String(name || normalizedEmail.split('@')[0] || 'HomeKey User').trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'buyer',
            [providerField]: providerSub,
        });
        return user;
    }

    let changed = false;
    if (!user[providerField]) {
        user[providerField] = providerSub;
        changed = true;
    }
    if ((!user.name || user.name.trim().length === 0) && name) {
        user.name = String(name).trim();
        changed = true;
    }
    if (changed) {
        await user.save();
    }
    return user;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

// POST /api/auth/register
const register = async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        whatsapp,
        moveInDate,
        preferredContactMethod,
        role,
        agency,
        bio,
    } = req.body;
    try {
        const normalizedEmail = normalizeEmail(email);
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashed,
            phone,
            whatsapp,
            moveInDate: parseOptionalMoveInDate(moveInDate),
            preferredContactMethod: parsePreferredContactMethod(preferredContactMethod),
            role,
            agency,
            bio,
        });

        res.status(201).json(buildAuthSuccessResponse(user));
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
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json(buildAuthSuccessResponse(user));
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

// GET /api/auth/me
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, data: toSafeAuthData(user) });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// PUT /api/auth/me
const updateCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
            user.name = String(req.body.name || '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
            user.phone = String(req.body.phone || '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'whatsapp')) {
            user.whatsapp = String(req.body.whatsapp || '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'preferredContactMethod')) {
            user.preferredContactMethod = parsePreferredContactMethod(req.body.preferredContactMethod);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'moveInDate')) {
            const rawMoveInDate = req.body.moveInDate;
            if (rawMoveInDate == null || String(rawMoveInDate).trim() === '') {
                user.moveInDate = null;
            } else {
                user.moveInDate = parseOptionalMoveInDate(rawMoveInDate);
            }
        }

        await user.save();
        return res.json({ success: true, data: toSafeAuthData(user) });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// POST /api/auth/oauth/google
const loginWithGoogle = async (req, res) => {
    const idToken = String(req.body.idToken || req.body.credential || '').trim();
    const explicitName = String(req.body.name || '').trim();
    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Google credential is required.' });
    }
    const clientIds = getGoogleAudienceClientIds();
    if (clientIds.length === 0) {
        return res.status(503).json({
            success: false,
            message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID or REACT_APP_GOOGLE_CLIENT_ID.',
        });
    }
    try {
        const oauthClient = new OAuth2Client();
        const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientIds });
        const payload = ticket.getPayload();
        const providerSub = String(payload?.sub || '').trim();
        if (!providerSub) {
            return res.status(400).json({ success: false, message: 'Google token is missing subject.' });
        }
        const user = await upsertOAuthUser({
            provider: 'google',
            providerSub,
            email: payload?.email,
            name: explicitName || payload?.name,
        });
        return res.json(buildAuthSuccessResponse(user));
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Google sign-in failed.',
            error: err.message,
        });
    }
};

// GET /api/auth/oauth/config
const getOAuthConfig = async (_req, res) => {
    return res.json({
        success: true,
        data: {
            googleClientId: getGoogleBrowserClientId(),
            appleClientId: getAppleClientId(),
            appleRedirectUri: getAppleRedirectUri(),
        },
    });
};

// POST /api/auth/oauth/apple
const loginWithApple = async (req, res) => {
    const idToken = String(req.body.idToken || '').trim();
    const explicitName = String(req.body.name || '').trim();
    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Apple identity token is required.' });
    }
    const clientId = getAppleClientId();
    if (!clientId) {
        return res.status(503).json({
            success: false,
            message: 'Apple sign-in is not configured. Set APPLE_CLIENT_ID.',
        });
    }
    try {
        const { jwtVerify } = await getJoseModule();
        const jwks = await getAppleJwks();
        const verification = await jwtVerify(idToken, jwks, {
            issuer: 'https://appleid.apple.com',
            audience: clientId,
        });
        const payload = verification.payload || {};
        const providerSub = String(payload.sub || '').trim();
        if (!providerSub) {
            return res.status(400).json({ success: false, message: 'Apple token is missing subject.' });
        }
        const user = await upsertOAuthUser({
            provider: 'apple',
            providerSub,
            email: payload.email,
            name: explicitName,
        });
        return res.json(buildAuthSuccessResponse(user));
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Apple sign-in failed.',
            error: err.message,
        });
    }
};

// POST /api/auth/passkeys/register/options
const getPasskeyRegistrationOptions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+passkeyChallenge +passkeyChallengeExpiresAt');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }
        const options = await generateRegistrationOptions({
            rpName: getPasskeyRpName(),
            rpID: getPasskeyRpId(),
            userName: user.email,
            userDisplayName: user.name,
            userID: Buffer.from(String(user._id), 'utf8'),
            timeout: 60000,
            attestationType: 'none',
            excludeCredentials: asArray(user.passkeys).map((passkey) => ({
                id: passkey.credentialID,
                transports: asArray(passkey.transports),
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });
        setPasskeyChallenge(user, options.challenge);
        await user.save();
        return res.json({ success: true, options });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to prepare passkey registration.', error: err.message });
    }
};

// POST /api/auth/passkeys/register/verify
const verifyPasskeyRegistration = async (req, res) => {
    const response = req.body.credential;
    if (!response || typeof response !== 'object') {
        return res.status(400).json({ success: false, message: 'Passkey credential response is required.' });
    }
    try {
        const user = await User.findById(req.user.id).select('+passkeyChallenge +passkeyChallengeExpiresAt +passkeys.publicKey');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }
        if (!isPasskeyChallengeValid(user)) {
            clearPasskeyChallenge(user);
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Passkey registration challenge expired. Please try again.',
            });
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: user.passkeyChallenge,
            expectedOrigin: parsePasskeyOrigins(),
            expectedRPID: getPasskeyRpId(),
            requireUserVerification: false,
        });
        if (!verification.verified || !verification.registrationInfo) {
            return res.status(400).json({ success: false, message: 'Unable to verify passkey registration.' });
        }

        const registration = verification.registrationInfo;
        const credentialID = registration.credential.id;
        const publicKey = Buffer.from(registration.credential.publicKey).toString('base64url');
        const existingPasskey = asArray(user.passkeys).some((passkey) => passkey.credentialID === credentialID);
        if (!existingPasskey) {
            user.passkeys.push({
                credentialID,
                publicKey,
                counter: registration.credential.counter,
                transports: asArray(response.response?.transports),
                deviceType: registration.credentialDeviceType,
                backedUp: Boolean(registration.credentialBackedUp),
                lastUsedAt: new Date(),
            });
        }
        clearPasskeyChallenge(user);
        await user.save();
        return res.json({
            success: true,
            message: 'Passkey is ready for faster sign-in.',
            passkeys: asArray(user.passkeys).length,
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: 'Passkey verification failed.', error: err.message });
    }
};

// POST /api/auth/passkeys/authenticate/options
const getPasskeyAuthenticationOptions = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required for passkey sign-in.' });
    }
    try {
        const user = await User.findOne({ email }).select('+passkeyChallenge +passkeyChallengeExpiresAt');
        if (!user || asArray(user.passkeys).length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No passkey is registered for this account.',
            });
        }
        const options = await generateAuthenticationOptions({
            rpID: getPasskeyRpId(),
            timeout: 60000,
            userVerification: 'preferred',
            allowCredentials: asArray(user.passkeys).map((passkey) => ({
                id: passkey.credentialID,
                transports: asArray(passkey.transports),
            })),
        });
        setPasskeyChallenge(user, options.challenge);
        await user.save();
        return res.json({ success: true, options });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to prepare passkey sign-in.', error: err.message });
    }
};

// POST /api/auth/passkeys/authenticate/verify
const verifyPasskeyAuthentication = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const response = req.body.credential;
    if (!email || !response || typeof response !== 'object') {
        return res.status(400).json({
            success: false,
            message: 'Email and passkey credential response are required.',
        });
    }
    try {
        const user = await User.findOne({ email }).select('+passkeyChallenge +passkeyChallengeExpiresAt +passkeys.publicKey');
        if (!user || asArray(user.passkeys).length === 0) {
            return res.status(404).json({ success: false, message: 'No passkey is registered for this account.' });
        }
        if (!isPasskeyChallengeValid(user)) {
            clearPasskeyChallenge(user);
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Passkey sign-in challenge expired. Please try again.',
            });
        }

        const passkey = asArray(user.passkeys).find((item) => item.credentialID === response.id);
        if (!passkey) {
            return res.status(400).json({
                success: false,
                message: 'This passkey is not registered for the requested account.',
            });
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: user.passkeyChallenge,
            expectedOrigin: parsePasskeyOrigins(),
            expectedRPID: getPasskeyRpId(),
            credential: {
                id: passkey.credentialID,
                publicKey: Buffer.from(passkey.publicKey, 'base64url'),
                counter: Number(passkey.counter || 0),
                transports: asArray(passkey.transports),
            },
            requireUserVerification: false,
        });

        if (!verification.verified) {
            return res.status(401).json({ success: false, message: 'Passkey sign-in could not be verified.' });
        }

        passkey.counter = verification.authenticationInfo.newCounter;
        passkey.lastUsedAt = new Date();
        clearPasskeyChallenge(user);
        await user.save();
        return res.json(buildAuthSuccessResponse(user));
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Passkey sign-in failed.', error: err.message });
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
        const responsePayload = {
            success: true,
            message: 'Request received. If an account exists for that email, a password reset link has been sent.',
        };

        if (!user) {
            res.clearCookie('homekey_reset_token', resetCookieOptions);
            res.clearCookie('homekey_reset_email', resetCookieOptions);
            return res.json(responsePayload);
        }

        const { rawToken, tokenHash } = buildPasswordResetToken();
        const expiresAt = new Date(Date.now() + (resetMinutes * 60 * 1000));

        user.resetPasswordTokenHash = tokenHash;
        user.resetPasswordExpiresAt = expiresAt;
        await user.save();

        // Keep the reset token out of public UI by storing it in an httpOnly cookie.
        res.cookie('homekey_reset_token', rawToken, resetCookieOptions);
        res.cookie('homekey_reset_email', normalizedEmail, resetCookieOptions);
        if (process.env.NODE_ENV !== 'production') {
            const frontendOrigin = String(process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
            responsePayload.previewResetUrl = `${frontendOrigin}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;
            responsePayload.expiresAt = expiresAt;
        }
        return res.json(responsePayload);
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

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

module.exports = {
    register,
    login,
    getCurrentUser,
    updateCurrentUser,
    getOAuthConfig,
    loginWithGoogle,
    loginWithApple,
    getPasskeyRegistrationOptions,
    verifyPasskeyRegistration,
    getPasskeyAuthenticationOptions,
    verifyPasskeyAuthentication,
    forgotPassword,
    resetPassword,
};
