const express = require("express")
const { body, validationResult, query } = require("express-validator")
const User = require("../models/User")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// GET - Get all users (Admin only)
router.get(
  "/",
  [auth, adminAuth],
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().trim(),
    query("role").optional().isIn(["customer", "admin"]),
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

      if (req.query.role) {
        filter.role = req.query.role
      }

      if (req.query.search) {
        filter.$or = [
          { firstName: { $regex: req.query.search, $options: "i" } },
          { lastName: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ]
      }

      const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

      const total = await User.countDocuments(filter)

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get users error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// GET - Get single user (Admin only or own profile)
router.get("/:id", auth, async (req, res) => {
  try {
    // Allow users to view their own profile or admin to view any profile
    if (req.user.role !== "admin" && req.userId !== req.params.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    const user = await User.findOne({
      _id: req.params.id,
      isActive: true,
    })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// PUT - Update user role (Admin only)
router.put(
  "/:id/role",
  [auth, adminAuth],
  [body("role").isIn(["customer", "admin"]).withMessage("Role must be customer or admin")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Prevent admin from changing their own role
      if (req.userId === req.params.id) {
        return res.status(400).json({
          message: "You cannot change your own role",
        })
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role: req.body.role },
        { new: true, runValidators: true },
      )

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      res.json({
        message: "User role updated successfully",
        user,
      })
    } catch (error) {
      console.error("Update user role error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// PUT - Deactivate user (Admin only)
router.put("/:id/deactivate", [auth, adminAuth], async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.userId === req.params.id) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      })
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "User deactivated successfully",
      user,
    })
  } catch (error) {
    console.error("Deactivate user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// PUT - Reactivate user (Admin only)
router.put("/:id/reactivate", [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "User reactivated successfully",
      user,
    })
  } catch (error) {
    console.error("Reactivate user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// DELETE - Delete user account (Admin only or own account)
router.delete("/:id", auth, async (req, res) => {
  try {
    // Allow users to delete their own account or admin to delete any account
    if (req.user.role !== "admin" && req.userId !== req.params.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Prevent admin from deleting themselves
    if (req.user.role === "admin" && req.userId === req.params.id) {
      return res.status(400).json({
        message: "Admin cannot delete their own account",
      })
    }

    // Soft delete - set isActive to false
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User account deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
