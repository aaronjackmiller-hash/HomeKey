'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// MongoDB connection
if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set. Using local fallback. Set this env var in Render.');
}
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey';
const PORT = process.env.PORT || 5000;

// Connect to MongoDB. bufferCommands:false means queries throw immediately
// when the DB is not yet ready (the controller checks readyState and returns
// a 503 so the frontend can auto-retry).  We do NOT call process.exit() here
// — a transient Atlas hiccup should not permanently crash the service.
mongoose
    .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        bufferCommands: false,
    })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB initial connection error:', err.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/users', require('./routes/users'));
app.use('/api/agents', require('./routes/agents'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// API 404 handler — fires for any /api/* route not matched above
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// In production, serve the built React app for all remaining (non-API) routes
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    app.get('*', apiLimiter, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
} else {
    // Development: 404 for everything else
    app.use((req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Bind the port immediately so Render (and other hosts) see the process as
// healthy right away.  The DB connection is established in parallel above;
// the routes check readyState and return 503 while it is still pending.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));