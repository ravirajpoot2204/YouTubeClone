/*const jwt = require('jsonwebtoken');
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
     const authHeader = req.headers.authorization; 
         const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
     console.log( "Info : auth header : " ,authHeader );
          console.log( "Info : token  : " ,token );
               console.log( "Info : decoded  : " ,authHeader );
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
*/
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token - uses HS256 by default
    let decoded;
    try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    // 3. Find user by id (payload uses 'id', not 'userId')
    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
      });
    }

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

module.exports = authMiddleware;