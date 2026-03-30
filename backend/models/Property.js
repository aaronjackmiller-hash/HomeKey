const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
    },
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    sqft: { type: Number, required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    propertyType: {
      type: String,
      enum: ['house', 'condo', 'townhouse', 'land', 'commercial'],
      default: 'house',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold'],
      default: 'active',
    },
    yearBuilt: { type: Number },
    garage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
