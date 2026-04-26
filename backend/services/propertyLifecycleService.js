'use strict';

const Property = require('../models/Property');
const User = require('../models/User');

const DEFAULT_USER_EXPIRY_DAYS = 30;
const DEFAULT_AGENT_EXPIRY_DAYS = 60;
const DEFAULT_REMINDER_WINDOW_DAYS = 3;
const DEFAULT_HARD_DELETE_GRACE_DAYS = 30;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const getUserExpiryDays = () => parsePositiveInt(process.env.MANUAL_LISTING_USER_EXPIRY_DAYS, DEFAULT_USER_EXPIRY_DAYS);
const getAgentExpiryDays = () => parsePositiveInt(process.env.MANUAL_LISTING_AGENT_EXPIRY_DAYS, DEFAULT_AGENT_EXPIRY_DAYS);
const getReminderWindowDays = () => parsePositiveInt(process.env.MANUAL_LISTING_REMINDER_WINDOW_DAYS, DEFAULT_REMINDER_WINDOW_DAYS);
const getHardDeleteGraceDays = () => parsePositiveInt(process.env.MANUAL_LISTING_DELETE_GRACE_DAYS, DEFAULT_HARD_DELETE_GRACE_DAYS);

const addDays = (date, days) => new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));

const getPreferredContactDetails = (user, contact = {}) => {
    const preferredMethod = user.preferredContactMethod || contact.preferredMethod || 'email';
    return {
        preferredMethod,
        email: contact.email || user.email || '',
        phone: contact.phone || user.phone || '',
        whatsapp: contact.whatsapp || user.whatsapp || '',
        name: contact.name || user.name || 'Listing owner',
    };
};

const buildDeliveryTarget = (method, details) => {
    if (method === 'whatsapp' && details.whatsapp) return details.whatsapp;
    if (method === 'phone' && details.phone) return details.phone;
    if (details.email) return details.email;
    return details.whatsapp || details.phone || details.email || 'unavailable';
};

// Placeholder notification logger. This gives a reliable audit trail until a provider is wired.
const dispatchContactNotification = async ({
    channel,
    target,
    subject,
    body,
    metadata,
}) => {
    const payload = {
        channel,
        target,
        subject,
        body,
        metadata,
        sentAt: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.log('[notify]', JSON.stringify(payload));
    return { delivered: true, provider: 'log', payload };
};

const sendThankYouForListing = async ({ user, property }) => {
    if (!user || user.notifications?.sendThankYou === false) return null;
    const details = getPreferredContactDetails(user, property.contact);
    const method = details.preferredMethod;
    const target = buildDeliveryTarget(method, details);
    return dispatchContactNotification({
        channel: method,
        target,
        subject: 'Thanks for listing on HomeKey',
        body: `Thank you ${details.name}! Your listing "${property.title}" is now live on HomeKey.`,
        metadata: {
            userId: String(user._id),
            propertyId: String(property._id),
            category: 'listing-thank-you',
        },
    });
};

const sendExpiryReminder = async ({ user, property, expiresAt }) => {
    if (!user || user.notifications?.sendExpiryReminder === false) return null;
    const details = getPreferredContactDetails(user, property.contact);
    const method = details.preferredMethod;
    const target = buildDeliveryTarget(method, details);
    return dispatchContactNotification({
        channel: method,
        target,
        subject: 'Listing expiry reminder',
        body: `Hi ${details.name}, your listing "${property.title}" will expire on ${expiresAt.toLocaleDateString()}. Please renew it if you want it to remain active.`,
        metadata: {
            userId: String(user._id),
            propertyId: String(property._id),
            category: 'listing-expiry-reminder',
            expiresAt: expiresAt.toISOString(),
        },
    });
};

const sendProspectInquiryNotification = async ({ user, property, inquiry }) => {
    if (!user) return null;
    const details = getPreferredContactDetails(user, property.contact);
    const method = details.preferredMethod;
    const target = buildDeliveryTarget(method, details);
    return dispatchContactNotification({
        channel: method,
        target,
        subject: 'New listing inquiry',
        body: `${inquiry.name} sent a new inquiry for "${property.title}" and prefers ${inquiry.preferredMethod || 'email'} contact.`,
        metadata: {
            userId: String(user._id),
            propertyId: String(property._id),
            category: 'listing-inquiry',
        },
    });
};

const sendShowingRegistrationNotification = async ({ user, property, showing, attendee }) => {
    if (!user) return null;
    const details = getPreferredContactDetails(user, property.contact);
    const method = details.preferredMethod;
    const target = buildDeliveryTarget(method, details);
    return dispatchContactNotification({
        channel: method,
        target,
        subject: 'New showing registration',
        body: `${attendee.name} registered for showing ${new Date(showing.startsAt).toLocaleString()} on "${property.title}".`,
        metadata: {
            userId: String(user._id),
            propertyId: String(property._id),
            category: 'showing-registration',
        },
    });
};

const computeManualListingExpiry = (role) => {
    const days = role === 'agent' ? getAgentExpiryDays() : getUserExpiryDays();
    return addDays(new Date(), days);
};

const buildManualLifecycleDefaults = ({ role }) => ({
    expiresAt: computeManualListingExpiry(role),
    reminderSentCount: 0,
    autoExpireEnabled: true,
});

const runListingLifecycleSweep = async () => {
    const now = new Date();
    const reminderThreshold = addDays(now, getReminderWindowDays());
    const hardDeleteThreshold = addDays(now, -getHardDeleteGraceDays());

    // Auto-expire manual listings that crossed expiry.
    const expiredResult = await Property.updateMany(
        {
            sourceType: 'manual',
            status: { $ne: 'inactive' },
            'lifecycle.autoExpireEnabled': { $ne: false },
            'lifecycle.expiresAt': { $lte: now },
        },
        {
            $set: {
                status: 'inactive',
                'lifecycle.expiredAt': now,
            },
        }
    );

    const reminderCandidates = await Property.find({
        sourceType: 'manual',
        status: { $in: ['active', 'pending'] },
        'lifecycle.autoExpireEnabled': { $ne: false },
        'lifecycle.expiresAt': { $lte: reminderThreshold, $gt: now },
        $or: [
            { 'lifecycle.lastReminderAt': { $exists: false } },
            { 'lifecycle.lastReminderAt': null },
            { 'lifecycle.lastReminderAt': { $lt: addDays(now, -1) } },
        ],
    })
        .select('_id title owner contact lifecycle')
        .lean();

    let remindersSent = 0;
    for (const property of reminderCandidates) {
        if (!property.owner) continue;
        const owner = await User.findById(property.owner)
            .select('name email phone whatsapp preferredContactMethod notifications')
            .lean();
        if (!owner) continue;

        await sendExpiryReminder({
            user: owner,
            property,
            expiresAt: new Date(property.lifecycle.expiresAt),
        });
        remindersSent += 1;
        await Property.updateOne(
            { _id: property._id },
            {
                $set: { 'lifecycle.lastReminderAt': now },
                $inc: { 'lifecycle.reminderSentCount': 1 },
            }
        );
    }

    const deleteResult = await Property.deleteMany({
        sourceType: 'manual',
        status: 'inactive',
        'lifecycle.expiredAt': { $lte: hardDeleteThreshold, $exists: true },
    });

    return {
        expiredListings: Number(expiredResult.modifiedCount || 0),
        remindersSent,
        deletedListings: Number(deleteResult.deletedCount || 0),
    };
};

module.exports = {
    buildManualLifecycleDefaults,
    computeManualListingExpiry,
    sendThankYouForListing,
    sendProspectInquiryNotification,
    sendShowingRegistrationNotification,
    runListingLifecycleSweep,
};
