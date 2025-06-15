const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear collections
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data.');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Admin user created.');

    // Create categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', description: 'Devices and gadgets' },
      { name: 'Books', slug: 'books', description: 'Printed and digital books' },
      { name: 'Apparel', slug: 'apparel', description: 'Clothing and accessories' },
      { name: 'Home Goods', slug: 'home-goods', description: 'For your home' },
      { name: 'Games', slug: 'games', description: 'Board and video games' },
      { name: 'Outdoor', slug: 'outdoor', description: 'For your adventures' },
    ];
    const createdCategories = await Category.insertMany(categories);
    console.log(`${createdCategories.length} categories created.`);

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDatabase();

