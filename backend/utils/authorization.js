'use strict';

const User = require('../models/User');

const getRequestUserRole = async (req) => {
    if (!req || !req.user || !req.user.id) return null;
    const user = await User.findById(req.user.id).select('role').lean();
    return user ? user.role : null;
};

module.exports = {
    getRequestUserRole,
};
