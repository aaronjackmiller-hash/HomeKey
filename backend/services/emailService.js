'use strict';

let cachedTransporter = null;
let cachedConfigKey = '';

const pickFirstNonEmpty = (...values) => {
    for (const value of values) {
        const normalized = String(value || '').trim();
        if (normalized) return normalized;
    }
    return '';
};

const parseBoolean = (value, fallback = false) => {
    if (value == null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const getEmailConfig = () => {
    const host = pickFirstNonEmpty(process.env.SMTP_HOST, process.env.MAIL_HOST);
    const port = Number(pickFirstNonEmpty(process.env.SMTP_PORT, process.env.MAIL_PORT) || 587);
    const user = pickFirstNonEmpty(process.env.SMTP_USER, process.env.SMTP_USERNAME, process.env.MAIL_USER);
    const pass = pickFirstNonEmpty(process.env.SMTP_PASS, process.env.SMTP_PASSWORD, process.env.MAIL_PASS);
    const from = pickFirstNonEmpty(process.env.EMAIL_FROM, process.env.SMTP_FROM, process.env.MAIL_FROM);
    const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);

    if (!host || !from) {
        return null;
    }

    return {
        host,
        port: Number.isFinite(port) && port > 0 ? port : 587,
        secure,
        from,
        auth: user || pass ? { user, pass } : undefined,
    };
};

const getTransporter = () => {
    const config = getEmailConfig();
    if (!config) return null;

    const configKey = JSON.stringify({
        host: config.host,
        port: config.port,
        secure: config.secure,
        from: config.from,
        authUser: config.auth?.user || '',
    });
    if (cachedTransporter && cachedConfigKey === configKey) return { transporter: cachedTransporter, config };

    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        ...(config.auth ? { auth: config.auth } : {}),
    });
    cachedConfigKey = configKey;
    return { transporter: cachedTransporter, config };
};

const sendPasswordResetEmail = async ({ toEmail, resetUrl, expiresAt }) => {
    try {
        const mailer = getTransporter();
        if (!mailer) {
            console.warn('[emailService] SMTP is not configured - skipping password reset email. Set SMTP_HOST and EMAIL_FROM.');
            return { success: false, error: 'Email not configured' };
        }

        const expiryText = expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime())
            ? expiresAt.toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })
            : 'soon';

        await mailer.transporter.sendMail({
            from: mailer.config.from,
            to: toEmail,
            subject: 'Reset your HomeKey password',
            text: [
                'Hi,',
                '',
                'We received a request to reset your HomeKey password.',
                `Reset your password here: ${resetUrl}`,
                '',
                `This link expires at ${expiryText}.`,
                'If you did not request this, you can ignore this email.',
            ].join('\n'),
            html: `
                <p>Hi,</p>
                <p>We received a request to reset your HomeKey password.</p>
                <p><a href="${resetUrl}">Reset your password</a></p>
                <p>This link expires at ${expiryText}.</p>
                <p>If you did not request this, you can ignore this email.</p>
            `,
        });

        return { success: true };
    } catch (err) {
        console.error('[emailService] Failed to send password reset email:', err.message);
        return { success: false, error: err.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
};
