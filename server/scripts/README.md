# Database Scripts

This directory contains scripts for database operations.

## Available Scripts

### Create Admin User

Creates an admin user in the database.

```bash
# Using npm script
npm run create-admin [email] [password] [firstName] [lastName]

# Or directly
node server/scripts/createAdmin.js [email] [password] [firstName] [lastName]
```

**Examples:**

```bash
# With default values (email: admin@example.com, password: admin123, name: Admin User)
npm run create-admin

# With custom values
npm run create-admin admin@yoursite.com strongpassword John Doe
```

### Seed Database

Seeds the database with initial data including an admin user, categories, and sample products.

```bash
npm run seed
```

## Notes

- The admin creation script checks if an admin with the provided email already exists and will not create duplicates.
- Passwords must be at least 6 characters long.
- The scripts automatically connect to MongoDB using the connection string from your .env or .env.local file. 