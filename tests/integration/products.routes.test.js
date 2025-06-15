const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Product = require('../../server/models/Product');
const Category = require('../../server/models/Category');
const User = require('../../server/models/User');
const productRoutes = require('../../server/routes/products');
const { setupTestDB } = require('../testSetup');

setupTestDB();

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/products', productRoutes);

describe('Product Routes', () => {
  let category;
  let adminUser;
  let regularUser;
  let adminToken;
  let userToken;
  let testProduct;

  beforeEach(async () => {
    // Create test category
    category = new Category({
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    });
    await category.save();

    // Create admin user
    adminUser = new User({
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    await adminUser.save();

    // Create regular user
    regularUser = new User({
      email: 'user@example.com',
      password: 'user123',
      firstName: 'Regular',
      lastName: 'User',
      role: 'customer'
    });
    await regularUser.save();

    // Generate tokens
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET);
    userToken = jwt.sign({ userId: regularUser._id }, process.env.JWT_SECRET);

    // Create test product
    testProduct = new Product({
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      category: category._id,
      stockQuantity: 100,
      images: [
        { url: '/uploads/test-image.jpg', alt: 'Test Image', isPrimary: true }
      ],
      tags: ['test', 'product']
    });
    await testProduct.save();
  });

  describe('GET /products', () => {
    it('should get all products', async () => {
      const res = await request(app)
        .get('/products')
        .expect(200);

      expect(res.body.products).toBeDefined();
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter products by category', async () => {
      // Create another category and product
      const otherCategory = new Category({
        name: 'Other Category',
        description: 'Another category',
        slug: 'other-category'
      });
      await otherCategory.save();

      const otherProduct = new Product({
        name: 'Other Product',
        description: 'This is another product',
        price: 49.99,
        category: otherCategory._id,
        stockQuantity: 50
      });
      await otherProduct.save();

      // Get products filtered by the first category
      const res = await request(app)
        .get(`/products?category=${category._id}`)
        .expect(200);

      expect(res.body.products).toBeDefined();
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe('Test Product');
    });

    it('should filter products by price range', async () => {
      // Create another product with different price
      const expensiveProduct = new Product({
        name: 'Expensive Product',
        description: 'This is an expensive product',
        price: 999.99,
        category: category._id,
        stockQuantity: 10
      });
      await expensiveProduct.save();

      // Get products filtered by price range
      const res = await request(app)
        .get('/products?minPrice=90&maxPrice=100')
        .expect(200);

      expect(res.body.products).toBeDefined();
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe('Test Product');
    });
  });

  describe('GET /products/:id', () => {
    it('should get a single product by id', async () => {
      const res = await request(app)
        .get(`/products/${testProduct._id}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body._id.toString()).toBe(testProduct._id.toString());
      expect(res.body.name).toBe(testProduct.name);
      expect(res.body.price).toBe(testProduct.price);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/products/${fakeId}`)
        .expect(404);

      expect(res.body.message).toBe('Product not found');
    });
  });

  // Note: POST and PUT tests would require handling file uploads
  // which is more complex in a test environment. We'll skip those for now.
}); 