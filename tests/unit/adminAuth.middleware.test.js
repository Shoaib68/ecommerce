const adminAuth = require('../../server/middleware/adminAuth');

describe('Admin Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() when user is admin', () => {
    // Mock admin user in request
    req.user = { role: 'admin' };

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user is not admin', () => {
    // Mock regular user in request
    req.user = { role: 'customer' };

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. Admin privileges required.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user object is missing', () => {
    // No user object in request
    req.user = undefined;

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. Admin privileges required.' });
    expect(next).not.toHaveBeenCalled();
  });
}); 