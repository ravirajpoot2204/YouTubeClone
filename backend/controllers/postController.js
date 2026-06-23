const Post = require('../models/post');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

exports.createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user.id;

    let imagePath = '';
    if (req.file) {
      imagePath = '/uploads/posts/' + req.file.filename;
    }

    const newPost = new Post({
      text,
      image: imagePath,
      createdBy: userId,
    });

    await newPost.save();
    return res.status(201).json({ success: true, message: 'Post created!', post: newPost });
  } catch (err) {
    console.error('❌ Error creating post:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
