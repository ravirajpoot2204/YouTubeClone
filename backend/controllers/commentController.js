const Comment = require('../models/comment');

// ✅ POST /api/comments/:videoId — Add a new comment
exports.postComment = async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const user = req.user;

  try {
    let comment = await Comment.create({
      videoId,
      content,
      user: user._id,   // 🔧 store only the ObjectId
    });

    // Populate user data for the immediate response
    comment = await comment.populate('user', 'name avatar');

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('❌ Failed to post comment:', error.message);
    res.status(500).json({ success: false, message: 'Failed to post comment' });
  }
};
// ✅ GET /api/comments/:videoId — Fetch comments for a video
exports.getCommentsByVideoId = async (req, res) => {
  const { videoId } = req.params;

  try {
    const comments = await Comment.find({ videoId })
      .populate('user', 'name avatar') // ✅ Load user info for each comment
      .sort({ createdAt: -1 });

    res.json({ success: true, comments });
  } catch (error) {
    console.error('❌ Failed to get comments:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get comments' });
  }
};

// ✅ DELETE /api/comments/:commentId — Delete own comment
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // ✅ Check ownership
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('❌ Failed to delete comment:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};

// ✅ PUT /api/comments/:commentId — Edit own comment
exports.updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // ✅ Only comment owner can edit
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this comment' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Content cannot be empty' });
    }

    comment.content = content;
    comment.edited = true;
    await comment.save();

    const updatedComment = await comment.populate('user', 'name avatar'); // Return full comment with user

    res.json({ success: true, message: 'Comment updated', comment: updatedComment });
  } catch (error) {
    console.error('❌ Failed to update comment:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update comment' });
  }
};
