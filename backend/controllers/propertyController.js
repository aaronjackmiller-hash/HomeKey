const Property = require('../models/Property');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getAllProperties = async (req, res) => {
    try {
        const filter = {};
        
        // Basic filtering logic
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        // We use .find() - Mongoose will wait for the connection automatically
        const properties = await Property.find(filter)
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            count: properties.length, 
            data: properties 
        });
    } catch (err) {
        console.error('Property Fetch Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: err.message 
        });
    }
};

// This is the part that was likely missing or broken:
module.exports = {
    getAllProperties
};
