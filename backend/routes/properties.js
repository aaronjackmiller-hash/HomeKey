const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// GET /api/properties - List all properties with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.minPrice) filter.price = { $gte: Number(req.query.minPrice) };
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
    }
    if (req.query.bedrooms) filter.bedrooms = { $gte: Number(req.query.bedrooms) };
    if (req.query.city) {
      filter['address.city'] = { $regex: req.query.city, $options: 'i' };
    }

    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('agent', 'name email phone agency')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      properties,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'agent',
      'name email phone agency bio photo'
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

// PUT /api/properties/:id - Update property
router.put('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
