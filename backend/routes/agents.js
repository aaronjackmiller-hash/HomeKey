const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ name: 1 });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
