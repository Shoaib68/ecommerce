const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true })

// Update product rating after review changes
reviewSchema.post("save", async function () {
  const Product = mongoose.model("Product")
  const product = await Product.findById(this.product)
  if (product) {
    await product.updateRating()
  }
})

reviewSchema.post("remove", async function () {
  const Product = mongoose.model("Product")
  const product = await Product.findById(this.product)
  if (product) {
    await product.updateRating()
  }
})

module.exports = mongoose.model("Review", reviewSchema)
