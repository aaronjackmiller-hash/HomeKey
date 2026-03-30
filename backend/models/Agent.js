const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Agent', AgentSchema);
