const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // Which stream this chat belongs to
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true,
  },

  // Who sent the message
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // The message content
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },

  // Type of chat message
  type: {
    type: String,
    enum: ['regular', 'superchat', 'system', 'pinned'],
    default: 'regular',
  },

  // SuperChat specific fields
  superChatAmount: {
    type: Number,
    default: 0,
  },
  superChatColor: {
    type: String,
    default: '#FF0000', // Red for superchat
  },
  superChatDuration: {
    type: Number, // How long superchat stays pinned (seconds)
    default: 0,
  },
platformFee: { type: Number, default: 0 },
creatorEarning: { type: Number, default: 0 },
  // Moderation fields
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Ban tracking
  isBanned: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true, // createdAt and updatedAt
});

// Index for faster queries
chatMessageSchema.index({ streamId: 1, createdAt: -1 });
chatMessageSchema.index({ user: 1 });
chatMessageSchema.index({ type: 1 });

// Method to soft delete
chatMessageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedBy = userId;
  return this.save();
};

// Method to pin/unpin
chatMessageSchema.methods.togglePin = function(userId) {
  this.isPinned = !this.isPinned;
  this.pinnedBy = userId;
  return this.save();
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;