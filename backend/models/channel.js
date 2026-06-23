const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const channelSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  avatar: { type: String, default: '/uploads/avatars/default-avatar.jpg' },
  banner: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },

  // ✅ NEW: Track total subscriber count
  subscriberCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Channel', channelSchema);
