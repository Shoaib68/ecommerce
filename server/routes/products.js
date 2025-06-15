const express = require("express")
const { body, validationResult, query } = require("express-validator")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const Product = require("../models/Product")
const Category = require("../models/Category")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "public", "uploads", "products")
    // Ensure upload directory exists
    fs.mkdirSync(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({ storage })

// Get all products with filtering and pagination
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("category").optional().isMongoId(),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
    query("search").optional().trim(),
    query("sort").optional().isIn(["price", "-price", "name", "-name", "createdAt", "-createdAt", "rating", "-rating"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 12
      const skip = (page - 1) * limit

      // Build filter
      const filter = { isActive: true };

      if (req.query.category) {
        filter.category = req.query.category;
      }

      if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {}
        if (req.query.minPrice) filter.price.$gte = Number.parseFloat(req.query.minPrice)
        if (req.query.maxPrice) filter.price.$lte = Number.parseFloat(req.query.maxPrice)
      }

      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
          { tags: { $in: [new RegExp(req.query.search, "i")] } },
        ]
      }

      // Build sort
      const sort = req.query.sort || "-createdAt"

      const products = await Product.find(filter).populate("category", "name slug").sort(sort).skip(skip).limit(limit)

      const total = await Product.countDocuments(filter)

      res.json({
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get products error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("category", "name slug")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create product (Admin only)
router.post(
  "/",
  [auth, adminAuth, upload.array("images", 5)],
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("category").isMongoId().withMessage("Valid category is required"),
    body("stockQuantity").isInt({ min: 0 }).withMessage("Stock quantity must be a positive integer"),
    body("comparePrice").optional().isFloat({ min: 0 }).withMessage("Compare price must be a positive number"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("specifications").optional().isArray().withMessage("Specifications must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Verify category exists
      const category = await Category.findById(req.body.category)
      if (!category) {
        return res.status(400).json({ message: "Category not found" })
      }

      const productData = { ...req.body }
      if (req.files) {
        productData.images = req.files.map(file => ({
          url: `/uploads/products/${file.filename}`,
          alt: req.body.name,
        }))
      }

      const product = new Product(productData)
      await product.save()
      await product.populate("category", "name slug")

      res.status(201).json({
        message: "Product created successfully",
        product,
      })
    } catch (error) {
      console.error("Create product error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update product (Admin only)
router.put(
  "/:id",
  [auth, adminAuth, upload.array("images", 5)],
  [
    body("name").optional().trim().notEmpty(),
    body("description").optional().trim().notEmpty(),
    body("price").optional().isFloat({ min: 0 }),
    body("category").optional().isMongoId(),
    body("stockQuantity").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const updateData = { ...req.body }

      if (req.body.category) {
        const category = await Category.findById(req.body.category)
        if (!category) {
          return res.status(400).json({ message: "Category not found" })
        }
      }

      if (req.files && req.files.length > 0) {
        updateData.images = req.files.map(file => ({
          url: `/uploads/products/${file.filename}`,
          alt: req.body.name || "Product Image",
        }))
      }

      const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).populate("category", "name slug")

      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      res.json({
        message: "Product updated successfully",
        product,
      })
    } catch (error) {
      console.error("Update product error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Delete product (Admin only)
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    // This is a soft delete. To permanently delete, use findByIdAndDelete.
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json({ message: "Product soft-deleted successfully" })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
