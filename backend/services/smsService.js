'use strict';

/**
 * smsService.js
 *
 * Sends SMS confirmations via Twilio. These messages are intentionally
 * best-effort: a failed SMS should never block account creation, listing
 * publish, or roommate matching submissions.
 */

let twilioClient = null;

const getTwilioClient = () => {
    if (twilioClient) return twilioClient;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        return null;
    }

    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
};

const getTwilioSenderConfig = () => {
    const fromNumber = String(process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || '').trim();
    const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
    return { fromNumber, messagingServiceSid };
};

/**
 * Converts a phone number to E.164 format required by Twilio.
 * Our roommate listings store phone as "+972XXXXXXXXX" already
 * (country code + local number, leading zero stripped) — this just
 * ensures the leading '+' is present.
 */
const toE164 = (phone) => {
    const raw = String(phone || '').trim().replace(/[\s\-().]/g, '');
    if (!raw) return null;
    if (raw.startsWith('+')) return raw;
    if (raw.startsWith('00')) return `+${raw.slice(2)}`;
    if (raw.startsWith('0')) return `+972${raw.slice(1)}`;
    return `+${raw}`;
};

const sendSms = async ({ toPhone, body, logContext = 'SMS' }) => {
    try {
        const client = getTwilioClient();
        const { fromNumber, messagingServiceSid } = getTwilioSenderConfig();

        if (!client || (!fromNumber && !messagingServiceSid)) {
            console.warn(`[smsService] Twilio is not configured - skipping ${logContext}. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER.`);
            return { success: false, error: 'Twilio not configured' };
        }

        const toNumber = toE164(toPhone);
        if (!toNumber) {
            return { success: false, error: 'No valid phone number to send to' };
        }

        const messagePayload = {
            body,
            to: toNumber,
            ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
        };

        await client.messages.create(messagePayload);

        return { success: true };
    } catch (err) {
        console.error(`[smsService] Failed to send ${logContext}:`, err.message);
        return { success: false, error: err.message };
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
