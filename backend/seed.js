'use strict';

/**
 * Seed script – populates the database with a demo agent and sample properties.
 *
 * Usage (from the /backend directory):
 *   node seed.js                   # uses MONGODB_URI env var or local fallback
 *   MONGODB_URI=<uri> node seed.js
 *
 * Running it more than once is safe: existing seed data is removed before
 * re-inserting so you always end up with a clean, predictable data set.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Property = require('./models/Property');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homekey';

// ---------------------------------------------------------------------------
// Demo agent account
// ---------------------------------------------------------------------------
const AGENT = {
    name: 'Demo Agent',
    email: 'agent@homekey.demo',
    password: 'HomeKey2024!',
    phone: '050-123-4567',
    role: 'agent',
    agency: 'HomeKey Realty',
    bio: 'Your trusted HomeKey demo agent with years of experience in residential real estate.',
};

// ---------------------------------------------------------------------------
// Sample properties
// ---------------------------------------------------------------------------
const buildProperties = (agentId) => [
    // ── FOR SALE ────────────────────────────────────────────────────────────
    {
        title: 'Spacious 4-Bedroom Villa in Herzliya',
        description:
            'A stunning private villa with a garden, private pool, and modern finishes. Located in a quiet cul-de-sac minutes from the beach.',
        type: 'sale',
        price: 4800000,
        address: { street: '12 HaSharon St', city: 'Herzliya', state: 'Center District', zip: '4610101', country: 'Israel' },
        bedrooms: 4,
        bathrooms: 3,
        size: 220,
        floorNumber: 0,
        buildingDetails: { name: 'Villa HaSharon', floorCount: 2, apartmentCount: 1 },
        financialDetails: { totalMonthlyPayment: 14500, vaadAmount: 0, cityTaxes: 2200, propertyTax: 1100 },
        dates: { availableFrom: new Date('2024-07-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Modern 3-Bedroom Apartment in Tel Aviv',
        description:
            'Bright, newly renovated apartment on the 8th floor with panoramic city views. Open-plan kitchen, smart home features, and secure underground parking.',
        type: 'sale',
        price: 3200000,
        address: { street: '45 Rothschild Blvd', city: 'Tel Aviv', state: 'Tel Aviv District', zip: '6688101', country: 'Israel' },
        bedrooms: 3,
        bathrooms: 2,
        size: 130,
        floorNumber: 8,
        buildingDetails: { name: 'Rothschild Tower', floorCount: 15, apartmentCount: 60 },
        financialDetails: { totalMonthlyPayment: 9800, vaadAmount: 800, cityTaxes: 1600, propertyTax: 800 },
        dates: { availableFrom: new Date('2024-06-15'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Charming 2-Bedroom Cottage in Zichron Ya\'akov',
        description:
            'A restored stone cottage nestled in the historic wine village of Zichron Ya\'akov. Original stone walls meet modern comforts. Private courtyard and vineyard views.',
        type: 'sale',
        price: 1950000,
        address: { street: '7 HaNadiv St', city: "Zichron Ya'akov", state: 'Haifa District', zip: '3094501', country: 'Israel' },
        bedrooms: 2,
        bathrooms: 1,
        size: 85,
        floorNumber: 0,
        buildingDetails: { name: 'Stone Cottage', floorCount: 1, apartmentCount: 1 },
        financialDetails: { totalMonthlyPayment: 6200, vaadAmount: 0, cityTaxes: 900, propertyTax: 500 },
        dates: { availableFrom: new Date('2024-08-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Luxury Penthouse in Netanya',
        description:
            'Two-story penthouse with sweeping Mediterranean sea views. Private rooftop terrace, jacuzzi, and concierge service. Steps from the beach promenade.',
        type: 'sale',
        price: 7500000,
        address: { street: '1 HaYam Blvd', city: 'Netanya', state: 'Center District', zip: '4270101', country: 'Israel' },
        bedrooms: 5,
        bathrooms: 4,
        size: 310,
        floorNumber: 22,
        buildingDetails: { name: 'Azure Tower', floorCount: 23, apartmentCount: 46 },
        financialDetails: { totalMonthlyPayment: 22000, vaadAmount: 2500, cityTaxes: 3500, propertyTax: 1800 },
        dates: { availableFrom: new Date('2024-09-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Garden Duplex in Ra\'anana',
        description:
            'Spacious duplex apartment with a private garden and direct access to a communal park. Ideal for families — close to top-rated schools and the city center.',
        type: 'sale',
        price: 2750000,
        address: { street: '33 Ahuza St', city: "Ra'anana", state: 'Center District', zip: '4310101', country: 'Israel' },
        bedrooms: 4,
        bathrooms: 2,
        size: 175,
        floorNumber: 1,
        buildingDetails: { name: 'Garden Residences', floorCount: 6, apartmentCount: 24 },
        financialDetails: { totalMonthlyPayment: 8700, vaadAmount: 600, cityTaxes: 1400, propertyTax: 700 },
        dates: { availableFrom: new Date('2024-07-15'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
        agent: agentId,
        status: 'active',
    },

    // ── FOR RENT ────────────────────────────────────────────────────────────
    {
        title: 'Cozy 1-Bedroom Apartment in Tel Aviv',
        description:
            'Fully furnished studio-style 1-bed apartment in the heart of Florentin. Modern kitchen, high ceilings, and great natural light. Utilities included.',
        type: 'rental',
        price: 5800,
        address: { street: '22 Florentin St', city: 'Tel Aviv', state: 'Tel Aviv District', zip: '6604401', country: 'Israel' },
        bedrooms: 1,
        bathrooms: 1,
        size: 52,
        floorNumber: 3,
        buildingDetails: { name: 'Florentin House', floorCount: 5, apartmentCount: 20 },
        financialDetails: { totalMonthlyPayment: 5800, vaadAmount: 200, cityTaxes: 0, maintenanceFees: 150 },
        dates: { availableFrom: new Date('2024-06-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: '3-Bedroom Family Apartment in Jerusalem',
        description:
            'Spacious apartment in the sought-after German Colony neighbourhood. Renovated kitchen, parquet floors, and a large balcony with garden views.',
        type: 'rental',
        price: 8500,
        address: { street: '15 Emek Refaim St', city: 'Jerusalem', state: 'Jerusalem District', zip: '9310101', country: 'Israel' },
        bedrooms: 3,
        bathrooms: 2,
        size: 120,
        floorNumber: 2,
        buildingDetails: { name: 'German Colony Flats', floorCount: 4, apartmentCount: 16 },
        financialDetails: { totalMonthlyPayment: 8500, vaadAmount: 400, cityTaxes: 0, maintenanceFees: 250 },
        dates: { availableFrom: new Date('2024-07-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Modern Studio in Haifa Carmel',
        description:
            'Compact studio with breathtaking Haifa bay views from the Carmel ridge. Fully equipped kitchen, built-in storage, and fast Wi-Fi included.',
        type: 'rental',
        price: 3800,
        address: { street: '8 HaCarmel Blvd', city: 'Haifa', state: 'Haifa District', zip: '3457101', country: 'Israel' },
        bedrooms: 0,
        bathrooms: 1,
        size: 38,
        floorNumber: 5,
        buildingDetails: { name: 'Carmel View', floorCount: 8, apartmentCount: 32 },
        financialDetails: { totalMonthlyPayment: 3800, vaadAmount: 150, cityTaxes: 0, maintenanceFees: 100 },
        dates: { availableFrom: new Date('2024-06-15'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: '2-Bedroom Sea-View Apartment in Netanya',
        description:
            'Light-filled apartment 200m from the beach. Large balcony with sea views, renovated bathrooms, and underground parking included.',
        type: 'rental',
        price: 7200,
        address: { street: '5 Kikar HaAtzmaut', city: 'Netanya', state: 'Center District', zip: '4250101', country: 'Israel' },
        bedrooms: 2,
        bathrooms: 1,
        size: 90,
        floorNumber: 4,
        buildingDetails: { name: 'SeaBreeze Residences', floorCount: 10, apartmentCount: 40 },
        financialDetails: { totalMonthlyPayment: 7200, vaadAmount: 350, cityTaxes: 0, maintenanceFees: 200 },
        dates: { availableFrom: new Date('2024-08-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'],
        agent: agentId,
        status: 'active',
    },
    {
        title: 'Furnished 4-Bedroom House in Kfar Saba',
        description:
            'Large detached house with a private garden, pergola, and BBQ area. Fully furnished and move-in ready. Walking distance to train station and city park.',
        type: 'rental',
        price: 11000,
        address: { street: '19 Weizmann St', city: 'Kfar Saba', state: 'Center District', zip: '4453501', country: 'Israel' },
        bedrooms: 4,
        bathrooms: 3,
        size: 200,
        floorNumber: 0,
        buildingDetails: { name: 'Weizmann House', floorCount: 2, apartmentCount: 1 },
        financialDetails: { totalMonthlyPayment: 11000, vaadAmount: 0, cityTaxes: 0, maintenanceFees: 400 },
        dates: { availableFrom: new Date('2024-09-01'), listingDate: new Date() },
        images: ['https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800'],
        agent: agentId,
        status: 'active',
    },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
    console.log('Connected.');

    // Remove previously seeded data only (identified by the demo agent email)
    const existingAgent = await User.findOne({ email: AGENT.email });
    if (existingAgent) {
        const removed = await Property.deleteMany({ agent: existingAgent._id });
        console.log(`Removed ${removed.deletedCount} previously seeded properties.`);
        await User.deleteOne({ _id: existingAgent._id });
        console.log('Removed previously seeded agent.');
    }

    // Create the demo agent
    const hashed = await bcrypt.hash(AGENT.password, 12);
    const agent = await User.create({ ...AGENT, password: hashed });
    console.log(`Created agent: ${agent.name} <${agent.email}> (password: ${AGENT.password})`);

    // Create the sample properties
    const properties = buildProperties(agent._id);
    const created = await Property.insertMany(properties);
    console.log(`Inserted ${created.length} properties (${created.filter((p) => p.type === 'sale').length} for sale, ${created.filter((p) => p.type === 'rental').length} for rent).`);

    // Attach listings to agent
    await User.findByIdAndUpdate(agent._id, { listings: created.map((p) => p._id) });

    console.log('\nSeed complete! You can log in with:');
    console.log(`  Email:    ${AGENT.email}`);
    console.log(`  Password: ${AGENT.password}`);

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
