const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    // Basic info
    address: { type: String, required: true },
    city: { type: String, required: true },
    price: { type: Number, required: true },
    propertyType: { type: String, enum: ['rental', 'for-sale'], required: true },

    // Rooms & size
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    size: { type: Number }, // sq. meters

    // Building details
    floorNumber: { type: Number },
    elevator: { type: Boolean, default: false },
    mamad: { type: Boolean, default: false }, // safe room

    // Condition & pets
    propertyCondition: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair', 'needs renovation'],
      default: 'good',
    },
    petsAllowed: { type: Boolean, default: false },
    parking: { type: String },

    // Financial
    totalMonthlyPayment: { type: Number },
    vaadAmount: { type: Number }, // Vaad Bayit per month (₪)
    cityTaxes: { type: Number }, // Arnona per month (₪)

    // Dates
    moveInDate: { type: Date },
    entryDate: { type: Date },

    // Description & media
    description: { type: String },
    images: [{ type: String }],

    // Agent reference
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', PropertySchema);
