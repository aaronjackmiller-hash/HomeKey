'use strict';

/**
 * smsService.js
 *
 * Sends SMS confirmations via Twilio. These messages are intentionally
 * best-effort: a failed SMS should never block account creation, listing
 * publish, or roommate matching submissions.
 */

let twilioClient = null;

const readEnv = (key) => String(process.env[key] || '').trim();

const getTwilioClient = () => {
    if (twilioClient) return twilioClient;

    const accountSid = readEnv('TWILIO_ACCOUNT_SID');
    const authToken = readEnv('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
        return null;
    }

    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
};

const getTwilioSenderConfig = () => {
    const preferredFromNumber = readEnv('TWILIO_FROM_NUMBER');
    const legacyFromNumber = readEnv('TWILIO_PHONE_NUMBER');
    const messagingServiceSid = readEnv('TWILIO_MESSAGING_SERVICE_SID');
    return {
        fromNumber: preferredFromNumber || legacyFromNumber,
        fromNumberEnv: preferredFromNumber ? 'TWILIO_FROM_NUMBER' : (legacyFromNumber ? 'TWILIO_PHONE_NUMBER' : null),
        messagingServiceSid,
    };
};

const getSafeTwilioConfigStatus = ({ fromNumberEnv, messagingServiceSid }) => ({
    accountSidConfigured: Boolean(readEnv('TWILIO_ACCOUNT_SID')),
    authTokenConfigured: Boolean(readEnv('TWILIO_AUTH_TOKEN')),
    sender: messagingServiceSid ? 'messaging_service' : (fromNumberEnv ? 'from_number' : 'missing'),
    fromNumberEnv,
    messagingServiceSidConfigured: Boolean(messagingServiceSid),
});

const compactObject = (value) => Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== '')
);

const logSmsResult = (level, logContext, result) => {
    const safeDetails = compactObject({
        attempted: result.attempted,
        success: result.success,
        status: result.status,
        reason: result.reason,
        provider: result.provider,
        providerCode: result.providerCode,
        providerStatus: result.providerStatus,
        moreInfo: result.moreInfo,
        accountSidConfigured: result.accountSidConfigured,
        authTokenConfigured: result.authTokenConfigured,
        sender: result.sender,
        fromNumberEnv: result.fromNumberEnv,
        messagingServiceSidConfigured: result.messagingServiceSidConfigured,
        messageSid: result.messageSid,
    });
    const logger = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.info);
    logger(`[smsService] ${logContext} ${result.status}`, safeDetails);
};

/**
 * Converts a phone number to E.164 format required by Twilio.
 * Keeps explicit country codes, maps Israeli local numbers, and supports
 * bare North American 10-digit numbers from US/CA users.
 */
const toE164 = (phone) => {
    const value = String(phone || '').trim();
    const raw = value.replace(/[\s\-().]/g, '');
    if (!raw) return null;
    if (raw.startsWith('+')) return raw;

    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('00')) return `+${digits.slice(2)}`;
    if (/^1\d{10}$/.test(digits)) return `+${digits}`;
    if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
    if (/^[2-9]\d{9}$/.test(digits)) return `+1${digits}`;
    return `+${digits}`;
};

const sendSms = async ({ toPhone, body, logContext = 'SMS' }) => {
    let senderConfig = { fromNumber: '', fromNumberEnv: null, messagingServiceSid: '' };
    try {
        const client = getTwilioClient();
        senderConfig = getTwilioSenderConfig();
        const { fromNumber, fromNumberEnv, messagingServiceSid } = senderConfig;
        const safeConfig = getSafeTwilioConfigStatus(senderConfig);

        if (!client || (!fromNumber && !messagingServiceSid)) {
            const result = {
                success: false,
                attempted: false,
                status: 'skipped',
                reason: 'twilio_not_configured',
                provider: 'twilio',
                ...safeConfig,
            };
            logSmsResult('warn', logContext, result);
            return result;
        }

        const toNumber = toE164(toPhone);
        if (!toNumber) {
            const result = {
                success: false,
                attempted: false,
                status: 'skipped',
                reason: 'invalid_phone',
                provider: 'twilio',
                ...safeConfig,
            };
            logSmsResult('warn', logContext, result);
            return result;
        }

        const messagePayload = {
            body,
            to: toNumber,
            ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
        };

        const message = await client.messages.create(messagePayload);

        const result = {
            success: true,
            attempted: true,
            status: message?.status || 'accepted',
            provider: 'twilio',
            messageSid: message?.sid,
            ...safeConfig,
        };
        logSmsResult('info', logContext, result);
        return result;
    } catch (err) {
        const safeConfig = getSafeTwilioConfigStatus(senderConfig);
        const result = {
            success: false,
            attempted: true,
            status: 'failed',
            reason: 'twilio_error',
            provider: 'twilio',
            providerCode: err?.code ? String(err.code) : undefined,
            providerStatus: err?.status || err?.statusCode,
            moreInfo: err?.moreInfo,
            ...safeConfig,
        };
        logSmsResult('error', logContext, result);
        return result;
    }
};

const buildLocationText = (...values) => values.filter(Boolean).join(', ') || 'your area';

const withOptOut = (message) => `${message} Reply STOP to opt out.`;

const sendRegistrationThankYouSms = async ({ toPhone, name }) => sendSms({
    toPhone,
    body: withOptOut(`HomeKey: Thanks${name ? `, ${name}` : ''} for creating your account. Your login is ready.`),
    logContext: 'registration thank-you SMS',
});

const sendPropertyListingConfirmationSms = async ({ toPhone, listingType, title, city }) => {
    const processText = listingType === 'sale' ? 'for-sale listing' : 'rental listing';
    const locationText = buildLocationText(city);
    const titleText = title ? `"${title}"` : `your ${processText}`;
    return sendSms({
        toPhone,
        body: withOptOut(`HomeKey: Thanks - ${titleText} in ${locationText} is now live.`),
        logContext: `${processText} confirmation SMS`,
    });
};

const sendRoommateListingConfirmationSms = async ({ toPhone, city, neighborhood }) => {
    const locationText = buildLocationText(neighborhood, city);
    return sendSms({
        toPhone,
        body: withOptOut(`HomeKey: Thanks - your room listing in ${locationText} is now live.`),
        logContext: 'room listing confirmation SMS',
    });
};

const sendRoommateSeekerConfirmationSms = async ({ toPhone, city, neighborhood }) => {
    const locationText = buildLocationText(neighborhood, city);
    return sendSms({
        toPhone,
        body: withOptOut(`HomeKey: Thanks - your roommate search profile for ${locationText} is now live.`),
        logContext: 'roommate search confirmation SMS',
    });
};

// Backward-compatible export for the existing roommate listing controller.
const sendListingPublishedSms = sendRoommateListingConfirmationSms;

module.exports = {
    sendSms,
    sendRegistrationThankYouSms,
    sendPropertyListingConfirmationSms,
    sendRoommateListingConfirmationSms,
    sendRoommateSeekerConfirmationSms,
    sendListingPublishedSms,
};
