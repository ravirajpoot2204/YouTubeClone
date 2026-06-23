const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Channel = require('../models/channel'); // ✅ Required to find the channel

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('_id name email avatar googleId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // ✅ Attach the user and userId to request
    req.user = user;
    req.userId = user._id;

    // ✅ Attach channel if user has one
    const channel = await Channel.findOne({ owner: user._id });
    if (channel) {
      req.user.channel = channel;
    }

    next();

  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
