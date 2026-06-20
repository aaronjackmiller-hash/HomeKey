'use strict';

/**
 * smsService.js
 *
 * Sends SMS confirmations via Twilio. Used to notify a roommate listing's
 * lister that their listing is now live, sent to the phone number they
 * provided during the wizard (Step 1 — required field).
 *
 * Fails silently from the caller's perspective — a failed SMS should
 * never block or fail the listing publish itself. Errors are logged
 * server-side for diagnostics.
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

/**
 * Converts a phone number to E.164 format required by Twilio.
 * Our roommate listings store phone as "+972XXXXXXXXX" already
 * (country code + local number, leading zero stripped) — this just
 * ensures the leading '+' is present.
 */
const toE164 = (phone) => {
    const raw = String(phone || '').trim();
    if (!raw) return null;
    if (raw.startsWith('+')) return raw;
    return `+${raw}`;
};

/**
 * Sends an SMS confirmation that a roommate listing is now live.
 * Returns { success: boolean, error?: string } — never throws.
 */
const sendListingPublishedSms = async ({ toPhone, city, neighborhood }) => {
    try {
        const client = getTwilioClient();
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!client || !fromNumber) {
            console.warn('[smsService] Twilio is not configured — skipping SMS confirmation.');
            return { success: false, error: 'Twilio not configured' };
        }

        const toNumber = toE164(toPhone);
        if (!toNumber) {
            return { success: false, error: 'No valid phone number to send to' };
        }

        const locationText = [neighborhood, city].filter(Boolean).join(', ') || 'your area';
        const messageBody =
            `🏠 HomeKey: Your room listing in ${locationText} is now live! ` +
            `People looking for a room nearby can now see and contact you. ` +
            `Reply STOP to opt out of future texts.`;

        await client.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toNumber,
        });

        return { success: true };
    } catch (err) {
        console.error('[smsService] Failed to send listing-published SMS:', err.message);
        return { success: false, error: err.message };
    }
};

module.exports = { sendListingPublishedSms };
