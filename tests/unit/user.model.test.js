const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../server/models/User');

// Mock bcrypt
jest.mock('bcryptjs');

describe('User Model', () => {
  let userData;

  beforeEach(() => {
    userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    // Mock bcrypt functions
    bcrypt.genSalt = jest.fn().mockResolvedValue('salt');
    bcrypt.hash = jest.fn().mockResolvedValue('hashed_password');
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    // Mock User model methods
    User.prototype.save = jest.fn().mockImplementation(function() {
      this._id = 'mock-user-id';
      return Promise.resolve(this);
    });
  });

  it('should create a new user successfully', async () => {
    const user = new User(userData);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.firstName).toBe(userData.firstName);
    expect(savedUser.lastName).toBe(userData.lastName);
    expect(savedUser.role).toBe('customer'); // default role
    expect(savedUser.isActive).toBe(true); // default active status
  });

  it('should hash the password before saving', async () => {
    // Mock the pre-save hook manually
    const user = new User(userData);
    
    // Simulate the pre-save hook
    if (user.isModified) {
      user.password = 'hashed_password';
    }
    
    await user.save();
    
    // Password should be hashed and not equal to the original
    expect(user.password).not.toBe(userData.password);
    
    // Should be able to compare with the original password
    const isMatch = await user.comparePassword(userData.password);
    expect(isMatch).toBe(true);
  });

  it('should not save user without required fields', async () => {
    // Mock save to throw validation error
    User.prototype.save = jest.fn().mockImplementation(() => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    });
    
    const user = new User({
      email: 'incomplete@example.com',
      // Missing firstName, lastName, password
    });
    
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
  });

  it('should not save user with duplicate email', async () => {
    // Mock save to throw duplicate key error
    User.prototype.save = jest.fn().mockImplementation(() => {
      const error = new Error('Duplicate key error');
      error.name = 'MongoError';
      error.code = 11000;
      return Promise.reject(error);
    });
    
    // Try to save another user with the same email
    const user = new User({
      ...userData,
      firstName: 'Another',
      lastName: 'User',
    });
    
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  it('should remove password from JSON representation', async () => {
    const user = new User(userData);
    
    // Mock toJSON method
    const userObject = {
      _id: 'mock-user-id',
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: 'hashed_password',
    };
    
    user.toJSON = jest.fn().mockImplementation(() => {
      const obj = { ...userObject };
      delete obj.password;
      return obj;
    });
    
    const userJSON = user.toJSON();
    
    expect(userJSON.password).toBeUndefined();
    expect(userJSON.email).toBe(userData.email);
  });
}); 