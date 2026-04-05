'use strict';

const Property = require('../models/Property');

const ALLOWED_TYPES = ['sale', 'rental'];
const ALLOWED_STATUSES = ['active', 'pending', 'sold', 'rented', 'inactive'];

// GET /api/properties
const getAllProperties = async (req, res) => {
    try {
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
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// GET /api/properties/:id
const getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agent', 'name email phone');
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        res.json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// POST /api/properties
const createProperty = async (req, res) => {
    try {
        const property = await Property.create(req.body);
        res.status(201).json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// Allowed fields for property updates
const PROPERTY_UPDATE_FIELDS = [
    'title', 'description', 'type', 'price', 'address', 'bedrooms', 'bathrooms',
    'size', 'floorNumber', 'buildingDetails', 'financialDetails', 'dates',
    'images', 'agent', 'status',
];

// PUT /api/properties/:id
const updateProperty = async (req, res) => {
    try {
        const updateData = {};
        PROPERTY_UPDATE_FIELDS.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updateData[field] = req.body[field];
            }
        });

        const property = await Property.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('agent', 'name email phone');

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        res.json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// DELETE /api/properties/:id
const deleteProperty = async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        res.json({ success: true, message: 'Property deleted successfully' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = { getAllProperties, getPropertyById, createProperty, updateProperty, deleteProperty };
