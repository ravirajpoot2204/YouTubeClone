const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  googleId: { type: String, required: true, unique: true },
  avatar: String,
googleAvatarUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },

  isChannelOwner: { type: Boolean, default: false },
  earnings: { type: Number, default: 0 },
securityPin: { type: String, default: null },  // hashed PIN
  // Subscriptions → list of followed channels
  subscribedChannels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
});
module.exports = mongoose.model('User', userSchema);
