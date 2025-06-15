// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-1234567890';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Setup mock for Mongoose
const mongoose = require('mongoose');

// Mock the mongoose connect and connection methods
mongoose.connect = jest.fn().mockResolvedValue(true);
mongoose.connection = {
  on: jest.fn(),
  once: jest.fn(),
  collections: {},
};

// Mock the ObjectId
mongoose.Types.ObjectId.prototype.toString = function() {
  return this._id ? this._id.toString() : 'mock-object-id';
};

// Mock document save method
mongoose.Model.prototype.save = jest.fn().mockImplementation(function() {
  this._id = this._id || new mongoose.Types.ObjectId();
  return Promise.resolve(this);
});

// Mock static methods
mongoose.Model.findById = jest.fn().mockImplementation(function(id) {
  return Promise.resolve({ _id: id, toObject: () => ({ _id: id }) });
});

mongoose.Model.findOne = jest.fn().mockImplementation(function() {
  return Promise.resolve({ _id: 'mock-id', toObject: () => ({ _id: 'mock-id' }) });
});

mongoose.Model.find = jest.fn().mockImplementation(function() {
  return Promise.resolve([]);
});

// Setup function for tests
const setupTestDB = () => {
  // No need for actual database connection in unit tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
};

module.exports = {
  setupTestDB,
}; 