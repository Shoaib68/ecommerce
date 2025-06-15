const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private/Admin
router.get('/stats', [auth, adminAuth], async (req, res) => {
  try {
    // Get accurate counts from the database
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Calculate total revenue from all completed and delivered orders
    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    
    // Calculate growth percentages based on the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Order growth calculation
    const currentMonthOrders = await Order.countDocuments({ 
      createdAt: { $gte: oneMonthAgo } 
    });
    const previousMonthDate = new Date(oneMonthAgo);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const previousMonthOrders = await Order.countDocuments({ 
      createdAt: { $gte: previousMonthDate, $lt: oneMonthAgo } 
    });
    const orderGrowth = previousMonthOrders > 0 
      ? ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100 
      : currentMonthOrders > 0 ? 100 : 0;
    
    // Customer growth calculation
    const currentMonthCustomers = await User.countDocuments({ 
      role: 'customer', 
      createdAt: { $gte: oneMonthAgo } 
    });
    const previousMonthCustomers = await User.countDocuments({ 
      role: 'customer', 
      createdAt: { $gte: previousMonthDate, $lt: oneMonthAgo } 
    });
    const customerGrowth = previousMonthCustomers > 0 
      ? ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100 
      : currentMonthCustomers > 0 ? 100 : 0;

    // Revenue growth calculation
    const currentMonthRevenueResult = await Order.aggregate([
      { $match: { 
          status: { $in: ['completed', 'delivered'] }, 
          createdAt: { $gte: oneMonthAgo } 
        } 
      },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const previousMonthRevenueResult = await Order.aggregate([
      { $match: { 
          status: { $in: ['completed', 'delivered'] }, 
          createdAt: { $gte: previousMonthDate, $lt: oneMonthAgo } 
        } 
      },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    
    const currentMonthRevenue = currentMonthRevenueResult.length > 0 ? currentMonthRevenueResult[0].totalRevenue : 0;
    const previousMonthRevenue = previousMonthRevenueResult.length > 0 ? previousMonthRevenueResult[0].totalRevenue : 0;
    
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : currentMonthRevenue > 0 ? 100 : 0;

    // Get pending tasks
    const pendingOrdersCount = await Order.countDocuments({ status: 'pending' });
    const processingOrdersCount = await Order.countDocuments({ status: 'processing' });
    const lowStockProductsCount = await Product.countDocuments({ 
      isActive: true, 
      stockQuantity: { $lt: 10, $gt: 0 } 
    });
    const outOfStockProductsCount = await Product.countDocuments({ 
      isActive: true, 
      stockQuantity: 0 
    });

    // Build pending tasks list
    const pendingTasks = [];
    if (pendingOrdersCount > 0) {
      pendingTasks.push(`Process ${pendingOrdersCount} pending orders`);
    }
    if (processingOrdersCount > 0) {
      pendingTasks.push(`Ship ${processingOrdersCount} processing orders`);
    }
    if (lowStockProductsCount > 0) {
      pendingTasks.push(`Restock ${lowStockProductsCount} low inventory products`);
    }
    if (outOfStockProductsCount > 0) {
      pendingTasks.push(`${outOfStockProductsCount} products are out of stock`);
    }
    
    // If no pending tasks, add a default message
    if (pendingTasks.length === 0) {
      pendingTasks.push('No pending tasks - everything is up to date!');
    }

    const stats = {
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue,
      orderGrowth: Math.round(orderGrowth),
      customerGrowth: Math.round(customerGrowth),
      revenueGrowth: Math.round(revenueGrowth),
      pendingTasks
    };

    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/orders/recent
// @desc    Get recent orders for admin dashboard
// @access  Private/Admin
router.get('/orders/recent', [auth, adminAuth], async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name images');
    
    // Format orders to ensure they have all required fields
    const formattedOrders = orders.map(order => {
      // Handle case where user might be null
      const userData = order.user ? {
        _id: order.user._id,
        name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'Unknown User',
        email: order.user.email || 'No email'
      } : {
        _id: 'deleted',
        name: 'Deleted User',
        email: 'No email'
      };
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber || `Order-${order._id.toString().slice(-8)}`,
        user: userData,
        items: order.items || [],
        totalAmount: order.totalAmount || 0,
        status: order.status || 'unknown',
        createdAt: order.createdAt
      };
    });
    
    res.json({ orders: formattedOrders });
  } catch (err) {
    console.error('Recent orders error:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders with pagination, search, and filtering
// @access  Private/Admin
router.get('/orders', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // Build filter object
    const filter = {};
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      // Search by order ID, order number, or user email
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
      
      // If search is a valid ObjectId, also search by ID
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter.$or.push({ _id: search });
      }
    }
    
    console.log("Filter:", filter);
    
    // Get orders with pagination
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name images');
    
    // Get total count for pagination
    const total = await Order.countDocuments(filter);
    
    console.log(`Found ${orders.length} orders out of ${total} total`);
    
    // Format orders to handle null users and other edge cases
    const formattedOrders = orders.map(order => {
      // Handle case where user might be null
      const userData = order.user ? {
        _id: order.user._id,
        firstName: order.user.firstName || 'Unknown',
        lastName: order.user.lastName || 'User',
        email: order.user.email || 'No email'
      } : {
        _id: 'deleted',
        firstName: 'Deleted',
        lastName: 'User',
        email: 'No email'
      };
      
      // Format items to handle null products
      const formattedItems = order.items.map(item => ({
        ...item.toObject(),
        product: item.product || { name: 'Product not available', _id: 'deleted' }
      }));
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber || `Order-${order._id.toString().slice(-8)}`,
        user: userData,
        items: formattedItems,
        totalAmount: order.totalAmount || 0,
        status: order.status || 'unknown',
        createdAt: order.createdAt
      };
    });
    
    res.json({
      orders: formattedOrders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all orders error:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   PATCH /api/admin/orders/:id
// @desc    Update order status
// @access  Private/Admin
router.patch('/orders/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    
    // Update timestamps based on status
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    
    res.json({ message: 'Order status updated successfully', order });
  } catch (err) {
    console.error('Update order status error:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
