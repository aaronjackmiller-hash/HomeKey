const mongoose = require('mongoose');
const Property = require('./models/Property');
const Agent = require('./models/Agent');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/homekey';

const sampleAgents = [
  { name: 'Sarah Johnson', email: 'sarah@homekey.com', phone: '555-101-2020' },
  { name: 'Mike Davis', email: 'mike@homekey.com', phone: '555-303-4040' },
];

const sampleProperties = [
  {
    address: '123 Oak Street, Austin, TX 78701',
    price: 425000,
    bedrooms: 3,
    bathrooms: 2,
    type: 'for-sale',
    description: 'Charming 3-bed home with hardwood floors and a spacious backyard in a quiet neighborhood.',
    images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
  },
  {
    address: '456 Maple Ave, Austin, TX 78702',
    price: 2200,
    bedrooms: 2,
    bathrooms: 1,
    type: 'rental',
    description: 'Modern 2-bed apartment near downtown with updated kitchen and in-unit laundry.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  },
  {
    address: '789 Pine Road, Round Rock, TX 78664',
    price: 550000,
    bedrooms: 4,
    bathrooms: 3,
    type: 'for-sale',
    description: 'Spacious family home with open floor plan, 3-car garage, and community pool access.',
    images: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
  },
  {
    address: '321 Elm Drive, Cedar Park, TX 78613',
    price: 1800,
    bedrooms: 1,
    bathrooms: 1,
    type: 'rental',
    description: 'Cozy 1-bed studio with modern finishes, gym access, and covered parking.',
    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
  },
  {
    address: '654 Birch Lane, Georgetown, TX 78626',
    price: 385000,
    bedrooms: 3,
    bathrooms: 2,
    type: 'for-sale',
    description: 'Well-maintained ranch-style home with large lot, new roof, and updated HVAC.',
    images: ['https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800'],
  },
  {
    address: '987 Cedar Blvd, Pflugerville, TX 78660',
    price: 2800,
    bedrooms: 3,
    bathrooms: 2,
    type: 'rental',
    description: 'Beautiful townhome with attached garage, fenced patio, and pet-friendly community.',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
  },
  {
    address: '147 Willow Way, Buda, TX 78610',
    price: 310000,
    bedrooms: 2,
    bathrooms: 2,
    type: 'for-sale',
    description: 'Cute starter home with open kitchen, master suite, and fully fenced backyard.',
    images: ['https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800'],
  },
  {
    address: '258 Cypress Court, Kyle, TX 78640',
    price: 3500,
    bedrooms: 4,
    bathrooms: 3,
    type: 'rental',
    description: 'Luxury executive rental with gourmet kitchen, home office, and resort-style pool.',
    images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');

  const propCount = await Property.countDocuments();
  const agentCount = await Agent.countDocuments();

  if (propCount === 0) {
    await Property.insertMany(sampleProperties);
    console.log(`Seeded ${sampleProperties.length} properties`);
  } else {
    console.log(`Skipping property seed — ${propCount} properties already exist`);
  }

  if (agentCount === 0) {
    await Agent.insertMany(sampleAgents);
    console.log(`Seeded ${sampleAgents.length} agents`);
  } else {
    console.log(`Skipping agent seed — ${agentCount} agents already exist`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
