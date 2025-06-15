const adminAuth = (req, res, next) => {
  console.log("Admin auth middleware check:");
  console.log("User:", req.user ? {
    id: req.user._id,
    email: req.user.email,
    role: req.user.role
  } : "No user found");
  
  if (req.user && req.user.role === "admin") {
    console.log("Admin access granted");
    next();
  } else {
    console.log("Admin access denied");
    res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
};

module.exports = adminAuth;
