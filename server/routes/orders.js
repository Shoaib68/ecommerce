const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Order = require("../models/Order")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// GET - Read user's orders or all orders (admin)
router.get(
  "/",
  auth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit

      // Build filter
      const filter = {}

      // If not admin, only show user's orders
      if (req.user.role !== "admin") {
        filter.user = req.userId
      }

      if (req.query.status) {
        filter.status = req.query.status
      }

      const orders = await Order.find(filter)
        .populate("user", "firstName lastName email")
        .populate("items.product", "name images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      const total = await Order.countDocuments(filter)

      res.json({
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get orders error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// GET - Read single order
router.get("/:id", auth, async (req, res) => {
  try {
    const filter = { _id: req.params.id }

    // If not admin, only allow access to own orders
    if (req.user.role !== "admin") {
      filter.user = req.userId
    }

    const order = await Order.findOne(filter)
      .populate("user", "firstName lastName email phone")
      .populate("items.product", "name images category")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json(order)
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// POST - Create new order
router.post(
  "/",
  auth,
  [
    body("shippingAddress").isObject().withMessage("Shipping address is required"),
    body("shippingAddress.street").trim().isLength({ min: 1 }).withMessage("Street address is required"),
    body("shippingAddress.city").trim().isLength({ min: 1 }).withMessage("City is required"),
    body("shippingAddress.state").trim().isLength({ min: 1 }).withMessage("State is required"),
    body("shippingAddress.zipCode").trim().isLength({ min: 1 }).withMessage("ZIP code is required"),
    body("shippingAddress.country").trim().isLength({ min: 1 }).withMessage("Country is required"),
    body("paymentMethod").isIn(["card", "cash"]).withMessage("Valid payment method is required"),
    body("items").optional().isArray(),
    body("totalAmount").optional().isNumeric(),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      let orderItems = [];
      let subtotal = 0;
      let shouldClearCart = false;

      // Check if items are provided directly in the request
      if (req.body.items && req.body.items.length > 0) {
        // Process items from request
        for (const item of req.body.items) {
          const product = await Product.findById(item.product);
          
          if (!product) {
            return res.status(400).json({
              message: `Product not found`
            });
          }

          if (!product.isActive) {
            return res.status(400).json({
              message: `Product ${product.name} is no longer available`
            });
          }

          if (product.stockQuantity < item.quantity) {
            return res.status(400).json({
              message: `Only ${product.stockQuantity} units of ${product.name} available`
            });
          }

          const itemTotal = product.price * item.quantity;
          subtotal += itemTotal;

          orderItems.push({
            product: product._id,
            quantity: item.quantity,
            price: product.price,
            name: product.name,
            image: product.images?.[0]?.url || ""
          });

          // Update product stock using findByIdAndUpdate to avoid validation issues
          await Product.findByIdAndUpdate(
            product._id,
            { $inc: { stockQuantity: -item.quantity } },
            { new: true }
          );
        }
      } else {
        // Get user's cart if no items provided
        const cart = await Cart.findOne({ user: req.userId }).populate("items.product");

        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Cart is empty" });
        }

        // Process items from cart
        for (const cartItem of cart.items) {
          const product = cartItem.product;

          if (!product.isActive) {
            return res.status(400).json({
              message: `Product ${product.name} is no longer available`
            });
          }

          if (product.stockQuantity < cartItem.quantity) {
            return res.status(400).json({
              message: `Only ${product.stockQuantity} units of ${product.name} available`
            });
          }

          const itemTotal = product.price * cartItem.quantity;
          subtotal += itemTotal;

          orderItems.push({
            product: product._id,
            quantity: cartItem.quantity,
            price: product.price,
            name: product.name,
            image: product.images?.[0]?.url || ""
          });

          // Update product stock using findByIdAndUpdate to avoid validation issues
          await Product.findByIdAndUpdate(
            product._id,
            { $inc: { stockQuantity: -cartItem.quantity } },
            { new: true }
          );
        }
        
        shouldClearCart = true;
      }

      // Calculate tax and shipping
      const tax = subtotal * 0.08; // 8% tax
      const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
      
      // Use provided totalAmount or calculate it
      const totalAmount = req.body.totalAmount || (subtotal + tax + shipping);

      // Create order
      const order = new Order({
        user: req.userId,
        items: orderItems,
        subtotal,
        tax,
        shipping,
        totalAmount,
        paymentMethod: req.body.paymentMethod,
        shippingAddress: req.body.shippingAddress,
        notes: req.body.notes,
      })

      await order.save()

      // Clear user's cart if order was created from cart
      if (shouldClearCart) {
        const cart = await Cart.findOne({ user: req.userId });
        if (cart) {
          cart.items = [];
          cart.totalAmount = 0;
          cart.totalItems = 0;
          await cart.save();
        }
      }

      await order.populate("user", "firstName lastName email");
      await order.populate("items.product", "name images");

      res.status(201).json(order)
    } catch (error) {
      console.error("Create order error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// PUT - Update order status (Admin only)
router.put(
  "/:id/status",
  [auth, adminAuth],
  [body("status").isIn(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"])],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { status } = req.body
      const updateData = { status }

      // Set timestamps for specific statuses
      if (status === "shipped") {
        updateData.shippedAt = new Date()
      } else if (status === "delivered") {
        updateData.deliveredAt = new Date()
      }

      const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("user", "firstName lastName email")
        .populate("items.product", "name images")

      if (!order) {
        return res.status(404).json({ message: "Order not found" })
      }

      res.json({
        message: "Order status updated successfully",
        order,
      })
    } catch (error) {
      console.error("Update order status error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// PUT - Add tracking number (Admin only)
router.put(
  "/:id/tracking",
  [auth, adminAuth],
  [body("trackingNumber").trim().isLength({ min: 1 }).withMessage("Tracking number is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
          trackingNumber: req.body.trackingNumber,
          status: "shipped",
          shippedAt: new Date(),
        },
        { new: true, runValidators: true },
      )
        .populate("user", "firstName lastName email")
        .populate("items.product", "name images")

      if (!order) {
        return res.status(404).json({ message: "Order not found" })
      }

      res.json({
        message: "Tracking number added successfully",
        order,
      })
    } catch (error) {
      console.error("Add tracking number error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// DELETE - Cancel order
router.delete("/:id", auth, async (req, res) => {
  try {
    const filter = { _id: req.params.id }

    // If not admin, only allow canceling own orders
    if (req.user.role !== "admin") {
      filter.user = req.userId
    }

    const order = await Order.findOne(filter).populate("items.product")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Only allow cancellation if order is pending or processing
    if (!["pending", "processing"].includes(order.status)) {
      return res.status(400).json({
        message: "Order cannot be cancelled at this stage",
      })
    }

    // Restore product stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stockQuantity: item.quantity } },
          { new: true }
        );
      }
    }

    // Update order status
    order.status = "cancelled"
    await order.save()

    res.json({
      message: "Order cancelled successfully",
      order,
    })
  } catch (error) {
    console.error("Cancel order error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
