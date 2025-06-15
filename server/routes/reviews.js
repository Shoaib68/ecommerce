const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Review = require("../models/Review")
const Product = require("../models/Product")
const Order = require("../models/Order")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// GET - Read reviews for a product
router.get(
  "/product/:productId",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("sort").optional().isIn(["rating", "-rating", "createdAt", "-createdAt", "helpfulVotes", "-helpfulVotes"]),
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
      const sort = req.query.sort || "-createdAt"

      const reviews = await Review.find({
        product: req.params.productId,
        isApproved: true,
      })
        .populate("user", "firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(limit)

      const total = await Review.countDocuments({
        product: req.params.productId,
        isApproved: true,
      })

      // Get rating distribution
      const mongoose = require("mongoose");
      const ratingStats = await Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(req.params.productId),
            isApproved: true,
          },
        },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ])

      res.json({
        reviews,
        ratingStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get reviews error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// GET - Read user's reviews
router.get("/my-reviews", auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.userId }).populate("product", "name images").sort({ createdAt: -1 })

    res.json(reviews)
  } catch (error) {
    console.error("Get user reviews error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// POST - Create new review
router.post(
  "/",
  auth,
  [
    body("product").isMongoId().withMessage("Valid product ID is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("title").optional().trim().isLength({ max: 100 }),
    body("comment").trim().isLength({ min: 3, max: 1000 }).withMessage("Comment must be between 3-1000 characters"),
  ],
  async (req, res) => {
    try {
      console.log("Review submission received:", req.body);
      
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() })
      }

      const { product: productId, rating, title, comment } = req.body

      // Verify product exists
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      }).lean()

      if (!product) {
        console.log("Product not found:", productId);
        return res.status(404).json({ message: "Product not found" })
      }

      // Check if user has purchased this product
      const hasPurchased = await Order.findOne({
        user: req.userId,
        "items.product": productId,
        status: { $in: ["delivered", "shipped"] },
      })

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({
        user: req.userId,
        product: productId,
      })

      if (existingReview) {
        console.log("User already reviewed this product:", req.userId);
        return res.status(400).json({
          message: "You have already reviewed this product",
        })
      }

      const review = new Review({
        user: req.userId,
        product: productId,
        rating,
        title,
        comment,
        isVerified: !!hasPurchased,
      })

      console.log("Saving review:", review);
      
      await review.save()
      await review.populate("user", "firstName lastName")
      await review.populate("product", "name")

      // Update product rating
      try {
        const productToUpdate = await Product.findById(productId)
        if (productToUpdate) {
          await productToUpdate.updateRating()
        } else {
          console.log("Product not found for rating update:", productId);
        }
      } catch (ratingError) {
        console.error("Error updating product rating:", ratingError);
        // Continue with the response even if rating update fails
      }

      console.log("Review created successfully:", review._id);
      
      res.status(201).json({
        message: "Review created successfully",
        review,
      })
    } catch (error) {
      console.error("Create review error:", error)
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

// PUT - Update review
router.put(
  "/:id",
  auth,
  [
    body("rating").optional().isInt({ min: 1, max: 5 }),
    body("title").optional().trim().isLength({ max: 100 }),
    body("comment").optional().trim().isLength({ min: 3, max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const review = await Review.findOne({
        _id: req.params.id,
        user: req.userId,
      })

      if (!review) {
        return res.status(404).json({ message: "Review not found" })
      }

      // Update fields
      Object.keys(req.body).forEach((key) => {
        if (req.body[key] !== undefined) {
          review[key] = req.body[key]
        }
      })

      await review.save()
      await review.populate("user", "firstName lastName")
      await review.populate("product", "name")

      // Update product rating if rating changed
      if (req.body.rating) {
        const product = await Product.findById(review.product._id)
        await product.updateRating()
      }

      res.json({
        message: "Review updated successfully",
        review,
      })
    } catch (error) {
      console.error("Update review error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// DELETE - Delete review
router.delete("/:id", auth, async (req, res) => {
  try {
    const filter = { _id: req.params.id }

    // If not admin, only allow deleting own reviews
    if (req.user.role !== "admin") {
      filter.user = req.userId
    }

    const review = await Review.findOne(filter)

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    const productId = review.product
    await Review.deleteOne({ _id: review._id })

    // Update product rating
    const product = await Product.findById(productId)
    if (product) {
      await product.updateRating()
    }

    res.json({ message: "Review deleted successfully" })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// PUT - Mark review as helpful
router.put("/:id/helpful", auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulVotes: 1 } }, { new: true })
      .populate("user", "firstName lastName")
      .populate("product", "name")

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    res.json({
      message: "Review marked as helpful",
      review,
    })
  } catch (error) {
    console.error("Mark helpful error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// PUT - Approve/Disapprove review (Admin only)
router.put(
  "/:id/approve",
  [auth, adminAuth],
  [body("isApproved").isBoolean().withMessage("isApproved must be a boolean")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: req.body.isApproved }, { new: true })
        .populate("user", "firstName lastName")
        .populate("product", "name")

      if (!review) {
        return res.status(404).json({ message: "Review not found" })
      }

      res.json({
        message: `Review ${req.body.isApproved ? "approved" : "disapproved"} successfully`,
        review,
      })
    } catch (error) {
      console.error("Approve review error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
