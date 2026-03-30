const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().populate('listings', 'address price bedrooms bathrooms sqft');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/agents/:id - Get agent profile with listings
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate(
      'listings',
      'address price bedrooms bathrooms sqft images status'
    );
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/agents - Create agent
router.post('/', async (req, res) => {
  try {
    const agent = new Agent(req.body);
    const saved = await agent.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
