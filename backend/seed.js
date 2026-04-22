'use strict';

/**
 * Seed script — populate the database with an agent user and sample Israeli properties.
 *
 * Can be imported by server.js for automatic startup seeding, or run directly:
 *   node seed.js            # seeds only if the DB is empty
 *   node seed.js --force    # drops existing seed data and re-seeds
 *
 * Requires MONGODB_URI (and optionally JWT_SECRET) from .env or the environment.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Property = require('./models/Property');

const SEED_AGENT = {
    name: 'Avi Cohen',
    email: 'avi.cohen@homekey-demo.il',
    password: 'Demo1234!',
    phone: '050-555-0100',
    role: 'agent',
    agency: 'HomeKey Realty',
    bio: 'Senior real-estate agent with 15 years of experience across Tel Aviv, Jerusalem, and Haifa.',
};

const buildProperties = (agentId) => [
    {
        title: 'Spacious 4-Room Apartment in Tel Aviv Center',
        description:
            'Bright, renovated apartment on Rothschild Boulevard. Close to Dizengoff Square, cafes, and public transport.',
        type: 'sale',
        price: 4200000,
        address: { street: 'Rothschild Blvd 55', city: 'Tel Aviv', state: 'Tel Aviv District', zip: '6688312', country: 'Israel' },
        bedrooms: 3,
        bathrooms: 2,
        size: 110,
        floorNumber: 4,
        images: ['https://picsum.photos/seed/homekey1/800/600'],
        buildingDetails: { name: 'Rothschild Tower', floorCount: 10, apartmentCount: 40 },
        financialDetails: { totalMonthlyPayment: 16500, vaadAmount: 800, cityTaxes: 1200 },
        dates: { availableFrom: new Date('2026-07-01') },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'Modern Studio in Florentin',
        description: 'Trendy studio in the heart of Florentin, ideal for young professionals. Fully furnished option available.',
        type: 'rental',
        price: 5500,
        address: { street: 'Vital 12', city: 'Tel Aviv', state: 'Tel Aviv District', zip: '6604001', country: 'Israel' },
        bedrooms: 1,
        bathrooms: 1,
        size: 42,
        floorNumber: 2,
        images: ['https://picsum.photos/seed/homekey2/800/600'],
        buildingDetails: { floorCount: 4, apartmentCount: 8 },
        financialDetails: { totalMonthlyPayment: 5500, vaadAmount: 300 },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'Penthouse with Sea View — Haifa Carmel',
        description: 'Spectacular 5-room penthouse on Mount Carmel with a panoramic view of the Mediterranean. Private roof terrace.',
        type: 'sale',
        price: 3800000,
        address: { street: 'HaZionut 90', city: 'Haifa', state: 'Haifa District', zip: '3481401', country: 'Israel' },
        bedrooms: 4,
        bathrooms: 3,
        size: 195,
        floorNumber: 12,
        images: ['https://picsum.photos/seed/homekey3/800/600'],
        buildingDetails: { name: 'Carmel Heights', floorCount: 12, apartmentCount: 24 },
        financialDetails: { totalMonthlyPayment: 14800, vaadAmount: 1200, cityTaxes: 2000 },
        dates: { availableFrom: new Date('2026-06-01') },
        status: 'active',
        agent: agentId,
    },
    {
        title: '3-Room Garden Apartment in Jerusalem — Rechavia',
        description: 'Quiet, sun-filled apartment with a private garden in the prestigious Rechavia neighborhood. Walking distance to the city center.',
        type: 'sale',
        price: 3200000,
        address: { street: 'Ramban 24', city: 'Jerusalem', state: 'Jerusalem District', zip: '9236201', country: 'Israel' },
        bedrooms: 2,
        bathrooms: 1,
        size: 85,
        floorNumber: 1,
        images: ['https://picsum.photos/seed/homekey4/800/600'],
        buildingDetails: { floorCount: 3, apartmentCount: 6 },
        financialDetails: { totalMonthlyPayment: 12500, vaadAmount: 400, cityTaxes: 950 },
        dates: { availableFrom: new Date('2026-08-01') },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'Luxury Rental — Herzliya Pituah Villa',
        description:
            'Fully furnished 7-room villa in Herzliya Pituah. Private pool, landscaped garden, and a 3-car garage. Minutes from the beach.',
        type: 'rental',
        price: 35000,
        address: { street: 'Shlomo HaMelech 8', city: 'Herzliya', state: 'Center District', zip: '4685206', country: 'Israel' },
        bedrooms: 6,
        bathrooms: 4,
        size: 420,
        floorNumber: 0,
        images: ['https://picsum.photos/seed/homekey5/800/600'],
        financialDetails: { totalMonthlyPayment: 35000, vaadAmount: 0, maintenanceFees: 3000 },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'Investor Special — 2-Room in Be\'er Sheva',
        description:
            'High-yield rental investment near Ben-Gurion University. Currently tenanted at ₪3,200/month. Strong demand from students.',
        type: 'sale',
        price: 750000,
        address: { street: 'Rager Blvd 101', city: "Be'er Sheva", state: 'South District', zip: '8400101', country: 'Israel' },
        bedrooms: 2,
        bathrooms: 1,
        size: 55,
        floorNumber: 3,
        images: ['https://picsum.photos/seed/homekey6/800/600'],
        buildingDetails: { floorCount: 6, apartmentCount: 36 },
        financialDetails: { totalMonthlyPayment: 3800, vaadAmount: 250, cityTaxes: 400 },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'New-Build 5-Room in Ra\'anana',
        description: 'Brand-new construction in a quiet cul-de-sac. European kitchen, smart-home system, underground parking.',
        type: 'sale',
        price: 3600000,
        address: { street: 'Achuza 147', city: "Ra'anana", state: 'Center District', zip: '4310401', country: 'Israel' },
        bedrooms: 4,
        bathrooms: 2,
        size: 148,
        floorNumber: 2,
        images: ['https://picsum.photos/seed/homekey7/800/600'],
        buildingDetails: { name: 'Achuza Gardens', floorCount: 7, apartmentCount: 28 },
        financialDetails: { totalMonthlyPayment: 14000, vaadAmount: 600, cityTaxes: 1100 },
        dates: { availableFrom: new Date('2027-01-01') },
        status: 'active',
        agent: agentId,
    },
    {
        title: 'Charming Old City Apartment — Jaffa Port',
        description: 'Restored 19th-century stone building steps from Jaffa Port. Exposed stone walls, vaulted ceilings, and sea-breeze balcony.',
        type: 'rental',
        price: 9500,
        address: { street: 'Louis Pasteur 3', city: 'Jaffa', state: 'Tel Aviv District', zip: '6816101', country: 'Israel' },
        bedrooms: 2,
        bathrooms: 1,
        size: 78,
        floorNumber: 1,
        images: ['https://picsum.photos/seed/homekey8/800/600'],
        buildingDetails: { floorCount: 2, apartmentCount: 4 },
        financialDetails: { totalMonthlyPayment: 9500, vaadAmount: 200 },
        status: 'active',
        agent: agentId,
    },
];

/**
 * Core seeding logic — assumes an active Mongoose connection already exists.
 * Safe to call multiple times: skips if data is already present (unless force=true).
 *
 * @param {boolean} force - Drop existing seed data and re-seed.
 * @returns {Promise<void>}
 */
async function runSeed(force = false) {
    if (force) {
        await Property.deleteMany({});
        await User.deleteMany({ role: 'agent', email: SEED_AGENT.email });
        console.log('[seed] Cleared existing seed data');
    } else {
        const count = await Property.countDocuments();
        if (count > 0) {
            console.log(`[seed] Database already has ${count} properties — skipping.`);
            return;
        }
    }

    // Create or reuse the seed agent
    let agent = await User.findOne({ email: SEED_AGENT.email });
    if (!agent) {
        const hashed = await bcrypt.hash(SEED_AGENT.password, 12);
        agent = await User.create({ ...SEED_AGENT, password: hashed });
        console.log(`[seed] Created agent: ${agent.name} <${agent.email}>`);
    } else {
        console.log(`[seed] Reusing existing agent: ${agent.name} <${agent.email}>`);
    }

    // Insert properties
    const properties = buildProperties(agent._id);
    const created = await Property.insertMany(properties);
    console.log(`[seed] Inserted ${created.length} properties.`);

    // Link listings back to agent
    await User.findByIdAndUpdate(agent._id, {
        $set: { listings: created.map((p) => p._id) },
    });

    console.log('[seed] ✅ Seed complete.');
    console.log(`[seed]    Agent login: ${SEED_AGENT.email}  /  password: ${SEED_AGENT.password}`);
}

// Allow this file to be run directly: node seed.js [--force]
if (require.main === module) {
    const force = process.argv.includes('--force');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey';

    mongoose
        .connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000 })
        .then(() => {
            console.log('[seed] Connected to MongoDB');
            return runSeed(force);
        })
        .then(() => mongoose.disconnect())
        .catch((err) => {
            console.error('[seed] Failed:', err.message);
            process.exit(1);
        });
}

module.exports = { runSeed };
