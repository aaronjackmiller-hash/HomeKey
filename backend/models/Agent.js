const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    agency: { type: String, default: '' },
    bio: { type: String, default: '' },
    photo: { type: String, default: '' },
    listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
