const Video = require('../models/video');
const CustomError = require('../utils/customError');

// ✅ POST /api/videos/:id/like
exports.likeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select('+likedBy +dislikedBy');
    const userId = req.user.id;

    if (!video) throw new CustomError("Video not found", 404);

    const alreadyLiked = video.likedBy.includes(userId);
    const alreadyDisliked = video.dislikedBy.includes(userId);

    if (alreadyLiked) {
      video.likedBy.pull(userId);
      video.likes = Math.max(0, video.likes - 1);
    } else {
      video.likedBy.push(userId);
      video.likes += 1;

      if (alreadyDisliked) {
        video.dislikedBy.pull(userId);
        video.dislikes = Math.max(0, video.dislikes - 1);
      }
    }

    await video.save();
    console.log('req.user:', req.user);

    res.status(200).json({
  success: true,
  message: 'Like status updated',
  likes: video.likes,
  dislikes: video.dislikes,
  liked: video.likedBy.includes(userId),      // 👈 add this
  disliked: video.dislikedBy.includes(userId) // 👈 add this
});

  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/videos/:id/dislike
exports.dislikeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select('+likedBy +dislikedBy');
    const userId = req.user.id;

    if (!video) throw new CustomError("Video not found", 404);

    const alreadyLiked = video.likedBy.includes(userId);
    const alreadyDisliked = video.dislikedBy.includes(userId);

    if (alreadyDisliked) {
      video.dislikedBy.pull(userId);
      video.dislikes = Math.max(0, video.dislikes - 1);
    } else {
      video.dislikedBy.push(userId);
      video.dislikes += 1;

      if (alreadyLiked) {
        video.likedBy.pull(userId);
        video.likes = Math.max(0, video.likes - 1);
      }
    }

    await video.save();

res.status(200).json({
  success: true,
  message: 'Like status updated',
  likes: video.likes,
  dislikes: video.dislikes,
  liked: video.likedBy.includes(userId),
  disliked: video.dislikedBy.includes(userId)
});

  } catch (err) {
    next(err);
  }
};
