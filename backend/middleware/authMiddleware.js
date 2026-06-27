const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Channel = require('../models/channel');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token (HS256 is default, no need to restrict)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
      });
    }

    // Attach user and channel
    req.user = user;
    req.userId = user._id;

    const channel = await Channel.findOne({ owner: user._id });
    if (channel) {
      req.user.channel = channel;
    }

    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

module.exports = authMiddleware;