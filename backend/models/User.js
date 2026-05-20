'use strict';

const mongoose = require('mongoose');

const AlertCriteriaSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['sale', 'rental'],
        },
        city: {
            type: String,
            trim: true,
        },
        minPrice: {
            type: Number,
            min: 0,
        },
        maxPrice: {
            type: Number,
            min: 0,
        },
        rooms: {
            type: String,
            trim: true,
        },
        baths: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const SavedAlertSearchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            default: 'My Instant Alert',
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        criteria: {
            type: AlertCriteriaSchema,
            default: () => ({}),
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const InstantAlertInboxItemSchema = new mongoose.Schema(
    {
        searchId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        searchName: {
            type: String,
            trim: true,
        },
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        propertySnapshot: {
            title: { type: String, trim: true },
            type: { type: String, trim: true },
            city: { type: String, trim: true },
            price: { type: Number, min: 0 },
            bedrooms: { type: Number, min: 0 },
            bathrooms: { type: Number, min: 0 },
            image: { type: String, trim: true },
            createdAt: { type: Date },
        },
        message: {
            type: String,
            trim: true,
        },
        readAt: {
            type: Date,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
        },
        whatsapp: {
            type: String,
            trim: true,
        },
        preferredContactMethod: {
            type: String,
            enum: ['email', 'whatsapp', 'phone'],
            default: 'email',
        },
        notifications: {
            sendThankYou: { type: Boolean, default: true },
            sendExpiryReminder: { type: Boolean, default: true },
        },
        instantAlerts: {
            enabled: { type: Boolean, default: false },
            deliverInApp: { type: Boolean, default: true },
            deliverEmail: { type: Boolean, default: false },
            savedSearches: {
                type: [SavedAlertSearchSchema],
                default: [],
            },
            inbox: {
                type: [InstantAlertInboxItemSchema],
                default: [],
            },
        },
        role: {
            type: String,
            enum: ['buyer', 'seller', 'agent', 'admin'],
            default: 'buyer',
        },
        agency: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
            select: false,
        },
        resetPasswordTokenHash: {
            type: String,
            select: false,
        },
        resetPasswordExpiresAt: {
            type: Date,
            select: false,
        },
        listings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Property',
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
