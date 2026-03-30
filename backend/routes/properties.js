const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// GET /api/properties - List all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/properties - Create new property listing
router.post('/', async (req, res) => {
  try {
    const property = new Property(req.body);
    const saved = await property.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Validation error', error: err.message });
  }
});

module.exports = router;
