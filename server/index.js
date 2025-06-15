const path = require("path")
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")

// Load environment variables from .env.local first (if exists), then .env
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") })
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })

// Check for essential environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI"]
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error(`Warning: Missing environment variables: ${missingVars.join(", ")}`)
  console.error("Using default values for development. DO NOT use in production!")
  
  // Set default values only if they're missing
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "default_jwt_secret_for_development"
  if (!process.env.MONGODB_URI) process.env.MONGODB_URI = "mongodb://localhost:27017/emarket"
}

console.log("Environment variables loaded")
console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Found' : 'Not found'}`)
console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Found' : 'Not found'}`)

const app = express()
app.set('trust proxy', 1)

// Database connection with better error handling
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err)
})

mongoose.connection.once('open', () => {
  console.log('Successfully connected to MongoDB')
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      // Mongoose 7+ doesn't need these options anymore, they're the default
    })
    console.log('MongoDB connected successfully')
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    console.log('Retrying connection in 5 seconds...')
    setTimeout(connectWithRetry, 5000)
  }
}

// Initial connection
connectWithRetry()

// Import routes
const authRoutes = require("./routes/auth")
const productRoutes = require("./routes/products")
const categoryRoutes = require("./routes/categories")
const cartRoutes = require("./routes/cart")
const orderRoutes = require("./routes/orders")
const reviewRoutes = require("./routes/reviews")
const paymentRoutes = require("./routes/payments")
const userRoutes = require("./routes/users")
const adminRoutes = require("./routes/admin")
const wishlistRoutes = require("./routes/wishlist")

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "source.unsplash.com", "images.unsplash.com"],
      },
    },
  })
)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use(express.static(path.join(__dirname, "public")))

// Routes
app.use("/auth", authRoutes)
app.use("/products", productRoutes)
app.use("/categories", categoryRoutes)
app.use("/cart", cartRoutes)
app.use("/orders", orderRoutes)
app.use("/reviews", reviewRoutes)
app.use("/payments", paymentRoutes)
app.use("/users", userRoutes)
app.use("/api/admin", adminRoutes)
app.use("/wishlist", wishlistRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "E-Market API is running" })
})

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")))

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "build", "index.html"))
  })
}

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  })
})

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})
