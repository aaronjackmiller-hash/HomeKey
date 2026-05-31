'use strict';

const { interpretSearchPrompt } = require('../services/searchInterpreterService');

const SUPPORTED_LANGUAGES = new Set(['en', 'he']);

const getRequestLanguage = (req) => {
    const requestedLanguage = String(req.body?.language || req.headers['accept-language'] || '')
        .split(',')
        .shift()
        .trim()
        .toLowerCase();
    return SUPPORTED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : 'en';
};

// @desc    Interpret a natural-language property search into structured filters
// @route   POST /api/search/interpret
// @access  Public
const interpretPropertySearch = async (req, res) => {
    try {
        const prompt = String(req.body?.prompt || '').trim();
        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Search prompt is required.',
            });
        }

        const interpretation = await interpretSearchPrompt({
            prompt,
            language: getRequestLanguage(req),
        });

        return res.json({
            success: true,
            data: interpretation,
        });
    } catch (err) {
        console.error('[ai-search] Interpretation error:', err);
        return res.status(500).json({
            success: false,
            message: 'Could not interpret search prompt.',
        });
    }
};

module.exports = {
    interpretPropertySearch,
};
