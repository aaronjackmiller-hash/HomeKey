require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');
const Agent = require('./models/Agent');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/homekey';

const agents = [
  {
    name: 'Rivka Cohen',
    email: 'rivka@homekeyrealty.co.il',
    phone: '052-123-4567',
    agency: 'HomeKey Realty',
    bio: 'Specializing in Tel Aviv and Gush Dan properties for over 10 years.',
  },
  {
    name: 'Moshe Levi',
    email: 'moshe@homekeyrealty.co.il',
    phone: '054-987-6543',
    agency: 'HomeKey Realty',
    bio: 'Expert in Jerusalem and surrounding areas with 8 years of experience.',
  },
];

const buildProperties = (agentIds) => [
  // --- Rentals ---
  {
    address: 'Dizengoff Street 42',
    city: 'Tel Aviv',
    price: 8500,
    propertyType: 'rental',
    bedrooms: 3,
    bathrooms: 2,
    size: 95,
    floorNumber: 4,
    elevator: true,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: false,
    parking: '1 underground spot included',
    totalMonthlyPayment: 9650,
    vaadAmount: 650,
    cityTaxes: 500,
    moveInDate: new Date('2024-09-01'),
    entryDate: new Date('2024-08-15'),
    description:
      '🏙️ Stunning renovated apartment in the heart of Tel Aviv on the iconic Dizengoff Street! ' +
      'This bright 3-bedroom gem features an open-plan living area flooded with natural light, ' +
      'a modern chef\'s kitchen with granite countertops, and a spacious master suite. ' +
      'Building has a secure Mamad (safe room), full elevator access, and underground parking. ' +
      'Steps from cafes, restaurants, and the beach. A true Tel Aviv lifestyle awaits! 🌟',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800',
    ],
    agent: agentIds[0],
  },
  {
    address: 'Rothschild Boulevard 18',
    city: 'Tel Aviv',
    price: 6200,
    propertyType: 'rental',
    bedrooms: 2,
    bathrooms: 1,
    size: 70,
    floorNumber: 2,
    elevator: false,
    mamad: false,
    propertyCondition: 'good',
    petsAllowed: true,
    parking: 'Street parking available',
    totalMonthlyPayment: 6950,
    vaadAmount: 400,
    cityTaxes: 350,
    moveInDate: new Date('2024-08-01'),
    entryDate: new Date('2024-07-20'),
    description:
      '🌿 Charming 2-bedroom apartment on the legendary Rothschild Boulevard! ' +
      'Situated on a tree-lined street with direct access to the city\'s vibrant cultural scene, ' +
      'this cozy apartment features original hardwood floors, high ceilings, and period details ' +
      'blended with modern amenities. Pet-friendly building — bring your furry friends! ' +
      'Surrounded by the best coffee shops, galleries, and tech hubs Tel Aviv has to offer. ☕🐾',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    agent: agentIds[0],
  },
  {
    address: 'Emek Refaim 55',
    city: 'Jerusalem',
    price: 7800,
    propertyType: 'rental',
    bedrooms: 4,
    bathrooms: 2,
    size: 120,
    floorNumber: 1,
    elevator: false,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: false,
    parking: 'Private driveway parking',
    totalMonthlyPayment: 9100,
    vaadAmount: 500,
    cityTaxes: 800,
    moveInDate: new Date('2024-10-01'),
    entryDate: new Date('2024-09-15'),
    description:
      '🕍 Spacious 4-bedroom garden apartment on the prestigious Emek Refaim Street in the ' +
      'German Colony neighborhood! This beautifully renovated property features Jerusalem stone ' +
      'walls, arched windows, and a private garden perfect for outdoor entertaining. ' +
      'Includes a Mamad (reinforced safe room), private parking, and is walking distance to ' +
      'restaurants, boutiques, and the First Station cultural complex. A rare Jerusalem treasure! 🌺',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    ],
    agent: agentIds[1],
  },
  {
    address: 'HaYarkon Street 102',
    city: 'Tel Aviv',
    price: 5500,
    propertyType: 'rental',
    bedrooms: 1,
    bathrooms: 1,
    size: 50,
    floorNumber: 5,
    elevator: true,
    mamad: false,
    propertyCondition: 'new',
    petsAllowed: true,
    parking: 'None',
    totalMonthlyPayment: 6050,
    vaadAmount: 350,
    cityTaxes: 200,
    moveInDate: new Date('2024-07-15'),
    entryDate: new Date('2024-07-01'),
    description:
      '🌊 Modern studio/1-bedroom apartment with breathtaking sea views on HaYarkon Street! ' +
      'Brand new renovation with sleek finishes, smart home features, and floor-to-ceiling windows ' +
      'overlooking the Mediterranean Sea. The building has an elevator and rooftop terrace. ' +
      'Pet-friendly and perfect for young professionals or couples who want to live steps from ' +
      'the beach, Gordon Pool, and Tel Aviv\'s vibrant nightlife scene! 🏖️✨',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800',
    ],
    agent: agentIds[0],
  },
  // --- For Sale ---
  {
    address: 'Ibn Gabirol Street 78',
    city: 'Tel Aviv',
    price: 3200000,
    propertyType: 'for-sale',
    bedrooms: 4,
    bathrooms: 2,
    size: 130,
    floorNumber: 8,
    elevator: true,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: true,
    parking: '2 secure underground parking spots',
    totalMonthlyPayment: null,
    vaadAmount: 1200,
    cityTaxes: 900,
    moveInDate: new Date('2024-09-01'),
    entryDate: new Date('2024-08-01'),
    description:
      '🏆 Prestigious 4-bedroom penthouse-level apartment on Ibn Gabirol Street — one of Tel Aviv\'s ' +
      'most sought-after addresses! Expansive 130 sqm layout with panoramic city views from all rooms. ' +
      'Features include a state-of-the-art kitchen, marble bathrooms, Mamad, 2 parking spots, ' +
      'and building amenities including gym and roof terrace. An exceptional investment opportunity ' +
      'in the heart of the "White City" — a UNESCO World Heritage Site! 🌟💎',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
    agent: agentIds[0],
  },
  {
    address: 'Rechov HaNevi\'im 23',
    city: 'Jerusalem',
    price: 2750000,
    propertyType: 'for-sale',
    bedrooms: 3,
    bathrooms: 2,
    size: 110,
    floorNumber: 3,
    elevator: true,
    mamad: true,
    propertyCondition: 'good',
    petsAllowed: false,
    parking: '1 parking spot in secure lot',
    totalMonthlyPayment: null,
    vaadAmount: 800,
    cityTaxes: 1100,
    moveInDate: new Date('2024-11-01'),
    entryDate: new Date('2024-10-15'),
    description:
      '🏛️ Magnificent 3-bedroom apartment in historic downtown Jerusalem! Set in a beautifully ' +
      'maintained Jerusalem stone building, this apartment combines old-world charm with modern ' +
      'comforts. High ceilings, arched doorways, and original terrazzo floors create a timeless ' +
      'atmosphere. Fully equipped kitchen, renovated bathrooms, Mamad, and elevator access. ' +
      'Walking distance to Mahane Yehuda Market, the Old City, and major cultural institutions. ' +
      'A rare Jerusalem gem with tremendous investment potential! 🕌✡️',
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    ],
    agent: agentIds[1],
  },
  {
    address: 'Sderot Ben Gurion 14',
    city: 'Haifa',
    price: 1850000,
    propertyType: 'for-sale',
    bedrooms: 3,
    bathrooms: 2,
    size: 100,
    floorNumber: 6,
    elevator: true,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: true,
    parking: '1 parking spot',
    totalMonthlyPayment: null,
    vaadAmount: 600,
    cityTaxes: 700,
    moveInDate: new Date('2024-10-01'),
    entryDate: new Date('2024-09-01'),
    description:
      '⛵ Stunning 3-bedroom apartment on Haifa\'s prestigious Ben Gurion Boulevard with ' +
      'unobstructed sea and port views! Completely renovated with premium finishes throughout — ' +
      'open kitchen with island, spa-like bathrooms, and floor-to-ceiling windows framing the ' +
      'breathtaking Mediterranean panorama. Building features elevator, Mamad, parking, and ' +
      'is minutes from the Carmel beaches and Haifa\'s thriving tech district. ' +
      'Perfect for families and investors alike! 🌊🏔️',
    images: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800',
    ],
    agent: agentIds[0],
  },
  {
    address: 'Herzl Street 8',
    city: 'Ra\'anana',
    price: 2100000,
    propertyType: 'for-sale',
    bedrooms: 5,
    bathrooms: 3,
    size: 160,
    floorNumber: 2,
    elevator: false,
    mamad: true,
    propertyCondition: 'new',
    petsAllowed: true,
    parking: '2 private parking spots in garage',
    totalMonthlyPayment: null,
    vaadAmount: 700,
    cityTaxes: 750,
    moveInDate: new Date('2025-01-01'),
    entryDate: new Date('2024-12-15'),
    description:
      '🌳 Magnificent new 5-bedroom garden apartment in Ra\'anana — one of Israel\'s most ' +
      'family-friendly cities! Built to the highest standards with luxury finishes, this ' +
      'spacious home features an open-plan living area, state-of-the-art smart home system, ' +
      'gourmet kitchen, and a private garden perfect for family life. ' +
      'Includes Mamad, 2 garage parking spots, and high-end appliances. ' +
      'Located in a quiet residential street minutes from top-rated schools, parks, ' +
      'shopping centers, and Ra\'anana\'s famous park. A perfect family forever home! 🏡👨‍👩‍👧‍👦',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
    ],
    agent: agentIds[0],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');

  // Clear existing data
  await Property.deleteMany({});
  await Agent.deleteMany({});
  console.log('Cleared existing data');

  // Insert agents
  const createdAgents = await Agent.insertMany(agents);
  const agentIds = createdAgents.map((a) => a._id);
  console.log(`Inserted ${createdAgents.length} agents`);

  // Insert properties
  const properties = buildProperties(agentIds);
  const createdProperties = await Property.insertMany(properties);
  console.log(`Inserted ${createdProperties.length} properties`);

  console.log('✅ Seed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
