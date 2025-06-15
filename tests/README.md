# E-Market Tests

This directory contains tests for the E-Market application.

## Test Structure

- `unit/`: Contains unit tests for individual components
  - `auth.middleware.test.js`: Tests for authentication middleware
  - `adminAuth.middleware.test.js`: Tests for admin authentication middleware
  - `user.model.test.js`: Tests for User model
  - `product.model.test.js`: Tests for Product model
  - `basic.test.js`: Basic test examples
- `integration/`: Contains integration tests for API endpoints
  - `auth.routes.test.js`: Tests for authentication routes
  - `products.routes.test.js`: Tests for product routes
  - `cart.routes.test.js`: Tests for cart routes

## Running Tests

To run all tests:

```bash
npm test
```

To run only unit tests:

```bash
npm test -- tests/unit
```

To run only integration tests:

```bash
npm test -- tests/integration
```

To run a specific test file:

```bash
npm test -- tests/unit/auth.middleware.test.js
```

To run tests in watch mode (tests will rerun when files change):

```bash
npm run test:watch
```

## Test Environment

Tests use Jest as the test runner and assertion library. The tests are designed to run without an actual MongoDB connection by using mocks and stubs.

### Unit Tests

Unit tests focus on testing individual components in isolation. They use mocks to avoid dependencies on external systems like the database.

### Integration Tests

Integration tests focus on testing the interaction between different parts of the application. These tests are currently set up to use mocks rather than a real database connection for faster execution and to avoid external dependencies.

## Coverage

To generate a coverage report:

```bash
npm test -- --coverage
```

This will generate a coverage report in the `coverage/` directory. 