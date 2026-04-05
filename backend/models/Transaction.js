'use strict';

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: [true, 'Property reference is required'],
        },
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer reference is required'],
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        agent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        offerAmount: {
            type: Number,
            required: [true, 'Offer amount is required'],
            min: [0, 'Offer amount must be greater than or equal to 0'],
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
            default: 'pending',
        },
        notes: {
            type: String,
            trim: true,
        },
        offerDate: {
            type: Date,
            default: Date.now,
        },
        closingDate: {
            type: Date,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
