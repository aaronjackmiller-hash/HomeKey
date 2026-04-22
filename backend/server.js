'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
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

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

const { runSeed } = require('./seed');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey';
const PORT = process.env.PORT || 5000;

mongoose
    .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        bufferCommands: false,
    })
    .then(() => {
        console.log('MongoDB connected');
        // Auto-seed if the database is empty (no-op if data already exists)
        return runSeed(false);
    })
    .catch((err) => console.error('MongoDB initial connection error:', err.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/users', require('./routes/users'));
app.use('/api/agents', require('./routes/agents'));

// Health check
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    const dbReady = dbState === 1;
    if (!dbReady) {
        return res.status(503).json({ status: 'degraded', db: dbStatus });
    }
    res.json({ status: 'ok', db: dbStatus });
});

// API 404 handler
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
    if (!fs.existsSync(path.join(frontendBuild, 'index.html'))) {
        console.error(
            'ERROR: frontend/build/index.html not found. ' +
            'The React app was not built before starting the server. ' +
            'Ensure the build command ran successfully during deployment.'
        );
        process.exit(1);
    }
    app.use(generalLimiter);
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuild, 'index.html'));
    });
} else {
    app.use((req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
