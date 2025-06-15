const jwt = require('jsonwebtoken');
const auth = require('../../server/middleware/auth');
const User = require('../../server/models/User');

// Mock jwt module
jest.mock('jsonwebtoken');

// Mock the User model findById method
User.findById = jest.fn();

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mocks
    jwt.verify.mockReset();
  });

  it('should call next() when valid token is provided', async () => {
    // Mock a valid token
    const userId = 'valid-user-id';
    req.header.mockReturnValue('Bearer valid-token');
    
    // Mock jwt verify to return valid decoded token
    jwt.verify.mockReturnValue({ userId });
    
    // Mock user found in database
    const mockUser = { _id: userId, isActive: true };
    User.findById.mockResolvedValue(mockUser);

    await auth(req, res, next);

    expect(req.userId).toBe(userId);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no token is provided', async () => {
    // Mock no token
    req.header.mockReturnValue(undefined);

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    // Mock invalid token
    req.header.mockReturnValue('Bearer invalid-token');
    
    // Mock jwt verify to throw an error
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not found', async () => {
    // Mock valid token but user not found
    const userId = 'non-existent-user';
    req.header.mockReturnValue('Bearer valid-token');
    
    // Mock jwt verify to return valid decoded token
    jwt.verify.mockReturnValue({ userId });
    
    // Mock user not found
    User.findById.mockResolvedValue(null);

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is inactive', async () => {
    // Mock valid token but inactive user
    const userId = 'inactive-user';
    req.header.mockReturnValue('Bearer valid-token');
    
    // Mock jwt verify to return valid decoded token
    jwt.verify.mockReturnValue({ userId });
    
    // Mock inactive user
    const mockUser = { _id: userId, isActive: false };
    User.findById.mockResolvedValue(mockUser);

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
    expect(next).not.toHaveBeenCalled();
  });
}); 