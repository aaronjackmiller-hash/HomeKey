const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// GET /api/properties - List all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find().populate('agent', 'name email phone');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'agent',
      'name email phone agency'
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/properties - Create new property listing
router.post('/', async (req, res) => {
  try {
    const property = new Property(req.body);
    const saved = await property.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
