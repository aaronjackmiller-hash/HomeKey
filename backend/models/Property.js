const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    type: { type: String, enum: ['rental', 'for-sale'], required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', PropertySchema);
