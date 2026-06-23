const Channel = require('../models/channel');
const User = require('../models/user');

// 🎯 Create a new channel
const path = require('path');
const fs = require('fs');


// 🎯 Create a new channel
exports.createChannel = async (req, res) => {
  try {
    const { name, username, description } = req.body;

    if (!name || !username || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if username is taken
    const existing = await Channel.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    // Check if user already owns a channel
    const existingChannel = await Channel.findOne({ owner: req.user._id });
    if (existingChannel) {
      return res.status(400).json({ success: false, message: 'You already created a channel' });
    }

    // Handle avatar upload
    let avatarPath = '/uploads/avatars/default-avatar.jpg'; // default

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars', fileName);

      // Save to disk
      fs.writeFileSync(uploadPath, req.file.buffer);

      // Set path for frontend
      avatarPath = `/uploads/avatars/${fileName}`;
    }

    // Create channel
    const newChannel = await Channel.create({
      name,
      username,
      description,
      avatar: avatarPath,
      owner: req.user._id,
    });

    // Optional: update user model with isChannelOwner flag
    await User.findByIdAndUpdate(req.user._id, { isChannelOwner: true });

    return res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      channel: newChannel,
    });

  } catch (err) {
    console.error('❌ Error creating channel:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while creating channel' });
  }
};


exports.getMyChannel = async (req, res) => {
  try {
    const channel = await Channel.findOne({ owner: req.user._id });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    return res.json({ success: true, channel });
  } catch (err) {
    console.error('❌ Error fetching my channel:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// 🔍 Get channel by ID
exports.getChannelById = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('owner', 'name avatar');
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    return res.json({ success: true, channel });
  } catch (err) {
    console.error('❌ Error getting channel by ID:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Check if a username is available
exports.checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const existing = await Channel.findOne({ username });
    const isAvailable = !existing;

    return res.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken',
    });
  } catch (err) {
    console.error('❌ Error checking username:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while checking username' });
  }
};

// 🔍 Get channel by username
exports.getChannelByUsername = async (req, res) => {
  try {
    const channel = await Channel.findOne({ username: req.params.username }).populate('owner', 'name avatar');
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    return res.json({ success: true, channel });
  } catch (err) {
    console.error('❌ Error getting channel by username:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🔧 Update channel info (name, desc, avatar, etc.)
exports.updateChannel = async (req, res) => {
  try {
    const { name, username, description, avatar, banner } = req.body;

    const channel = await Channel.findOne({ owner: req.user._id });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Optional: check if username is changing and unique
    if (username && username !== channel.username) {
      const taken = await Channel.findOne({ username });
      if (taken) {
        return res.status(409).json({ success: false, message: 'Username already in use' });
      }
    }

    channel.name = name || channel.name;
    channel.username = username || channel.username;
    channel.description = description || channel.description;
    channel.avatar = avatar || channel.avatar;
    channel.banner = banner || channel.banner;

    await channel.save();

    return res.json({ success: true, message: 'Channel updated', channel });
  } catch (err) {
    console.error('❌ Error updating channel:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
// ✅ Subscribe to a channel
exports.subscribeChannel = async (req, res) => {
  const userId = req.user.id;
  const channelId = req.params.id;

  const user = await User.findById(userId);
  const channel = await Channel.findById(channelId);

  if (!channel) {
    return res.status(404).json({ success: false, message: 'Channel not found' });
  }

  const alreadySubscribed = user.subscribedChannels.includes(channelId);
  if (alreadySubscribed) {
    return res.status(400).json({ success: false, message: 'Already subscribed' });
  }

  user.subscribedChannels.push(channelId);
  channel.subscriberCount += 1;

  await user.save();
  await channel.save();
  return res.json({
    success: true,
    message: 'Subscribed successfully',
    subscriberCount: channel.subscriberCount, // ✅ send updated count
  });

};

// ✅ Unsubscribe from a channel
exports.unsubscribeChannel = async (req, res) => {
  const userId = req.user.id;
  const channelId = req.params.id;

  const user = await User.findById(userId);
  const channel = await Channel.findById(channelId);

  if (!channel) {
    return res.status(404).json({ success: false, message: 'Channel not found' });
  }

  const index = user.subscribedChannels.indexOf(channelId);
  if (index === -1) {
    return res.status(400).json({ success: false, message: 'Not subscribed' });
  }

  user.subscribedChannels.splice(index, 1);
  channel.subscriberCount = Math.max(0, channel.subscriberCount - 1);

  await user.save();
  await channel.save();

  return res.json({
    success: true,
    message: 'Unsubscribed successfully',
    subscriberCount: channel.subscriberCount,
  });

};


exports.getUserSubscriptions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'subscribedChannels',
      select: 'name username avatar',
    });

    return res.json({
      success: true,
      subscriptions: user.subscribedChannels,
    });
  } catch (err) {
    console.error('❌ Error getting subscriptions:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching subscriptions' });
  }
};
// 🗑️ Delete a channel by ID
exports.deleteChannel = async (req, res) => {
  try {
    const channelId = req.params.id;

    // Find channel
    const channel = await Channel.findOne({ _id: channelId, owner: req.user._id });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
    }

    // Optional: Delete avatar file if it's a custom one
    if (
      channel.avatar &&
      !channel.avatar.includes('default-avatar.jpg') &&
      fs.existsSync(path.join(__dirname, '..', channel.avatar))
    ) {
      fs.unlinkSync(path.join(__dirname, '..', channel.avatar));
    }

    // Delete channel
    await Channel.findByIdAndDelete(channelId);

    // Update user
    await User.findByIdAndUpdate(req.user._id, { isChannelOwner: false });

    return res.json({ success: true, message: 'Channel deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting channel:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting channel' });
  }
};
exports.updateVideoVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { visibility } = req.body;

    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({ success: false, message: 'Invalid visibility type' });
    }

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    if (video.uploadedBy.toString() !== req.user.channel._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    video.visibility = visibility;
    await video.save();

    res.json({ success: true, message: 'Visibility updated', data: video });
  } catch (err) {
    next(err);
  }
};
