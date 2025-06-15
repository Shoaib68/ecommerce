const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Category = require("../models/Category")
const Product = require("../models/Product")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// GET - Read all categories with pagination
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      // Build filter
      const filter = { isActive: true }

      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
        ]
      }

      const categories = await Category.find(filter)
        .populate("parentCategory", "name slug")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)

      const total = await Category.countDocuments(filter)

      // Get product count for each category
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({
            category: category._id,
            isActive: true,
          })
          return {
            ...category.toObject(),
            productCount,
          }
        }),
      )

      res.json({
        categories: categoriesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get categories error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// GET - Read single category
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("parentCategory", "name slug")

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Get products in this category
    const products = await Product.find({
      category: category._id,
      isActive: true,
    })
      .populate("category", "name slug")
      .limit(12)

    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true,
    })

    res.json({
      ...category.toObject(),
      products,
      productCount,
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// POST - Create new category (Admin only)
router.post(
  "/",
  [auth, adminAuth],
  [
    body("name").trim().isLength({ min: 1 }).withMessage("Category name is required"),
    body("description").optional().trim(),
    body("parentCategory").optional().isMongoId(),
    body("image").optional().isURL(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Check if category name already exists
      const existingCategory = await Category.findOne({
        name: req.body.name,
        isActive: true,
      })

      if (existingCategory) {
        return res.status(400).json({ message: "Category name already exists" })
      }

      // Verify parent category exists if provided
      if (req.body.parentCategory) {
        const parentCategory = await Category.findById(req.body.parentCategory)
        if (!parentCategory) {
          return res.status(400).json({ message: "Parent category not found" })
        }
      }

      const category = new Category(req.body)
      await category.save()
      await category.populate("parentCategory", "name slug")

      res.status(201).json({
        message: "Category created successfully",
        category,
      })
    } catch (error) {
      console.error("Create category error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// PUT - Update category (Admin only)
router.put(
  "/:id",
  [auth, adminAuth],
  [
    body("name").optional().trim().isLength({ min: 1 }),
    body("description").optional().trim(),
    body("parentCategory").optional().isMongoId(),
    body("image").optional().isURL(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Check if new name conflicts with existing category
      if (req.body.name) {
        const existingCategory = await Category.findOne({
          name: req.body.name,
          _id: { $ne: req.params.id },
          isActive: true,
        })

        if (existingCategory) {
          return res.status(400).json({ message: "Category name already exists" })
        }
      }

      // Verify parent category exists if provided
      if (req.body.parentCategory) {
        const parentCategory = await Category.findById(req.body.parentCategory)
        if (!parentCategory) {
          return res.status(400).json({ message: "Parent category not found" })
        }
      }

      const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate("parentCategory", "name slug")

      if (!category) {
        return res.status(404).json({ message: "Category not found" })
      }

      res.json({
        message: "Category updated successfully",
        category,
      })
    } catch (error) {
      console.error("Update category error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// DELETE - Delete category (Admin only)
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    // Check if category has products
    const productCount = await Product.countDocuments({
      category: req.params.id,
      isActive: true,
    })

    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It contains ${productCount} products. Please move or delete the products first.`,
      })
    }

    // Soft delete - set isActive to false
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    res.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
