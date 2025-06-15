const express = require("express")
const { body, validationResult } = require("express-validator")
const Order = require("../models/Order")
const Payment = require("../models/Payment")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// Initialize Stripe with error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set. Payment features will be disabled.");
  } else {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    console.log("Stripe initialized successfully");
  }
} catch (error) {
  console.error("Error initializing Stripe:", error.message);
}

// Check if Stripe is properly initialized
const checkStripe = (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ 
      message: "Payment service unavailable. Please contact support." 
    });
  }
  next();
};

// POST - Create payment intent (for client-side usage)
router.post(
  "/create-payment-intent",
  [auth, checkStripe],
  [body("orderId").isMongoId().withMessage("Valid order ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { orderId } = req.body

      // Verify order exists and belongs to user
      const order = await Order.findOne({
        _id: orderId,
        user: req.userId,
      })

      if (!order) {
        return res.status(404).json({ message: "Order not found" })
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({ order: orderId })
      if (existingPayment && existingPayment.status === "succeeded") {
        return res.status(400).json({ message: "Order already paid" })
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          orderId: orderId.toString(),
          userId: req.userId.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      // Save payment record
      const payment = new Payment({
        order: orderId,
        stripePaymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        clientSecret: paymentIntent.client_secret,
        status: "pending",
      })

      await payment.save()

      // Update order with payment intent ID
      order.paymentIntentId = paymentIntent.id
      await order.save()

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      })
    } catch (error) {
      console.error("Create payment intent error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// POST - Create payment intent (legacy endpoint)
router.post(
  "/create-intent",
  [auth, checkStripe],
  [body("orderId").isMongoId().withMessage("Valid order ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { orderId } = req.body

      // Verify order exists and belongs to user
      const order = await Order.findOne({
        _id: orderId,
        user: req.userId,
      })

      if (!order) {
        return res.status(404).json({ message: "Order not found" })
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({ order: orderId })
      if (existingPayment && existingPayment.status === "succeeded") {
        return res.status(400).json({ message: "Order already paid" })
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          orderId: orderId.toString(),
          userId: req.userId.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      // Save payment record
      const payment = new Payment({
        order: orderId,
        stripePaymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        clientSecret: paymentIntent.client_secret,
        status: "pending",
      })

      await payment.save()

      // Update order with payment intent ID
      order.paymentIntentId = paymentIntent.id
      await order.save()

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      })
    } catch (error) {
      console.error("Create payment intent error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// POST - Confirm payment
router.post(
  "/confirm",
  [auth, checkStripe],
  [body("paymentIntentId").isString().withMessage("Payment intent ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { paymentIntentId } = req.body

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { status: paymentIntent.status },
        { new: true },
      )

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" })
      }

      // Update order status based on payment status
      const order = await Order.findById(payment.order)
      if (order) {
        if (paymentIntent.status === "succeeded") {
          order.paymentStatus = "completed"
          order.status = "processing"
        } else if (paymentIntent.status === "payment_failed") {
          order.paymentStatus = "failed"
        }
        await order.save()
      }

      res.json({
        status: paymentIntent.status,
        message: paymentIntent.status === "succeeded" ? "Payment successful!" : "Payment processing...",
      })
    } catch (error) {
      console.error("Confirm payment error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// POST - Process refund (Admin only)
router.post(
  "/refund",
  [auth, adminAuth, checkStripe],
  [
    body("paymentIntentId").isString().withMessage("Payment intent ID is required"),
    body("amount").optional().isFloat({ min: 0 }),
    body("reason").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { paymentIntentId, amount, reason } = req.body

      // Find payment record
      const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      }).populate("order")

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" })
      }

      if (payment.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not eligible for refund" })
      }

      // Create refund with Stripe
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason || "requested_by_customer",
      }

      if (amount) {
        refundData.amount = Math.round(amount * 100) // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData)

      // Update payment record
      payment.refunds.push({
        stripeRefundId: refund.id,
        amount: refund.amount / 100,
        reason: refund.reason,
        status: refund.status,
      })

      // Update payment status if full refund
      if (!amount || amount >= payment.amount) {
        payment.status = "refunded"
      }

      await payment.save()

      // Update order status
      const order = payment.order
      if (!amount || amount >= payment.amount) {
        order.status = "refunded"
        order.paymentStatus = "refunded"
        await order.save()
      }

      res.json({
        message: "Refund processed successfully",
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
        },
      })
    } catch (error) {
      console.error("Refund error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// POST - Stripe webhook
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) {
    console.warn("Webhook received but Stripe is not initialized");
    return res.status(503).end();
  }

  let event;
  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET is not set. Webhook verification skipped.");
      event = req.body;
    } else {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    }
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "charge.dispute.created":
        await handleChargeDispute(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event: ${error.message}`);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
})

// Helper functions for webhook handlers
async function handlePaymentSucceeded(paymentIntent) {
  try {
    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: "succeeded" },
      { new: true },
    )

    if (payment) {
      // Update order status
      await Order.findByIdAndUpdate(payment.order, {
        paymentStatus: "completed",
        status: "processing",
      })
    }

    console.log(`Payment succeeded: ${paymentIntent.id}`)
  } catch (error) {
    console.error("Handle payment succeeded error:", error)
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: "failed" },
      { new: true },
    )

    if (payment) {
      // Update order status
      await Order.findByIdAndUpdate(payment.order, {
        paymentStatus: "failed",
        status: "cancelled",
      })
    }

    console.log(`Payment failed: ${paymentIntent.id}`)
  } catch (error) {
    console.error("Handle payment failed error:", error)
  }
}

async function handleChargeDispute(charge) {
  console.log(`Charge dispute created: ${charge.id}`)
  // Handle dispute logic here
}

// GET - Get payments (Admin only)
router.get("/", [auth, adminAuth], async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate({
        path: "order",
        populate: {
          path: "user",
          select: "firstName lastName email",
        },
      })
      .sort({ createdAt: -1 })

    res.json(payments)
  } catch (error) {
    console.error("Get payments error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
