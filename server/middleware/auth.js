const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      console.log("Auth failed: No token provided");
      return res.status(401).json({ message: "No token, authorization denied" })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log("Token decoded successfully for user:", decoded.userId);
      
      const user = await User.findById(decoded.userId)
      if (!user || !user.isActive) {
        console.log("Auth failed: User not found or inactive", { userId: decoded.userId, found: !!user, active: user?.isActive });
        return res.status(401).json({ message: "Token is not valid" })
      }

      req.userId = decoded.userId
      req.user = user
      next()
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ message: "Token is not valid" })
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(401).json({ message: "Token is not valid" })
  }
}

module.exports = auth
