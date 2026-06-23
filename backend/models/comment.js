const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },

  // ✅ Clean and scalable user reference
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  content: { type: String, required: true },

  edited: { type: Boolean, default: false }, // Tracks if comment was edited
}, { timestamps: true }); // Adds createdAt and updatedAt

module.exports = mongoose.model('Comment', commentSchema);
