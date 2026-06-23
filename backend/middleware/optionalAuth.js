const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Adjust if needed

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (err) {
      // If token is invalid, ignore and proceed as unauthenticated
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

module.exports = optionalAuth;
