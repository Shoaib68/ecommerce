const mongoose = require("mongoose")

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
)

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Calculate totals before saving
cartSchema.pre("save", async function (next) {
  if (this.isModified("items")) {
    await this.populate("items.product")

    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0)
    this.totalAmount = this.items.reduce((total, item) => {
      return total + item.product.price * item.quantity
    }, 0)
  }
  next()
})

module.exports = mongoose.model("Cart", cartSchema)
