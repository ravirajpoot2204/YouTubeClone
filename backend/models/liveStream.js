// 📁 models/liveStream.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const liveStreamSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Stream title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Stream description is required'],
    trim: true
  },

  // 👤 The channel hosting the stream
  hostedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },

  // 🌐 Stream state
  isLive: {
    type: Boolean,
    default: true
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  endedAt: {
    type: Date,
    default: null
  },

  // 🎥 WebRTC/mediasoup specific (optional for future)
  streamKey: {
    type: String,
    unique: true,
    sparse: true
  },

  viewers: {
    type: Number,
    default: 0
  },

  tags: {
    type: [String],
    default: []
  },

  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LiveStream', liveStreamSchema);
