'use strict';

const { runListingLifecycleSweep } = require('./propertyLifecycleService');

const DEFAULT_INTERVAL_MINUTES = 60;

const parseIntervalMinutes = () => {
    const raw = Number(process.env.LISTING_LIFECYCLE_SWEEP_MINUTES || DEFAULT_INTERVAL_MINUTES);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INTERVAL_MINUTES;
    return Math.max(5, Math.min(24 * 60, Math.floor(raw)));
};

const createPropertyLifecycleRunner = (logger = console) => {
    let timer = null;
    let inFlight = false;
    const status = {
        enabled: process.env.LISTING_LIFECYCLE_ENABLED !== 'false',
        intervalMinutes: parseIntervalMinutes(),
        inFlight: false,
        startedAt: null,
        lastStartedAt: null,
        lastFinishedAt: null,
        lastResult: null,
        lastError: null,
    };

    const runOnce = async (trigger = 'manual') => {
        if (!status.enabled) {
            return { skipped: true, reason: 'Listing lifecycle runner disabled', trigger };
        }
        if (inFlight) {
            return { skipped: true, reason: 'Listing lifecycle sweep already running', trigger };
        }
        inFlight = true;
        status.inFlight = true;
        status.lastStartedAt = new Date().toISOString();
        status.lastError = null;
        try {
            const result = await runListingLifecycleSweep();
            status.lastResult = {
                trigger,
                ...result,
            };
            return status.lastResult;
        } catch (err) {
            status.lastError = err.message;
            throw err;
        } finally {
            inFlight = false;
            status.inFlight = false;
            status.lastFinishedAt = new Date().toISOString();
        }
    };

    const start = () => {
        if (!status.enabled || timer) return;
        status.startedAt = new Date().toISOString();
        const intervalMs = status.intervalMinutes * 60 * 1000;
        timer = setInterval(async () => {
            try {
                const result = await runOnce('scheduled');
                if (result.skipped) {
                    logger.log(`[lifecycle] Scheduled sweep skipped: ${result.reason}`);
                    return;
                }
                logger.log(
                    `[lifecycle] Sweep complete (expired=${result.expiredListings}, reminders=${result.remindersSent}, deleted=${result.deletedListings}).`
                );
            } catch (err) {
                logger.error('[lifecycle] Scheduled sweep failed:', err.message);
            }
        }, intervalMs);
        logger.log(`[lifecycle] Runner started (every ${status.intervalMinutes} minute(s)).`);
    };

    const stop = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    };

    return {
        start,
        stop,
        runOnce,
        getStatus: () => ({
            ...status,
            timerActive: Boolean(timer),
            inFlight: status.inFlight,
        }),
    };
};

module.exports = {
    createPropertyLifecycleRunner,
};
