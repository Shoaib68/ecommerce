const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const User = require('../models/User');

/**
 * Script to create an admin user
 * 
 * Usage: 
 * node scripts/createAdmin.js [email] [password] [firstName] [lastName]
 * 
 * Example:
 * node scripts/createAdmin.js admin@example.com adminpassword Admin User
 */

const createAdmin = async () => {
  try {
    // Get command line arguments or use defaults
    const args = process.argv.slice(2);
    const email = args[0] || 'admin@example.com';
    const password = args[1] || 'admin123';
    const firstName = args[2] || 'Admin';
    const lastName = args[3] || 'User';

    // Validate password length
    if (password.length < 6) {
      console.error('Password must be at least 6 characters long');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin with email ${email} already exists.`);
      console.log('If you want to create a new admin, please use a different email.');
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'admin',
    });

    await admin.save();
    
    console.log('Admin user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Role: admin`);
    console.log('\nYou can now log in with these credentials.');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

// Execute the function
createAdmin(); 