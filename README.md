# E-Market MERN Stack Platform

A complete e-commerce platform built with MongoDB, Express.js, React, and Node.js, featuring comprehensive CRUD operations, payment processing, and admin management.

## 🚀 Features

### Core E-Commerce Features
- **Product Management**: Full CRUD operations with categories, images, and inventory
- **Category Management**: Hierarchical product organization
- **User Authentication**: JWT-based auth with registration and login
- **Shopping Cart**: Persistent cart with real-time updates
- **Order Management**: Complete order lifecycle tracking
- **Review & Rating System**: Customer feedback and ratings
- **Search & Filtering**: Advanced product search and filtering

### Payment Integration
- **Stripe Integration**: Secure payment processing
- **Multiple Payment Methods**: Cards and digital wallets
- **Order Tracking**: Real-time order status updates
- **Refund Management**: Admin refund capabilities

### Admin Dashboard
- **Product Management**: Add, edit, delete products
- **Order Management**: Track and update order statuses
- **User Management**: View and manage customer accounts
- **Analytics**: Sales and performance metrics

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Bcrypt** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB
- Stripe account for payments

### 1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd e-market-mern
\`\`\`

### 2. Install dependencies
\`\`\`bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install
cd ..
\`\`\`

### 3. Environment Configuration

Create a \`.env\` file in the root directory:

\`\`\`env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/emarket

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Client URL
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development
\`\`\`

Create a \`.env\` file in the \`client\` directory:

\`\`\`env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
\`\`\`

### 4. Database Setup

The application will automatically connect to MongoDB. Make sure your MongoDB Atlas cluster is running or start your local MongoDB instance.

### 5. Seed the database (optional)
\`\`\`bash
npm run seed
\`\`\`

### 6. Start the application

\`\`\`bash
# Development mode (runs both server and client)
npm run dev

# Or run separately
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
\`\`\`

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

\`\`\`
e-market-mern/
├── server/                 # Backend Express.js application
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── scripts/           # Database seeding scripts
│   └── index.js          # Server entry point
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── api/           # API services
│   │   └── utils/         # Utility functions
│   └── public/           # Static assets
├── package.json          # Root package.json
└── README.md
\`\`\`

## 🧪 Testing

### Test User Accounts
After running the seed script, you can use these test accounts:

**Admin Account:**
- Email: admin@example.com
- Password: admin123

**Customer Account:**
- Email: john@example.com
- Password: customer123

### Test Cards (Stripe)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## 🚀 Deployment

### Backend Deployment (Heroku/Railway)
1. Set environment variables in your hosting platform
2. Deploy the server directory
3. Ensure MongoDB connection is configured

### Frontend Deployment (Vercel/Netlify)
1. Build the React app: \`npm run build\`
2. Deploy the client/build directory
3. Set environment variables for production

## 📚 API Documentation

### Authentication Endpoints
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/login\` - User login
- \`GET /api/auth/me\` - Get current user
- \`PUT /api/auth/profile\` - Update user profile

### Product Endpoints
- \`GET /api/products\` - Get all products (with filtering)
- \`GET /api/products/:id\` - Get single product
- \`POST /api/products\` - Create product (Admin)
- \`PUT /api/products/:id\` - Update product (Admin)
- \`DELETE /api/products/:id\` - Delete product (Admin)

### Category Endpoints
- \`GET /api/categories\` - Get all categories
- \`GET /api/categories/:id\` - Get single category
- \`POST /api/categories\` - Create category (Admin)
- \`PUT /api/categories/:id\` - Update category (Admin)
- \`DELETE /api/categories/:id\` - Delete category (Admin)

### Cart Endpoints
- \`GET /api/cart\` - Get user's cart
- \`POST /api/cart/add\` - Add item to cart
- \`PUT /api/cart/update\` - Update cart item
- \`DELETE /api/cart/remove/:productId\` - Remove item from cart
- \`DELETE /api/cart/clear\` - Clear entire cart

### Order Endpoints
- \`GET /api/orders\` - Get user's orders
- \`GET /api/orders/:id\` - Get single order
- \`POST /api/orders\` - Create new order
- \`PUT /api/orders/:id/status\` - Update order status (Admin)
- \`DELETE /api/orders/:id\` - Cancel order

### Review Endpoints
- \`GET /api/reviews/product/:productId\` - Get product reviews
- \`GET /api/reviews/my-reviews\` - Get user's reviews
- \`POST /api/reviews\` - Create review
- \`PUT /api/reviews/:id\` - Update review
- \`DELETE /api/reviews/:id\` - Delete review

### Payment Endpoints
- \`POST /api/payments/create-intent\` - Create payment intent
- \`POST /api/payments/confirm\` - Confirm payment
- \`POST /api/payments/refund\` - Process refund (Admin)
- \`POST /api/payments/webhook\` - Stripe webhook

## 🔧 Configuration

### MongoDB Setup
1. Create a MongoDB Atlas account at https://mongodb.com
2. Create a new cluster
3. Get your connection string
4. Replace the MONGO_URI in your .env file

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add them to your .env files
4. Set up webhooks for real-time payment updates

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)

## 📞 Support

For support, email support@emarket.com or join our Slack channel.

## Docker Deployment Instructions

### Prerequisites
- Docker and Docker Compose installed on your system
- Git (to clone the repository)

### Steps to Deploy with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce
   ```

2. **Build and start the Docker containers**
   ```bash
   docker-compose up -d --build
   ```
   This command will:
   - Build the Docker images for the client and server
   - Start the MongoDB, server, and client containers
   - Set up the network between the containers

3. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:5001
   - MongoDB: localhost:27017 (accessible from your host machine)

4. **Stop the containers**
   ```bash
   docker-compose down
   ```

5. **View logs**
   ```bash
   # View all logs
   docker-compose logs
   
   # View logs for a specific service
   docker-compose logs client
   docker-compose logs server
   docker-compose logs mongodb
   
   # Follow logs in real-time
   docker-compose logs -f
   ```

### Environment Variables

The Docker setup uses dedicated environment files:
- `.env.docker` for the server
- `client/.env.docker` for the client

You can modify these files to change configuration settings.

### Data Persistence

MongoDB data is persisted using a Docker volume named `mongodb_data`. This ensures your data remains intact even if you restart or remove the containers.

### Rebuilding the Application

If you make changes to the code, rebuild the containers:
```bash
docker-compose up -d --build
```

### Troubleshooting

1. **If the client can't connect to the server:**
   - Check that the REACT_APP_API_URL in client/.env.docker is set correctly
   - Ensure the nginx configuration is properly routing API requests

2. **If the server can't connect to MongoDB:**
   - Check the MONGODB_URI in .env.docker
   - Ensure the MongoDB container is running: `docker ps`

3. **To reset the database:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
   Note: This will remove all data in the database.

## Development Setup (Without Docker)

[Original README content here...]
