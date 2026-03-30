const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', AgentSchema);
