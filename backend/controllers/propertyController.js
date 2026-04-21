'use strict';

const mongoose = require('mongoose');
const Property = require('../models/Property');

// Allowed fields for property updates
const PROPERTY_UPDATE_FIELDS = [
    'title', 'description', 'type', 'price', 'address', 'bedrooms', 'bathrooms',
    'size', 'floorNumber', 'buildingDetails', 'financialDetails', 'dates',
    'images', 'agent', 'status',
];

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
        if (req.query.city) {
            // Escape special regex characters to prevent regex injection
            const escapedCity = req.query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter['address.city'] = new RegExp(escapedCity, 'i');
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        // Mongoose will handle the connection queue automatically
        const properties = await Property.find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: properties.length,
            data: properties,
        });
    } catch (err) {
        console.error('Property Fetch Error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message,
        });
    }
};

// @desc    Get a single property by ID
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agent', 'name email phone agency');
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        res.json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private
const createProperty = async (req, res) => {
    try {
        const property = await Property.create(req.body);
        res.status(201).json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private
const updateProperty = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid property ID' });
    }
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
        });

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
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private
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
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

module.exports = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
};
