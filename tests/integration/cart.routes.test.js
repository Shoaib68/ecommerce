const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Cart = require('../../server/models/Cart');
const Product = require('../../server/models/Product');
const Category = require('../../server/models/Category');
const User = require('../../server/models/User');
const cartRoutes = require('../../server/routes/cart');
const auth = require('../../server/middleware/auth');
const { setupTestDB } = require('../testSetup');

setupTestDB();

// Setup express app for testing
const app = express();
app.use(express.json());
// Mock auth middleware to set req.userId and req.user
app.use((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      // We'll set the user in the beforeEach
    } catch (error) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
  }
  next();
});
app.use('/cart', cartRoutes);

describe('Cart Routes', () => {
  let user;
  let token;
  let product1;
  let product2;
  let category;

  beforeEach(async () => {
    // Create test user
    user = new User({
      email: 'cartuser@example.com',
      password: 'password123',
      firstName: 'Cart',
      lastName: 'User',
      role: 'customer'
    });
    await user.save();

    // Generate token
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    // Create test category
    category = new Category({
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    });
    await category.save();

    // Create test products
    product1 = new Product({
      name: 'Test Product 1',
      description: 'This is test product 1',
      price: 19.99,
      category: category._id,
      stockQuantity: 100
    });
    await product1.save();

    product2 = new Product({
      name: 'Test Product 2',
      description: 'This is test product 2',
      price: 29.99,
      category: category._id,
      stockQuantity: 50
    });
    await product2.save();

    // Set user for auth middleware mock
    app.use((req, res, next) => {
      if (req.userId) {
        req.user = user;
      }
      next();
    });
  });

  describe('GET /cart', () => {
    it('should return empty cart for new user', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(0);
      expect(res.body.totalItems).toBe(0);
      expect(res.body.totalPrice).toBe(0);
    });

    it('should return cart with items for user with items in cart', async () => {
      // First add an item to the cart
      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      // Then get the cart
      const res = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].product._id.toString()).toBe(product1._id.toString());
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.totalItems).toBe(2);
      expect(res.body.totalPrice).toBe(2 * product1.price);
    });
  });

  describe('POST /cart', () => {
    it('should add item to cart', async () => {
      const res = await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 3
        })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.message).toBe('Item added to cart');
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].product.toString()).toBe(product1._id.toString());
      expect(res.body.cart.items[0].quantity).toBe(3);
    });

    it('should increase quantity if item already in cart', async () => {
      // First add an item
      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      // Add the same item again
      const res = await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 3
        })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].product.toString()).toBe(product1._id.toString());
      expect(res.body.cart.items[0].quantity).toBe(5); // 2 + 3
    });
  });

  describe('PUT /cart/:productId', () => {
    it('should update item quantity', async () => {
      // First add an item
      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      // Update the quantity
      const res = await request(app)
        .put(`/cart/${product1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantity: 4
        })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.message).toBe('Cart updated');
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].product.toString()).toBe(product1._id.toString());
      expect(res.body.cart.items[0].quantity).toBe(4);
    });
  });

  describe('DELETE /cart/:productId', () => {
    it('should remove item from cart', async () => {
      // First add items
      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product2._id,
          quantity: 1
        });

      // Remove one item
      const res = await request(app)
        .delete(`/cart/${product1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.message).toBe('Item removed from cart');
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].product.toString()).toBe(product2._id.toString());
    });
  });

  describe('DELETE /cart', () => {
    it('should clear the cart', async () => {
      // First add items
      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      await request(app)
        .post('/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product2._id,
          quantity: 1
        });

      // Clear the cart
      const res = await request(app)
        .delete('/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.message).toBe('Cart cleared');
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBe(0);
    });
  });
}); 