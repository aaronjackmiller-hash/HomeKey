const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  price: { type: Number, required: true },
  propertyType: { type: String, enum: ['rental', 'for-sale'], required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  size: { type: Number }, // sq. meters
  floorNumber: { type: Number },
  elevator: { type: Boolean, default: false },
  mamad: { type: Boolean, default: false }, // safe room
  propertyCondition: {
    type: String,
    enum: ['new', 'excellent', 'good', 'fair', 'needs renovation'],
    default: 'good'
  },
  petsAllowed: { type: Boolean, default: false },
  parking: { type: String },
  totalMonthlyPayment: { type: Number },
  vaadAmount: { type: Number }, // Vaad Bayit per month
  cityTaxes: { type: Number }, // Arnona per month
  moveInDate: { type: Date },
  description: { type: String },
  images: [{ type: String }],
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', PropertySchema);
