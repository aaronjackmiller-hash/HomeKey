'use strict';

const mongoose = require('mongoose');

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
