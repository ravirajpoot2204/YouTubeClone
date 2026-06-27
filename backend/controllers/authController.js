const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const { downloadAvatar } = require('../utils/downloadAvatar');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const Channel = require('../models/channel');




// 📌 LOGIN CONTROLLER
// 📌 LOGIN CONTROLLER
exports.authController = async (req, res) => {
  try {
    const { token } = req.body;
    console.log('📥 Received token from frontend:', token);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { name, email, sub: googleId, picture: avatarUrl } = payload;
    console.log('✅ Verified Google user:', payload);

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: `/uploads/avatars/${googleId}.jpg`,
      });
      console.log('🆕 New user created:', user);

      try {
        await downloadAvatar(avatarUrl, `${googleId}.jpg`);
        console.log('📸 Avatar downloaded');
      } catch (err) {
        console.error('❌ Avatar download failed (new user):', err.message);
        user.avatar = '/default_avatar.png';
        await user.save();
      }
    } else {
      console.log('👤 Existing user found');
      const avatarPath = path.join(__dirname, '..', 'uploads', 'avatars', `${user.googleId}.jpg`);

      if (!fs.existsSync(avatarPath)) {
        console.log('⚠️ Avatar missing. Re-downloading...');
        try {
          await downloadAvatar(avatarUrl, `${user.googleId}.jpg`);
          user.avatar = `/uploads/avatars/${user.googleId}.jpg`;
          await user.save();
          console.log('📸 Avatar re-downloaded');
        } catch (err) {
          console.error('❌ Avatar re-download failed:', err.message);
          user.avatar = '/default_avatar.png';
          await user.save();
        }
      }
    }

    const tokenPayload = { id: user._id };
    const myToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Inside your login handler (after finding/creating user)


    // ✅ Channel lookup AFTER user exists
    const channel = await Channel.findOne({ owner: user._id });

    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      googleId: user.googleId,
      channelId: channel?._id || null, // ✅ this line is needed!
      channel: channel
        ? {
          id: channel._id,
          name: channel.name,
          username: channel.username,
          avatar: channel.avatar,
        }
        : null,
    };
    console.log('✅ JWT created:', myToken);

    return res.json({
      success: true,
      message: 'Login successful',
      user: userInfo,
      token: myToken,
    });

  } catch (err) {
    console.error('❌ Google login error:', err.message);
    const isTokenError = err.message?.includes('invalid') || err.message?.includes('wrong number of segments');
    return res.status(isTokenError ? 401 : 500).json({
      success: false,
      message: isTokenError ? 'Login failed: Invalid token' : 'Login failed: Server error',
    });
  }
};
// 🚪 LOGOUT CONTROLLER
exports.logoutController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user && user.avatar && !user.avatar.includes('default-avatar')) {
      const avatarFilename = path.basename(user.avatar);
      const avatarPath = path.resolve(__dirname, '..', 'uploads', 'avatars', avatarFilename);

      console.log('🛠️ Deleting avatar from:', avatarPath);

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
        console.log('🗑️ Avatar deleted:', avatarPath);
      }

      // Reset to default avatar
      user.avatar = '/uploads/default-avatar.jpg';
      await user.save();
    }

    return res.json({ success: true, message: 'Logged out and avatar deleted' });
  } catch (err) {
    console.error('❌ Logout error:', err.message);
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};
