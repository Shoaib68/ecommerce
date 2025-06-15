const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../../server/models/User');
const authRoutes = require('../../server/routes/auth');
const auth = require('../../server/middleware/auth');
const { setupTestDB } = require('../testSetup');

setupTestDB();

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Protected route for testing auth middleware
app.get('/protected', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

describe('Authentication Routes', () => {
  let userData;

  beforeEach(() => {
    userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Check response
      expect(res.body.message).toBe('User created successfully');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned

      // Check that the user was saved to the database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
    });

    it('should not register a user with an existing email', async () => {
      // First create a user
      await request(app).post('/auth/register').send(userData);

      // Try to register again with the same email
      const res = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(res.body.message).toBe('User already exists');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' }) // Missing required fields
        .expect(400);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app).post('/auth/register').send(userData);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(userData.email);
    });

    it('should not login with invalid email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password
        })
        .expect(400);

      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(400);

      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    let token;
    let user;

    beforeEach(async () => {
      // Register a user and get token
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      
      token = res.body.token;
      user = await User.findOne({ email: userData.email });
    });

    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body._id).toBeDefined();
      expect(res.body.email).toBe(userData.email);
      expect(res.body.firstName).toBe(userData.firstName);
      expect(res.body.lastName).toBe(userData.lastName);
    });

    it('should not allow access without token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(res.body.message).toBe('No token, authorization denied');
    });

    it('should not allow access with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(res.body.message).toBe('Token is not valid');
    });
  });

  describe('Protected Routes', () => {
    let token;
    
    beforeEach(async () => {
      // Register a user and get token
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      
      token = res.body.token;
    });

    it('should access protected route with valid token', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
    });

    it('should reject access to protected route without token', async () => {
      const res = await request(app)
        .get('/protected')
        .expect(401);

      expect(res.body.message).toBe('No token, authorization denied');
    });
  });
}); 