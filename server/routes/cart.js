const express = require("express")
const { body, validationResult } = require("express-validator")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const auth = require("../middleware/auth")

const router = express.Router()

// GET - Read user's cart
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId }).populate({
      path: "items.product",
      select: "name price images stockQuantity isActive",
      populate: {
        path: "category",
        select: "name",
      },
    })

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] })
      await cart.save()
    }

    // Filter out inactive products
    cart.items = cart.items.filter((item) => item.product && item.product.isActive)

    // Recalculate totals if items were filtered
    if (cart.isModified("items")) {
      await cart.save()
    }

    res.json(cart)
  } catch (error) {
    console.error("Get cart error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// POST - Add item to cart
router.post(
  "/add",
  auth,
  [
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { productId, quantity } = req.body

      // Verify product exists and is active
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      })

      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      // Check stock availability
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          message: `Only ${product.stockQuantity} items available in stock`,
        })
      }

      // Find or create cart
      let cart = await Cart.findOne({ user: req.userId })
      if (!cart) {
        cart = new Cart({ user: req.userId, items: [] })
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId)

      if (existingItemIndex > -1) {
        // Update quantity
        const newQuantity = cart.items[existingItemIndex].quantity + quantity

        // Check stock for new quantity
        if (product.stockQuantity < newQuantity) {
          return res.status(400).json({
            message: `Only ${product.stockQuantity} items available in stock`,
          })
        }

        cart.items[existingItemIndex].quantity = newQuantity
      } else {
        // Add new item
        cart.items.push({ product: productId, quantity })
      }

      await cart.save()
      await cart.populate({
        path: "items.product",
        select: "name price images stockQuantity",
        populate: {
          path: "category",
          select: "name",
        },
      })

      res.json({
        message: "Item added to cart successfully",
        cart,
      })
    } catch (error) {
      console.error("Add to cart error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// PUT - Update item quantity in cart
router.put(
  "/update",
  auth,
  [
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { productId, quantity } = req.body

      // Verify product exists and check stock
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      })

      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          message: `Only ${product.stockQuantity} items available in stock`,
        })
      }

      const cart = await Cart.findOne({ user: req.userId })
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" })
      }

      const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId)

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Item not found in cart" })
      }

      cart.items[itemIndex].quantity = quantity
      await cart.save()
      await cart.populate({
        path: "items.product",
        select: "name price images stockQuantity",
        populate: {
          path: "category",
          select: "name",
        },
      })

      res.json({
        message: "Cart updated successfully",
        cart,
      })
    } catch (error) {
      console.error("Update cart error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// DELETE - Remove item from cart
router.delete("/remove/:productId", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId })
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId)

    await cart.save()
    await cart.populate({
      path: "items.product",
      select: "name price images stockQuantity",
      populate: {
        path: "category",
        select: "name",
      },
    })

    res.json({
      message: "Item removed from cart successfully",
      cart,
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// DELETE - Clear entire cart
router.delete("/clear", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId })
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    cart.items = []
    cart.totalAmount = 0
    cart.totalItems = 0
    await cart.save()

    res.json({
      message: "Cart cleared successfully",
      cart,
    })
  } catch (error) {
    console.error("Clear cart error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
