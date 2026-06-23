// 📁 models/Video.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Video description is required'],
    trim: true
  },
 
  hlsPath: {
  type: String,
  required: true,
}
,
  thumbnail: {
    type: String,
    default: "http://localhost:5000/uploads/thumbnails/Default_Thumbnail.jpg"
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },

  // 👍 Like/Dislike system
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },

  likedBy: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    select: false
  },
  dislikedBy: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    select: false
  },

  views: {
    type: Number,
    default: 0
  },
uploadedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Channel', // ✅ CHANGE THIS from 'User' to 'Channel'
  required: true
}
,

viewedBy: {
  type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  default: [],
  select: false
}

,

  tags: {
    type: [String],
    default: []
  }
  ,
visibility: {
  type: String,
  enum: ['public', 'private', 'unlisted', 'subscribers-only', 'scheduled'],
  default: 'public',
},
status: {
  type: String,
  default: 'processing',
},


});

module.exports = mongoose.model('Video', videoSchema);
