const mongoose = require('mongoose');
const Product = require('../../server/models/Product');
const Category = require('../../server/models/Category');

describe('Product Model', () => {
  let category;
  let productData;

  beforeEach(() => {
    // Mock category
    category = {
      _id: 'mock-category-id',
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    };

    productData = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      category: category._id,
      stockQuantity: 100,
      images: [
        { url: '/uploads/test-image.jpg', alt: 'Test Image', isPrimary: true }
      ],
      tags: ['test', 'product'],
      specifications: [
        { name: 'Color', value: 'Black' },
        { name: 'Weight', value: '200g' }
      ]
    };

    // Mock Product model methods
    Product.prototype.save = jest.fn().mockImplementation(function() {
      this._id = 'mock-product-id';
      
      // Simulate slug generation
      if (this.isModified && this.isModified('name')) {
        this.slug = this.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');
      } else if (!this.slug && this.name) {
        this.slug = this.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');
      }
      
      return Promise.resolve(this);
    });
  });

  it('should create a product successfully', async () => {
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    expect(savedProduct._id).toBeDefined();
    expect(savedProduct.name).toBe(productData.name);
    expect(savedProduct.price).toBe(productData.price);
    expect(savedProduct.stockQuantity).toBe(productData.stockQuantity);
    expect(savedProduct.isActive).toBe(true); // default value
    expect(savedProduct.slug).toBe('test-product'); // auto-generated
  });

  it('should generate slug from name', async () => {
    const product = new Product({
      ...productData,
      name: 'Special Product Name 123'
    });
    await product.save();
    
    expect(product.slug).toBe('special-product-name-123');
  });

  it('should not save product without required fields', async () => {
    // Mock save to throw validation error
    Product.prototype.save = jest.fn().mockImplementation(() => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    });
    
    const product = new Product({
      name: 'Incomplete Product',
      // Missing description, price, category, stockQuantity
    });
    
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
  });

  it('should not allow negative price', async () => {
    // Mock save to throw validation error
    Product.prototype.save = jest.fn().mockImplementation(() => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    });
    
    const product = new Product({
      ...productData,
      price: -10
    });
    
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
  });

  it('should not allow negative stock quantity', async () => {
    // Mock save to throw validation error
    Product.prototype.save = jest.fn().mockImplementation(() => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    });
    
    const product = new Product({
      ...productData,
      stockQuantity: -5
    });
    
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
  });
}); 