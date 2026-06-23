const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  image: { type: String, default: '' }, // path to image if uploaded
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
