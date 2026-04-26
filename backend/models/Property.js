'use strict';

const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['sale', 'rental'],
            required: [true, 'Property type is required'],
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price must be greater than or equal to 0'],
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            zip: { type: String, trim: true },
            country: { type: String, trim: true, default: 'Israel' },
        },
        bedrooms: {
            type: Number,
            required: [true, 'Number of bedrooms is required'],
            min: [0, 'Bedrooms must be greater than or equal to 0'],
        },
        bathrooms: {
            type: Number,
            required: [true, 'Number of bathrooms is required'],
            min: [0, 'Bathrooms must be greater than or equal to 0'],
        },
        size: {
            type: Number,
            required: [true, 'Size is required'],
            min: [0, 'Size must be greater than 0'],
        },
        floorNumber: {
            type: Number,
            min: [0, 'Floor number must be greater than or equal to 0'],
        },
        buildingDetails: {
            name: { type: String, trim: true },
            floorCount: { type: Number },
            apartmentCount: { type: Number },
        },
        financialDetails: {
            /**
             * totalMonthlyPayment - This field calculates the total monthly payment for a property.
             *
             * Behavior:
             * - For Rental Properties:
             *   - The total monthly payment is calculated based on the rental price.
             *   - It may also include additional fees such as utilities or maintenance costs.
             *   - This payment does not include property taxes or homeowner association dues.
             *
             * - For For-Sale Properties:
             *   - The total monthly payment reflects the estimated mortgage payment based on
             *     the sale price, down payment, and interest rate.
             *   - It may additionally include property taxes, HOA dues, and insurance costs.
             */
            totalMonthlyPayment: { type: Number, min: [0, 'Total monthly payment must be >= 0'] },
            vaadAmount: { type: Number, min: [0, 'Vaad amount must be >= 0'] },
            cityTaxes: { type: Number, min: [0, 'City taxes must be >= 0'] },
            maintenanceFees: { type: Number, min: [0, 'Maintenance fees must be >= 0'] },
            propertyTax: { type: Number, min: [0, 'Property tax must be >= 0'] },
        },
        dates: {
            availableFrom: { type: Date },
            listingDate: { type: Date, default: Date.now },
        },
        sourceType: {
            type: String,
            enum: ['manual', 'yad2-sync', 'yad2-scrape'],
            default: 'manual',
        },
        sources: [
            {
                sourceType: {
                    type: String,
                    enum: ['manual', 'yad2-sync', 'yad2-scrape'],
                    required: true,
                },
                externalSource: { type: String, trim: true, lowercase: true },
                externalId: { type: String, trim: true },
                externalUrl: { type: String, trim: true },
                addedAt: { type: Date, default: Date.now },
            },
        ],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        contact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true },
            whatsapp: { type: String, trim: true },
            preferredMethod: {
                type: String,
                enum: ['email', 'whatsapp', 'phone'],
                default: 'email',
            },
        },
        lifecycle: {
            expiresAt: { type: Date },
            lastReminderAt: { type: Date },
            reminderSentCount: { type: Number, default: 0, min: 0 },
            expiredAt: { type: Date },
            autoExpireEnabled: { type: Boolean, default: true },
        },
        showings: [
            {
                startsAt: { type: Date, required: true },
                endsAt: { type: Date, required: true },
                notes: { type: String, trim: true },
                attendeeLimit: { type: Number, min: 1, default: 20 },
                attendees: [
                    {
                        name: { type: String, trim: true, required: true },
                        email: { type: String, trim: true, lowercase: true },
                        phone: { type: String, trim: true },
                        message: { type: String, trim: true },
                        createdAt: { type: Date, default: Date.now },
                    },
                ],
            },
        ],
        inquiries: [
            {
                name: { type: String, trim: true, required: true },
                email: { type: String, trim: true, lowercase: true },
                phone: { type: String, trim: true },
                preferredMethod: {
                    type: String,
                    enum: ['email', 'whatsapp', 'phone'],
                    default: 'email',
                },
                message: { type: String, trim: true, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        images: [{ type: String }],
        externalSource: {
            type: String,
            trim: true,
            lowercase: true,
        },
        externalSegmentKey: {
            type: String,
            trim: true,
            lowercase: true,
        },
        externalId: {
            type: String,
            trim: true,
        },
        externalUrl: {
            type: String,
            trim: true,
        },
        agent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['active', 'pending', 'sold', 'rented', 'inactive'],
            default: 'active',
        },
    },
    { timestamps: true }
);

PropertySchema.index(
    { externalSource: 1, externalId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            externalSource: { $exists: true, $type: 'string' },
            externalId: { $exists: true, $type: 'string' },
        },
    }
);

module.exports = mongoose.model('Property', PropertySchema);
