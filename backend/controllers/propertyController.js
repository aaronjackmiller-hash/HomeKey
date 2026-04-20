// GET /api/properties
const getAllProperties = async (req, res) => {
    try {
        // If the database is still in 'connecting' mode, we'll try to 
        // proceed anyway—Mongoose will queue the request until ready.
        const filter = {};
        if (req.query.type && ALLOWED_TYPES.includes(req.query.type)) {
            filter.type = req.query.type;
        }
        if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
            filter.status = req.query.status;
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        const properties = await Property.find(filter)
            .populate('agent', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: properties.length, data: properties });
    } catch (err) {
        // This is the only place it will show 'Database unavailable' now
        console.error('Property Fetch Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database unavailable', 
            error: err.message 
        });
    }
}; 
