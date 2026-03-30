const mongoose = require('mongoose');
const Property = require('./models/Property');
const Agent = require('./models/Agent');

const sampleAgents = [
  {
    name: 'Moshe Cohen',
    email: 'moshe@homekey.co.il',
    phone: '050-1234567'
  },
  {
    name: 'Rivka Levi',
    email: 'rivka@homekey.co.il',
    phone: '052-9876543'
  }
];

const getSampleProperties = (agentIds) => [
  {
    address: 'Dizengoff Street 85',
    city: 'Tel Aviv',
    price: 8500,
    propertyType: 'rental',
    bedrooms: 3,
    bathrooms: 2,
    size: 110,
    floorNumber: 4,
    elevator: true,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: false,
    parking: 'Underground parking spot included',
    totalMonthlyPayment: 9800,
    vaadAmount: 800,
    cityTaxes: 500,
    moveInDate: new Date('2025-02-01'),
    description: '🌟 Stunning 3-bedroom apartment in the heart of Tel Aviv! This beautifully renovated unit features gleaming hardwood floors, a modern chef\'s kitchen with granite countertops, and floor-to-ceiling windows with breathtaking city views. The spacious master suite includes a walk-in closet and an en-suite bathroom. Steps away from Dizengoff Square, the best cafes, and vibrant nightlife. Don\'t miss this gem! 💎',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
    ],
    agent: agentIds[0]
  },
  {
    address: 'Rothschild Boulevard 22',
    city: 'Tel Aviv',
    price: 4200000,
    propertyType: 'for-sale',
    bedrooms: 4,
    bathrooms: 3,
    size: 165,
    floorNumber: 8,
    elevator: true,
    mamad: true,
    propertyCondition: 'new',
    petsAllowed: true,
    parking: '2 underground parking spaces',
    totalMonthlyPayment: 18500,
    vaadAmount: 1500,
    cityTaxes: 1200,
    moveInDate: new Date('2025-03-15'),
    description: '✨ Prestigious penthouse-style apartment on the iconic Rothschild Boulevard! This brand-new luxury residence boasts soaring ceilings, a wraparound terrace with panoramic views of Tel Aviv, and top-of-the-line finishes throughout. The gourmet kitchen features Italian cabinetry and Miele appliances. Smart home technology, 24/7 security, and a stunning rooftop pool. Investor\'s dream or perfect family home! 🏙️',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
    ],
    agent: agentIds[1]
  },
  {
    address: 'Ben Gurion Avenue 45',
    city: 'Haifa',
    price: 5200,
    propertyType: 'rental',
    bedrooms: 2,
    bathrooms: 1,
    size: 75,
    floorNumber: 3,
    elevator: false,
    mamad: false,
    propertyCondition: 'good',
    petsAllowed: true,
    parking: 'Street parking available',
    totalMonthlyPayment: 5900,
    vaadAmount: 400,
    cityTaxes: 300,
    moveInDate: new Date('2025-01-15'),
    description: '🌊 Charming 2-bedroom apartment with spectacular views of Haifa Bay and the Mediterranean Sea! This well-maintained unit features a renovated kitchen, bright living spaces, and a lovely balcony perfect for watching stunning sunsets. Located in the desirable Carmel neighborhood, close to the Technion and excellent restaurants. Pets welcome! 🐕',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
    ],
    agent: agentIds[0]
  },
  {
    address: 'King George Street 12',
    city: 'Jerusalem',
    price: 2800000,
    propertyType: 'for-sale',
    bedrooms: 5,
    bathrooms: 3,
    size: 220,
    floorNumber: 2,
    elevator: true,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: false,
    parking: 'Private covered parking',
    totalMonthlyPayment: 14200,
    vaadAmount: 1200,
    cityTaxes: 1800,
    moveInDate: new Date('2025-04-01'),
    description: '🕌 Magnificent 5-bedroom Jerusalem stone apartment in one of the most sought-after addresses in the city! This grand residence exudes elegance with its original Jerusalem stone walls, arched doorways, and high ceilings. The updated kitchen maintains the classic charm while offering modern conveniences. Large private garden perfect for entertaining. Walking distance to Machane Yehuda market and the Old City. A rare find! 🌿',
    images: [
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800'
    ],
    agent: agentIds[1]
  },
  {
    address: 'HaNassi Boulevard 78',
    city: 'Haifa',
    price: 1650000,
    propertyType: 'for-sale',
    bedrooms: 3,
    bathrooms: 2,
    size: 130,
    floorNumber: 5,
    elevator: true,
    mamad: true,
    propertyCondition: 'good',
    petsAllowed: true,
    parking: 'Underground parking included',
    totalMonthlyPayment: 8500,
    vaadAmount: 700,
    cityTaxes: 650,
    moveInDate: new Date('2025-05-01'),
    description: '🌺 Bright and spacious 3-bedroom apartment on the prestigious HaNassi Boulevard with breathtaking views of the Carmel mountains and the sea! This well-maintained home features a renovated kitchen, updated bathrooms, and a large balcony ideal for outdoor dining. The building has been recently renovated with modern lobby and landscaped gardens. Close to top schools, parks, and the vibrant Carmel market. A wonderful family home! 🏡',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800'
    ],
    agent: agentIds[0]
  },
  {
    address: 'Allenby Street 55',
    city: 'Tel Aviv',
    price: 6800,
    propertyType: 'rental',
    bedrooms: 1,
    bathrooms: 1,
    size: 55,
    floorNumber: 1,
    elevator: false,
    mamad: false,
    propertyCondition: 'good',
    petsAllowed: false,
    parking: 'Nearby paid parking lot',
    totalMonthlyPayment: 7400,
    vaadAmount: 350,
    cityTaxes: 250,
    moveInDate: new Date('2024-12-01'),
    description: '🏙️ Cozy and stylish 1-bedroom apartment in the vibrant heart of Tel Aviv! This charming unit has been tastefully updated with modern finishes, a fully equipped kitchen, and comfortable living space. Just steps from the beach, world-class restaurants, and Tel Aviv\'s legendary nightlife. Perfect for a young professional or couple looking to experience the best of city living. Available immediately! 🎉',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
    ],
    agent: agentIds[1]
  },
  {
    address: 'HaSharon Street 34',
    city: 'Ra\'anana',
    price: 2100000,
    propertyType: 'for-sale',
    bedrooms: 4,
    bathrooms: 2,
    size: 175,
    floorNumber: 0,
    elevator: false,
    mamad: true,
    propertyCondition: 'excellent',
    petsAllowed: true,
    parking: '2 private parking spaces in garden',
    totalMonthlyPayment: 11000,
    vaadAmount: 0,
    cityTaxes: 900,
    moveInDate: new Date('2025-06-01'),
    description: '🌳 Beautiful 4-bedroom garden cottage in prestigious Ra\'anana! This stunning private home features a lush, landscaped garden, a large terrace perfect for summer barbecues, and a spacious interior with natural light flooding every room. The modern kitchen opens to the living area, creating an ideal family space. Top-rated schools, parks, and the Ra\'anana Safari are all nearby. Private paradise awaits! 🦋',
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'
    ],
    agent: agentIds[0]
  },
  {
    address: 'Herzl Street 103',
    city: 'Beer Sheva',
    price: 3800,
    propertyType: 'rental',
    bedrooms: 3,
    bathrooms: 2,
    size: 100,
    floorNumber: 2,
    elevator: true,
    mamad: true,
    propertyCondition: 'good',
    petsAllowed: true,
    parking: 'Secure underground parking',
    totalMonthlyPayment: 4400,
    vaadAmount: 300,
    cityTaxes: 300,
    moveInDate: new Date('2025-01-01'),
    description: '🌟 Spacious and modern 3-bedroom apartment in the heart of Beer Sheva! This well-appointed home features a renovated kitchen with stone countertops, updated bathrooms, and a large balcony overlooking the city. The building is well-maintained with a beautiful lobby. Close to Ben-Gurion University, excellent shopping centers, and convenient transportation. Great value for money in a growing city! 📚',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
    ],
    agent: agentIds[1]
  }
];

const seedDatabase = async (mongoUri) => {
  try {
    // Check if data already exists
    const existingProperties = await Property.countDocuments();
    if (existingProperties > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding database with sample data...');

    // Create agents
    const agents = await Agent.insertMany(sampleAgents);
    const agentIds = agents.map((a) => a._id);
    console.log(`Created ${agents.length} agents`);

    // Create properties
    const properties = getSampleProperties(agentIds);
    await Property.insertMany(properties);
    console.log(`Created ${properties.length} sample properties`);

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = seedDatabase;
